const axios = require('axios');
const { User, Job, Application, Blacklist } = require('../models');
const { getSettings, startOfDayLagos, notify } = require('../utils');
const { refreshForUser } = require('./jobs');
const { score } = require('./matcher');
const { writeLetter } = require('./ai');
const { sendFromUser } = require('./mailer');

let running = false;

async function downloadCv(user) {
  const { data } = await axios.get(user.cv.url, { responseType: 'arraybuffer', timeout: 30000 });
  return { filename: user.cv.filename || 'CV.pdf', mime: user.cv.mime, buffer: Buffer.from(data) };
}

async function processUser(user, settings, blacklist) {
  const now = new Date();
  const sod = startOfDayLagos();
  const limit = Math.min(user.subscription.applicationsPerDay || 0, settings.maxApplicationsPerDay);
  const sentToday = await Application.countDocuments({ user: user._id, status: 'sent', createdAt: { $gte: sod } });
  const manualToday = await Application.countDocuments({ user: user._id, status: 'manual', createdAt: { $gte: sod } });
  const remaining = limit - sentToday;
  if (remaining <= 0) return;
  // Spread the daily quota across the day's runs so Gmail never sees a burst
  const budget = Math.min(remaining, Math.ceil(limit / Math.max(1, settings.runsPerDay)));

  await refreshForUser(user, settings);

  const seen = await Application.find({ user: user._id }).distinct('job');
  const recent = await Job.find({ _id: { $nin: seen } }).sort({ createdAt: -1 }).limit(800);
  const ranked = recent
    .map((j) => ({ job: j, score: score(user, j) }))
    .filter((x) => x.score >= settings.matchThreshold)
    .filter((x) => !blacklist.has((x.job.company || '').toLowerCase()))
    .sort((a, b) => b.score - a.score);

  let sent = 0;
  let manual = manualToday;
  let cv = null;

  for (const { job, score: sc } of ranked) {
    if (sent >= budget) break;
    const base = {
      user: user._id, job: job._id, title: job.title, company: job.company,
      location: job.location, applyUrl: job.applyUrl, score: sc,
    };

    if (!job.applyEmail) {
      // No email to apply to: surface it in the user's "Apply manually" list
      if (manual < settings.maxManualPerDay) {
        await Application.create({ ...base, status: 'manual' }).catch(() => {});
        manual++;
      }
      continue;
    }

    try {
      cv = cv || (await downloadCv(user));
      const body = await writeLetter({ user, job, style: settings.letterStyle });
      const subject = `Application for ${job.title} - ${user.name}`;
      await sendFromUser(user, { to: job.applyEmail, subject, text: body, attachment: cv });
      await Application.create({ ...base, toEmail: job.applyEmail, subject, body, status: 'sent' });
      sent++;
      await new Promise((r) => setTimeout(r, 4000)); // gentle pacing between emails
    } catch (e) {
      const msg = e.response?.data?.error?.message || e.response?.data?.error || e.message;
      await Application.create({ ...base, toEmail: job.applyEmail, status: 'failed', error: String(msg).slice(0, 300) }).catch(() => {});
      if (/invalid_grant|unauthorized_client|invalid_credentials/i.test(String(msg)) || e.response?.status === 401) {
        user.gmail.connected = false;
        await user.save();
        await notify(user._id, 'Reconnect your Gmail', 'We lost access to your Gmail, so applications are paused. Please reconnect it in your dashboard.');
        return;
      }
    }
  }
}

async function expireNotices() {
  const expired = await User.find({
    role: 'user', 'subscription.planId': { $exists: true },
    'subscription.expiresAt': { $lt: new Date() }, 'subscription.expiryNotified': false,
  });
  for (const u of expired) {
    await notify(u._id, 'Your plan has ended', 'Applications are paused. Renew your plan to keep applying automatically. Your data is safe.');
    u.subscription.expiryNotified = true;
    await u.save();
  }
  const soon = new Date(Date.now() + 24 * 3600e3);
  const ending = await User.find({
    role: 'user', 'subscription.expiresAt': { $gt: new Date(), $lt: soon }, 'subscription.expiryNotified': false,
  });
  for (const u of ending) {
    await notify(u._id, 'Plan ending soon', 'Your plan ends within 24 hours. Renew to avoid a pause in applications.');
    u.subscription.expiryNotified = true;
    await u.save();
  }
}

async function runAll() {
  if (running) return { skipped: true };
  running = true;
  try {
    const settings = await getSettings();
    await expireNotices();
    const blacklist = new Set((await Blacklist.find()).map((b) => b.company));
    const users = await User.find({
      role: 'user', suspended: false, automationEnabled: true, 'gmail.connected': true,
      'cv.url': { $exists: true }, 'subscription.expiresAt': { $gt: new Date() },
    });
    for (const u of users) {
      try {
        await processUser(u, settings, blacklist);
      } catch (e) {
        console.error(`user ${u.email} failed:`, e.message);
      }
    }
    return { users: users.length };
  } finally {
    running = false;
  }
}

module.exports = { runAll };
