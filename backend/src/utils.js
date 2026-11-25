const crypto = require('crypto');
const { Settings, Notification } = require('./models');

function key() {
  const k = process.env.ENCRYPTION_KEY || '';
  if (k.length !== 64) throw new Error('ENCRYPTION_KEY must be 64 hex characters');
  return Buffer.from(k, 'hex');
}

function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(text, 'utf8'), c.final()]);
  return [iv.toString('hex'), c.getAuthTag().toString('hex'), enc.toString('hex')].join(':');
}

function decrypt(payload) {
  const [iv, tag, enc] = payload.split(':').map((h) => Buffer.from(h, 'hex'));
  const d = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
}

// Start of "today" in Lagos (UTC+1, no DST)
function startOfDayLagos(d = new Date()) {
  const off = 3600e3;
  const t = new Date(d.getTime() + off);
  t.setUTCHours(0, 0, 0, 0);
  return new Date(t.getTime() - off);
}

async function getSettings() {
  return Settings.findOneAndUpdate({ key: 'main' }, { $setOnInsert: { key: 'main' } }, { upsert: true, new: true });
}

async function notify(userId, title, message) {
  try {
    await Notification.create({ user: userId, title, message });
  } catch (e) {
    console.error('notify failed', e.message);
  }
}

function publicUser(u) {
  const o = u.toObject ? u.toObject() : { ...u };
  delete o.passwordHash;
  if (o.gmail) delete o.gmail.refreshTokenEnc;
  if (o.cv) delete o.cv.text;
  return o;
}

module.exports = { encrypt, decrypt, startOfDayLagos, getSettings, notify, publicUser };
