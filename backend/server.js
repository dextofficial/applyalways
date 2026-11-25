require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const { runAll } = require('./src/services/runner');

const required = ['MONGODB_URI', 'JWT_SECRET', 'ENCRYPTION_KEY', 'FRONTEND_URL', 'BACKEND_URL', 'CRON_SECRET'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error('Missing env vars:', missing.join(', '));
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL }));
// keep the raw body: Paystack signs it and we must verify the signature
app.use(express.json({ limit: '1mb', verify: (req, res, buf) => (req.rawBody = buf) }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 600 }));

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Called by your scheduler (GitHub Actions / cron-job.org). Responds at once, works in the background.
app.post('/api/cron/run', (req, res) => {
  if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) return res.sendStatus(401);
  runAll().then((r) => console.log('run finished', r)).catch((e) => console.error('run failed', e));
  res.status(202).json({ started: true });
});

app.use('/api', require('./src/routes/user'));
app.use('/api', require('./src/routes/payments'));
app.use('/api', require('./src/routes/app'));
app.use('/api/admin', require('./src/routes/admin'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    const port = process.env.PORT || 5000;
    app.listen(port, () => console.log(`API running on ${port}`));
  })
  .catch((e) => {
    console.error('MongoDB connection failed:', e.message);
    process.exit(1);
  });
