const router = require('express').Router();
const crypto = require('crypto');
const axios = require('axios');
const { Plan, Payment, Promo, User } = require('../models');
const { auth } = require('../middleware');
const { notify, getSettings } = require('../utils');

const PAYSTACK = 'https://api.paystack.co';
const ps = () => ({ headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }, timeout: 20000 });

// Public: active plans (capped by the admin's hard ceiling)
router.get('/plans', async (req, res) => {
  const settings = await getSettings();
  const plans = await Plan.find({ active: true, applicationsPerDay: { $lte: settings.maxApplicationsPerDay } }).sort({ sortOrder: 1, price: 1 });
  res.json({ plans });
});

router.post('/promo/check', auth, async (req, res) => {
  const p = await Promo.findOne({ code: (req.body.code || '').toUpperCase(), active: true });
  if (!p || (p.maxUses && p.used >= p.maxUses)) return res.status(404).json({ error: 'Invalid or expired code' });
  res.json({ percentOff: p.percentOff });
});

async function activate(paymentId) {
  // Atomic flip pending -> success so a payment can never be applied twice
  const p = await Payment.findOneAndUpdate({ _id: paymentId, status: 'pending' }, { status: 'success', paidAt: new Date() }, { new: true });
  if (!p) return false;
  const plan = await Plan.findById(p.plan);
  const user = await User.findById(p.user);
  if (!plan || !user) return false;
  const now = new Date();
  const start = user.subscription?.expiresAt && user.subscription.expiresAt > now ? user.subscription.expiresAt : now;
  user.subscription = {
    planId: plan._id, planName: plan.name, applicationsPerDay: plan.applicationsPerDay,
    expiresAt: new Date(start.getTime() + plan.durationDays * 864e5), expiryNotified: false,
  };
  await user.save();
  if (p.promoCode) await Promo.updateOne({ code: p.promoCode }, { $inc: { used: 1 } });
  await notify(user._id, 'Payment received', `Your ${plan.name} plan is active. Applications will start on the next run.`);
  return true;
}

router.post('/payments/init', auth, async (req, res) => {
  try {
    const plan = await Plan.findOne({ _id: req.body.planId, active: true });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    let discount = 0;
    let promoCode;
    if (req.body.promoCode) {
      const promo = await Promo.findOne({ code: req.body.promoCode.toUpperCase(), active: true });
      if (!promo || (promo.maxUses && promo.used >= promo.maxUses)) return res.status(400).json({ error: 'Invalid or expired promo code' });
      discount = Math.round((plan.price * promo.percentOff) / 100);
      promoCode = promo.code;
    }
    const amount = Math.max(0, plan.price - discount);
    const reference = 'AP_' + crypto.randomBytes(8).toString('hex');
    const payment = await Payment.create({ user: req.user._id, plan: plan._id, planName: plan.name, reference, amount, discount, promoCode });
    if (amount === 0) {
      await activate(payment._id);
      return res.json({ free: true });
    }
    const { data } = await axios.post(
      `${PAYSTACK}/transaction/initialize`,
      {
        email: req.user.email, amount: amount * 100, currency: 'NGN', reference,
        callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
        metadata: { userId: String(req.user._id), planId: String(plan._id) },
      },
      ps()
    );
    res.json({ url: data.data.authorization_url, reference });
  } catch (e) {
    res.status(500).json({ error: e.response?.data?.message || e.message });
  }
});

router.post('/payments/verify', auth, async (req, res) => {
  try {
    const payment = await Payment.findOne({ reference: req.body.reference, user: req.user._id });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.status === 'success') return res.json({ status: 'success' });
    const { data } = await axios.get(`${PAYSTACK}/transaction/verify/${payment.reference}`, ps());
    if (data.data.status === 'success' && data.data.amount === payment.amount * 100) {
      await activate(payment._id);
      return res.json({ status: 'success' });
    }
    if (['failed', 'abandoned'].includes(data.data.status)) {
      payment.status = 'failed';
      await payment.save();
    }
    res.json({ status: data.data.status });
  } catch (e) {
    res.status(500).json({ error: e.response?.data?.message || e.message });
  }
});

// Paystack webhook (set this URL in the Paystack dashboard). Safety net if the user closes the tab.
router.post('/payments/webhook', async (req, res) => {
  const sig = req.headers['x-paystack-signature'];
  const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(req.rawBody || '').digest('hex');
  if (!sig || sig !== hash) return res.sendStatus(401);
  const ev = req.body;
  if (ev.event === 'charge.success') {
    const payment = await Payment.findOne({ reference: ev.data.reference });
    if (payment && ev.data.amount === payment.amount * 100) await activate(payment._id);
  }
  res.sendStatus(200);
});

router.get('/payments/mine', auth, async (req, res) => {
  res.json({ payments: await Payment.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50) });
});

module.exports = router;
module.exports.activate = activate;
