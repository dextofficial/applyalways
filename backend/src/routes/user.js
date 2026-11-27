const router = require('express').Router();
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { User, Application, Notification } = require('../models');
const { auth, sign } = require('../middleware');
const { publicUser, getSettings, startOfDayLagos } = require('../utils');
const { uploadCv, deleteCv } = require('../services/storage');
const { deleteUserData } = require('../services/account');

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { error: 'Too many attempts. Try again later.' } });

// ---------- AUTH ----------
router.post('/auth/register', limiter, async (req, res) => {
  try {
    const { name, email, password, nationality, country, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ error: 'Email already registered' });
    const user = await User.create({
      name, email, nationality, country: country || nationality, phone,
      passwordHash: await bcrypt.hash(password, 10), role: 'user',
    });
    res.json({ token: sign(user), user: publicUser(user) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/auth/login', limiter, async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: (email || '').toLowerCase() });
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash)))
    return res.status(401).json({ error: 'Wrong email or password' });
  if (user.suspended) return res.status(403).json({ error: 'Your account is suspended. Contact support.' });
  res.json({ token: sign(user), user: publicUser(user) });
});

router.get('/me', auth, async (req, res) => {
  const sod = startOfDayLagos();
  const settings = await getSettings();
  const [sentToday, totalSent, manualCount, unread] = await Promise.all([
    Application.countDocuments({ user: req.user._id, status: 'sent', createdAt: { $gte: sod } }),
    Application.countDocuments({ user: req.user._id, status: 'sent' }),
    Application.countDocuments({ user: req.user._id, status: 'manual' }),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  const sub = req.user.subscription || {};
  res.json({
    user: publicUser(req.user),
    stats: {
      sentToday, totalSent, manualCount, unread,
      dailyLimit: Math.min(sub.applicationsPerDay || 0, settings.maxApplicationsPerDay),
      active: !!(sub.expiresAt && sub.expiresAt > new Date()),
    },
  });
});

// ---------- PROFILE ----------
router.put('/profile', auth, async (req, res) => {
  const b = req.body;
  const list = (v) => (Array.isArray(v) ? v : String(v || '').split(',')).map((s) => s.trim()).filter(Boolean);
  const u = req.user;
  if (b.name) u.name = b.name;
  if (b.nationality !== undefined) u.nationality = b.nationality;
  if (b.country !== undefined) u.country = b.country;
  if (b.phone !== undefined) u.phone = b.phone;
  u.profile = {
    desiredTitles: list(b.desiredTitles),
    skills: list(b.skills),
    experienceYears: b.experienceYears === '' || b.experienceYears == null ? undefined : Number(b.experienceYears),
    workModes: list(b.workModes).filter((m) => ['remote', 'hybrid', 'onsite'].includes(m)),
    locations: list(b.locations),
    salaryMin: b.salaryMin === '' || b.salaryMin == null ? undefined : Number(b.salaryMin),
    salaryCurrency: (b.salaryCurrency || 'NGN').toUpperCase().slice(0, 5),
    salaryPeriod: b.salaryPeriod === 'year' ? 'year' : 'month',
    summary: b.summary,
  };
  await u.save();
  res.json({ user: publicUser(u) });
});

router.post('/profile/automation', auth, async (req, res) => {
  req.user.automationEnabled = !!req.body.enabled;
  await req.user.save();
  res.json({ ok: true, automationEnabled: req.user.automationEnabled });
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
router.post('/profile/cv', auth, upload.single('cv'), async (req, res) => {
  try {
    const f = req.file;
    if (!f) return res.status(400).json({ error: 'Attach a CV file' });
    const isPdf = f.mimetype === 'application/pdf' || f.originalname.toLowerCase().endsWith('.pdf');
    const isDocx = f.originalname.toLowerCase().endsWith('.docx');
    if (!isPdf && !isDocx) return res.status(400).json({ error: 'CV must be a PDF or DOCX file' });

    let text = '';
    if (isPdf) text = (await require('pdf-parse/lib/pdf-parse.js')(f.buffer)).text;
    else text = (await require('mammoth').extractRawText({ buffer: f.buffer })).value;
    text = text.replace(/\s+\n/g, '\n').trim();
    if (text.length < 100) return res.status(400).json({ error: 'Could not read text from this CV. Use a text-based PDF or DOCX (not a scan).' });

    const old = req.user.cv;
    const result = await uploadCv(f.buffer, req.user._id, isPdf ? '.pdf' : '.docx');
    if (old?.publicId) deleteCv(old).catch(() => {});
    req.user.cv = { url: result.secure_url, publicId: result.public_id, filename: f.originalname, mime: f.mimetype, text, authenticated: true };
    await req.user.save();
    res.json({ user: publicUser(req.user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'CV upload failed: ' + e.message });
  }
});

// Self-service account deletion (asks for the password again)
router.delete('/me', auth, async (req, res) => {
  try {
    if (req.user.role !== 'user') return res.status(403).json({ error: 'Admin accounts cannot be deleted here' });
    if (!(await bcrypt.compare(req.body?.password || '', req.user.passwordHash)))
      return res.status(400).json({ error: 'Wrong password' });
    await deleteUserData(req.user);
    res.json({ ok: true });
  } catch (e) {
    console.error('delete account failed', e.message);
    res.status(500).json({ error: 'Could not delete the account. Please contact support.' });
  }
});

module.exports = router;
