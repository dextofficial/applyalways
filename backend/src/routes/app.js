const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
const { Application, Notification, User } = require('../models');
const { auth } = require('../middleware');
const { encrypt, notify } = require('../utils');
const { oauthClient } = require('../services/mailer');

// ---------- APPLICATIONS ----------
router.get('/applications', auth, async (req, res) => {
  const { status, page = 1 } = req.query;
  const q = { user: req.user._id };
  if (['sent', 'failed', 'manual'].includes(status)) q.status = status;
  const limit = 30;
  const [items, total] = await Promise.all([
    Application.find(q).select('-body').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Application.countDocuments(q),
  ]);
  res.json({ items, total, pages: Math.ceil(total / limit) });
});

router.get('/applications/:id', auth, async (req, res) => {
  const a = await Application.findOne({ _id: req.params.id, user: req.user._id });
  if (!a) return res.status(404).json({ error: 'Not found' });
  res.json({ application: a });
});

// ---------- NOTIFICATIONS ----------
router.get('/notifications', auth, async (req, res) => {
  res.json({ items: await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50) });
});
router.post('/notifications/read-all', auth, async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ ok: true });
});

// ---------- GMAIL CONNECT ----------
router.get('/gmail/auth-url', auth, (req, res) => {
  const state = jwt.sign({ id: req.user._id, purpose: 'gmail-connect' }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const url = oauthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // forces a refresh token every time
    scope: ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/userinfo.email'],
    state,
  });
  res.json({ url });
});

router.get('/gmail/callback', async (req, res) => {
  const back = (q) => res.redirect(`${process.env.FRONTEND_URL}/dashboard?gmail=${q}`);
  try {
    if (req.query.error) return back('denied');
    const { id, purpose } = jwt.verify(req.query.state, process.env.JWT_SECRET);
    if (purpose !== 'gmail-connect') return back('error');
    const client = oauthClient();
    const { tokens } = await client.getToken(req.query.code);
    if (!tokens.refresh_token) return back('norefresh');
    client.setCredentials(tokens);
    const info = await google.oauth2({ version: 'v2', auth: client }).userinfo.get();
    await User.findByIdAndUpdate(id, {
      'gmail.connected': true, 'gmail.email': info.data.email, 'gmail.refreshTokenEnc': encrypt(tokens.refresh_token),
    });
    await notify(id, 'Gmail connected', `Applications will be sent from ${info.data.email}. Replies arrive in that inbox.`);
    back('connected');
  } catch (e) {
    console.error('gmail callback', e.message);
    back('error');
  }
});

router.post('/gmail/disconnect', auth, async (req, res) => {
  req.user.gmail = { connected: false };
  await req.user.save();
  res.json({ ok: true });
});

module.exports = router;
