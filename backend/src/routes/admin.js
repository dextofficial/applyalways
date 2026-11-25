const router = require('express').Router();
const axios = require('axios');
const { User, Plan, Payment, Application, Job, Promo, Blacklist, Notification, Settings } = require('../models');
const { auth, adminOnly } = require('../middleware');
const { startOfDayLagos, getSettings, notify, publicUser } = require('../utils');
const { extractEmail } = require('../services/jobs');
const { runAll } = require('../services/runner');
const { activate } = require('./payments');

router.use(auth, adminOnly);

const paginate = (req, def = 30) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  return { page, limit: def, skip: (page - 1) * def };
};

// ---------- OVERVIEW ----------
router.get('/stats', async (req, res) => {
  const sod = startOfDayLagos();
  const week = new Date(sod.getTime() - 6 * 864e5);
  const month = new Date(sod.getTime() - 29 * 864e5);
  const sum = async (since) => {
    const m = { status: 'success' };
    if (since) m.paidAt = { $gte: since };
    const r = await Payment.aggregate([{ $match: m }, { $group: { _id: null, t: { $sum: '$amount' } } }]);
    return r[0]?.t || 0;
  };
  const [users, activeSubs, appsToday, appsTotal, failedToday, revToday, revWeek, revMonth, revTotal, byDay] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    User.countDocuments({ role: 'user', 'subscription.expiresAt': { $gt: new Date() } }),
    Application.countDocuments({ status: 'sent', createdAt: { $gte: sod } }),
    Application.countDocuments({ status: 'sent' }),
    Application.countDocuments({ status: 'failed', createdAt: { $gte: sod } }),
    sum(sod), sum(week), sum(month), sum(),
    Payment.aggregate([
      { $match: { status: 'success', paidAt: { $gte: month } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt', timezone: 'Africa/Lagos' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);
  res.json({ users, activeSubs, appsToday, appsTotal, failedToday, revenue: { today: revToday, week: revWeek, month: revMonth, total: revTotal }, byDay });
});

// ---------- USERS ----------
router.get('/users', async (req, res) => {
  const { page, limit, skip } = paginate(req);
  const q = { role: 'user' };
  if (req.query.q) {
    const rx = new RegExp(req.query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    q.$or = [{ name: rx }, { email: rx }];
  }
  const [items, total] = await Promise.all([
    User.find(q).select('-passwordHash -gmail.refreshTokenEnc -cv.text').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(q),
  ]);
  const ids = items.map((u) => u._id);
  const counts = await Application.aggregate([{ $match: { user: { $in: ids }, status: 'sent' } }, { $group: { _id: '$user', n: { $sum: 1 } } }]);
  const map = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
  items.forEach((u) => (u.applicationsSent = map[String(u._id)] || 0));
  res.json({ items, total, pages: Math.ceil(total / limit), page });
});

router.patch('/users/:id', async (req, res) => {
  const u = await User.findOne({ _id: req.params.id, role: 'user' });
  if (!u) return res.status(404).json({ error: 'User not found' });
  if (typeof req.body.suspended === 'boolean') u.suspended = req.body.suspended;
  if (req.body.grantDays) {
    const plan = req.body.planId ? await Plan.findById(req.body.planId) : null;
    const now = new Date();
    const start = u.subscription?.expiresAt && u.subscription.expiresAt > now ? u.subscription.expiresAt : now;
    u.subscription = {
      planId: plan?._id || u.subscription?.planId, planName: plan?.name || u.subscription?.planName || 'Gift',
      applicationsPerDay: plan?.applicationsPerDay || u.subscription?.applicationsPerDay || 10,
      expiresAt: new Date(start.getTime() + Number(req.body.grantDays) * 864e5), expiryNotified: false,
    };
    await notify(u._id, 'Free access added', `You received ${req.body.grantDays} free day(s).`);
  }
  await u.save();
  res.json({ user: publicUser(u) });
});

// ---------- APPLICATIONS & PAYMENTS ----------
router.get('/applications', async (req, res) => {
  const { page, limit, skip } = paginate(req);
  const q = {};
  if (['sent', 'failed', 'manual'].includes(req.query.status)) q.status = req.query.status;
  if (req.query.user) q.user = req.query.user;
  const [items, total] = await Promise.all([
    Application.find(q).populate('user', 'name email').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Application.countDocuments(q),
  ]);
  res.json({ items, total, pages: Math.ceil(total / limit), page });
});

router.get('/payments', async (req, res) => {
  const { page, limit, skip } = paginate(req);
  const [items, total] = await Promise.all([
    Payment.find().populate('user', 'name email').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Payment.countDocuments(),
  ]);
  res.json({ items, total, pages: Math.ceil(total / limit), page });
});

// Refund through Paystack. Does not shorten the user's subscription - use "Grant days" with a negative number if needed.
router.post('/payments/:id/refund', async (req, res) => {
  try {
    const p = await Payment.findById(req.params.id);
    if (!p || p.status !== 'success') return res.status(400).json({ error: 'Only successful payments can be refunded' });
    await axios.post('https://api.paystack.co/refund', { transaction: p.reference }, { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } });
    p.status = 'refunded';
    await p.save();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.response?.data?.message || e.message });
  }
});

// ---------- PLANS ----------
router.get('/plans', async (req, res) => res.json({ plans: await Plan.find().sort({ sortOrder: 1, price: 1 }) }));
router.post('/plans', async (req, res) => {
  const s = await getSettings();
  if (Number(req.body.applicationsPerDay) > s.maxApplicationsPerDay)
    return res.status(400).json({ error: `Applications per day cannot exceed the ceiling (${s.maxApplicationsPerDay}). Raise it in Settings first.` });
  res.json({ plan: await Plan.create(req.body) });
});
router.put('/plans/:id', async (req, res) => {
  const s = await getSettings();
  if (Number(req.body.applicationsPerDay) > s.maxApplicationsPerDay)
    return res.status(400).json({ error: `Applications per day cannot exceed the ceiling (${s.maxApplicationsPerDay}).` });
  res.json({ plan: await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true }) });
});
router.delete('/plans/:id', async (req, res) => {
  await Plan.findByIdAndUpdate(req.params.id, { active: false }); // soft delete keeps payment history intact
  res.json({ ok: true });
});

// ---------- SETTINGS ----------
router.get('/settings', async (req, res) => res.json({ settings: await getSettings() }));
router.put('/settings', async (req, res) => {
  const allowed = ['maxApplicationsPerDay', 'matchThreshold', 'runsPerDay', 'maxManualPerDay', 'letterStyle', 'sources'];
  const update = {};
  allowed.forEach((k) => req.body[k] !== undefined && (update[k] = req.body[k]));
  res.json({ settings: await Settings.findOneAndUpdate({ key: 'main' }, update, { new: true, upsert: true }) });
});

// ---------- PROMOS ----------
router.get('/promos', async (req, res) => res.json({ promos: await Promo.find().sort({ createdAt: -1 }) }));
router.post('/promos', async (req, res) => {
  try { res.json({ promo: await Promo.create(req.body) }); } catch (e) { res.status(400).json({ error: e.message }); }
});
router.patch('/promos/:id', async (req, res) => res.json({ promo: await Promo.findByIdAndUpdate(req.params.id, req.body, { new: true }) }));
router.delete('/promos/:id', async (req, res) => { await Promo.findByIdAndDelete(req.params.id); res.json({ ok: true }); });

// ---------- BLACKLIST ----------
router.get('/blacklist', async (req, res) => res.json({ items: await Blacklist.find().sort({ company: 1 }) }));
router.post('/blacklist', async (req, res) => {
  try { res.json({ item: await Blacklist.create({ company: req.body.company }) }); } catch (e) { res.status(400).json({ error: 'Already listed or invalid' }); }
});
router.delete('/blacklist/:id', async (req, res) => { await Blacklist.findByIdAndDelete(req.params.id); res.json({ ok: true }); });

// ---------- MANUAL JOBS (jobs with a real apply email, added by the owner) ----------
router.post('/jobs', async (req, res) => {
  const b = req.body;
  const email = b.applyEmail || extractEmail(b.description);
  if (!b.title || !email) return res.status(400).json({ error: 'Title and an apply email are required' });
  const job = await Job.create({
    source: 'admin', externalId: 'adm_' + Date.now(), title: b.title, company: b.company, location: b.location,
    isRemote: !!b.isRemote, description: b.description || b.title, applyEmail: email, applyUrl: b.applyUrl, postedAt: new Date(),
  });
  res.json({ job });
});
router.get('/jobs', async (req, res) => {
  const { limit, skip } = paginate(req);
  const q = req.query.source ? { source: req.query.source } : {};
  const [items, withEmail, total] = await Promise.all([
    Job.find(q).select('-description').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Job.countDocuments({ applyEmail: { $exists: true, $ne: null } }),
    Job.countDocuments(),
  ]);
  res.json({ items, withEmail, total });
});

// ---------- ANNOUNCEMENTS ----------
router.post('/announce', async (req, res) => {
  const { title, message } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'Title and message required' });
  const users = await User.find({ role: 'user' }).select('_id');
  await Notification.insertMany(users.map((u) => ({ user: u._id, title, message })));
  res.json({ sent: users.length });
});

// ---------- RUN NOW ----------
router.post('/run', (req, res) => {
  runAll().catch((e) => console.error('manual run failed', e));
  res.json({ started: true });
});

module.exports = router;
