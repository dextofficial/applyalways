const { User, Job, Application, Blacklist } = require('../models');
const { getSettings, startOfDayLagos, notify } = require('../utils');
const { refreshForUser } = require('./jobs');
const { score } = require('./matcher');
const { writeLetter, AiError } = require('./ai');
const { sendFromUser } = require('./mailer');
const { downloadCv } = require('./storage');

let running = false;

function gmailMessage(e) {
  const d = e.response?.data?.error;
  const m = (typeof d === 'object' ? d?.message : d) || e.message || 'unknown error';
  return String(m).slice(0, 300);
}

// A problem with the job or the address is worth recording. A problem with Gmail limits or the network is not:
// the job must stay available so it is tried again on the next run.
function isPermanentSendError(e) {
  const status = e.response?.status || e.code;
  if (status === 400) return true; // bad address or message
  return false;
}

async function processUser(user, settings, blacklist) {
  const sod = startOfDayLagos();
  // A paid plan covers the day's applications. Without one, each application uses 1 credit.
  const planActive = !!(user.subscription?.expiresAt && user.subscription.expiresAt > new Date());
  let creditsLeft = user.credits || 0;
  const limit = planActive
    ? Math.min(user.subscription.applicationsPerDay || 0, settings.maxApplicationsPerDay)
    : Math.min(settings.creditDailyCap || 0, settings.maxApplicationsPerDay);
  if (!planActive && creditsLeft <= 0) return;
  const sentToday = await Application.countDocuments({ user: user._id, status: 'sent', createdAt: { $gte: sod } });
  const manualToday = await Application.countDocuments({ user: user._id, status: 'manual', createdAt: { $gte: sod } });
  const remaining = planActive ? limit - sentToday : Math.min(limit - sentToday, creditsLeft);
  if (remaining <= 0) return;
  // Spread the daily quota across the day's runs so Gmail never sees a burst
  const budget = Math.min(remaining, Math.ceil(limit / Math.max(1, settings.runsPerDay)));

  await refreshForUser(user, settings);

  const seen = await Application.find({ user: user._id }).distinct('job');
  const recent = await Job.find({ _id: { $nin: seen } }).sort({ createdAt: -1 }).limit(800);
  const blocked = (user.blockedCompanies || []).map((c) => String(c).toLowerCase()).filter((c) => c.length >= 2);
  const ranked = recent
    .map((j) => ({ job: j, score: score(user, j) }))
    .filter((x) => x.score >= settings.matchThreshold)
    .filter((x) => !blacklist.has((x.job.company || '').toLowerCase()))
    .filter((x) => !blocked.some((b) => (x.job.company || '').toLowerCase().includes(b)))
    .sort((a, b) => b.score - a.score);

  let sent = 0;
  let manual = manualToday;
  let cv = null;
  let aiFailures = 0;

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

    // 1. Get the CV. If this fails, skip the user for this run and try again next time.
    try {
      cv = cv || (await downloadCv(user.cv));
    } catch (e) {
      console.error(`CV download failed for ${user.email}:`, e.message);
      return;
    }

    // 2. Write the letter. AI problems never use up the job, and two in a row stop this user's run.
    let body;
    try {
      body = await writeLetter({ user, job, style: settings.letterStyle });
    } catch (e) {
      aiFailures++;
      console.error(`Letter failed for ${user.email} (${job.title}):`, e.message);
      if (aiFailures >= 2) return;
      continue;
    }

    // 3. Send it.
    const subject = `Application for ${job.title} - ${user.name}`;
    try {
      await sendFromUser(user, { to: job.applyEmail, subject, text: body, attachment: cv });
      await Application.create({ ...base, toEmail: job.applyEmail, subject, body, status: 'sent' });
      sent++;
      if (!planActive) {
        // Only a sent application uses a credit. Failed and manual ones are free.
        await User.updateOne({ _id: user._id, credits: { $gt: 0 } }, { $inc: { credits: -1 } });
        creditsLeft--;
        if (creditsLeft <= 0) {
          await notify(user._id, 'You have used all your credits', 'Buy a credit pack or a plan in Plans to keep applying.');
          return;
        }
      }
      await new Promise((r) => setTimeout(r, 4000)); // gentle pacing between emails
    } catch (e) {
      const msg = gmailMessage(e);
      if (/invalid_grant|unauthorized_client|invalid_credentials/i.test(msg) || e.response?.status === 401) {
        user.gmail.connected = false;
        await user.save();
        await notify(user._id, 'Reconnect your Gmail', 'We lost access to your Gmail, so applications are paused. Please reconnect it in your dashboard.');
        return;
      }
      if (isPermanentSendError(e)) {
        await Application.create({ ...base, toEmail: job.applyEmail, subject, body, status: 'failed', error: msg }).catch(() => {});
        continue;
      }
      // Gmail limit, temporary Google error or network problem: stop for now, keep the job for the next run.
      console.error(`Send paused for ${user.email}:`, msg);
      return;
    }
  }
}

async function expireNotices() {
  const now = new Date();
  const expired = await User.find({
    role: 'user', 'subscription.planId': { $exists: true },
    'subscription.expiresAt': { $lt: now }, 'subscription.expiryNotified': { $ne: true },
  });
  for (const u of expired) {
    await notify(u._id, 'Your plan has ended', 'Applications are paused. Renew your plan to keep applying automatically. Your data is safe.');
    u.subscription.expiryNotified = true;
    await u.save();
  }
  // "Ending soon" only makes sense for plans longer than one day
  const soon = new Date(now.getTime() + 24 * 3600e3);
  const ending = await User.find({
    role: 'user', 'subscription.expiresAt': { $gt: now, $lt: soon },
    'subscription.endingNotified': { $ne: true }, 'subscription.durationDays': { $gt: 1 },
  });
  for (const u of ending) {
    await notify(u._id, 'Plan ending soon', 'Your plan ends within 24 hours. Renew to avoid a pause in applications.');
    u.subscription.endingNotified = true;
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
      'cv.url': { $exists: true },
      $or: [{ 'subscription.expiresAt': { $gt: new Date() } }, { credits: { $gt: 0 } }],
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
