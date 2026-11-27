const mongoose = require('mongoose');
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    phone: String,
    nationality: String,
    country: String, // country the user lives in (used for currency/location fallback)
    suspended: { type: Boolean, default: false },
    automationEnabled: { type: Boolean, default: true },
    profile: {
      desiredTitles: [String],
      skills: [String],
      experienceYears: Number,
      workModes: { type: [String], default: ['remote'] }, // remote | hybrid | onsite
      locations: [String], // cities/countries where they want to work
      salaryMin: Number,
      salaryCurrency: { type: String, default: 'NGN' },
      salaryPeriod: { type: String, enum: ['month', 'year'], default: 'month' },
      summary: String,
    },
    cv: { url: String, publicId: String, filename: String, mime: String, text: String, authenticated: Boolean },
    gmail: {
      connected: { type: Boolean, default: false },
      email: String,
      refreshTokenEnc: String,
    },
    subscription: {
      planId: { type: ObjectId, ref: 'Plan' },
      planName: String,
      applicationsPerDay: Number,
      expiresAt: Date,
      durationDays: Number,
      endingNotified: { type: Boolean, default: false },
      expiryNotified: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

const planSchema = new Schema(
  {
    name: { type: String, required: true },
    description: String,
    applicationsPerDay: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 }, // in NGN (naira)
    durationDays: { type: Number, required: true, min: 1 },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const paymentSchema = new Schema(
  {
    user: { type: ObjectId, ref: 'User', required: true },
    plan: { type: ObjectId, ref: 'Plan', required: true },
    planName: String,
    reference: { type: String, unique: true },
    amount: { type: Number, required: true }, // naira actually charged
    discount: { type: Number, default: 0 },
    promoCode: String,
    status: { type: String, enum: ['pending', 'success', 'failed', 'refunded'], default: 'pending' },
    paidAt: Date,
  },
  { timestamps: true }
);

const jobSchema = new Schema(
  {
    source: String,
    externalId: String,
    title: String,
    company: String,
    location: String,
    isRemote: Boolean,
    description: String,
    applyUrl: String,
    applyEmail: String,
    salaryMin: Number,
    salaryMax: Number,
    currency: String,
    postedAt: Date,
  },
  { timestamps: true }
);
jobSchema.index({ source: 1, externalId: 1 }, { unique: true });
jobSchema.index({ createdAt: -1 });

const applicationSchema = new Schema(
  {
    user: { type: ObjectId, ref: 'User', required: true },
    job: { type: ObjectId, ref: 'Job', required: true },
    title: String,
    company: String,
    location: String,
    applyUrl: String,
    toEmail: String,
    subject: String,
    body: String,
    score: Number,
    status: { type: String, enum: ['sent', 'failed', 'manual'], required: true },
    error: String,
  },
  { timestamps: true }
);
applicationSchema.index({ user: 1, job: 1 }, { unique: true });
applicationSchema.index({ user: 1, createdAt: -1 });

const notificationSchema = new Schema(
  {
    user: { type: ObjectId, ref: 'User', required: true, index: true },
    title: String,
    message: String,
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const settingsSchema = new Schema({
  key: { type: String, default: 'main', unique: true },
  maxApplicationsPerDay: { type: Number, default: 40 }, // hard ceiling, admin only
  matchThreshold: { type: Number, default: 55 },
  runsPerDay: { type: Number, default: 8 }, // must match how often your scheduler calls /api/cron/run
  maxManualPerDay: { type: Number, default: 15 },
  letterStyle: {
    type: String,
    default: 'Warm, confident and concise. Highlight 2-3 achievements or skills from the CV that match the role.',
  },
  sources: {
    adzuna: { type: Boolean, default: true },
    jooble: { type: Boolean, default: true },
    remotive: { type: Boolean, default: true },
    remoteok: { type: Boolean, default: true },
  },
});

const promoSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    percentOff: { type: Number, required: true, min: 1, max: 100 },
    active: { type: Boolean, default: true },
    maxUses: { type: Number, default: 0 }, // 0 = unlimited
    used: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const blacklistSchema = new Schema({
  company: { type: String, required: true, unique: true, lowercase: true, trim: true },
});

const fetchLogSchema = new Schema({ key: { type: String, unique: true }, at: Date });

module.exports = {
  User: mongoose.model('User', userSchema),
  Plan: mongoose.model('Plan', planSchema),
  Payment: mongoose.model('Payment', paymentSchema),
  Job: mongoose.model('Job', jobSchema),
  Application: mongoose.model('Application', applicationSchema),
  Notification: mongoose.model('Notification', notificationSchema),
  Settings: mongoose.model('Settings', settingsSchema),
  Promo: mongoose.model('Promo', promoSchema),
  Blacklist: mongoose.model('Blacklist', blacklistSchema),
  FetchLog: mongoose.model('FetchLog', fetchLogSchema),
};
