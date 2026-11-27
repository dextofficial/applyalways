const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

// Runs the real runner.js with fake database, AI and Gmail modules (no network needed).
const created = [];
let existing = [];
let scenario = 'ok';
const jobs = [
  { _id: 'j1', title: 'Data Analyst', company: 'A', applyEmail: 'a@x.com', applyUrl: 'u1' },
  { _id: 'j2', title: 'Data Analyst', company: 'B', applyEmail: 'b@x.com', applyUrl: 'u2' },
  { _id: 'j3', title: 'Data Analyst', company: 'C', applyUrl: 'u3' },
];
const user = {
  email: 'u@x.com', name: 'U', cv: { url: 'x' }, gmail: { connected: true },
  subscription: { applicationsPerDay: 20 }, save: async () => {},
};
const fakes = {
  models: {
    User: { find: async () => [user] },
    Job: {
      find: (filter) => {
        if (filter._id.$in) return Promise.resolve(jobs.filter((job) => filter._id.$in.includes(job._id)));
        const remaining = jobs.filter((job) => !filter._id.$nin.includes(job._id));
        return { sort: () => ({ limit: async () => remaining }) };
      },
    },
    Application: {
      countDocuments: async () => 0,
      find: () => ({ select: async () => existing }),
      create: async (d) => { created.push(d); return d; },
    },
    Blacklist: { find: async () => [] },
  },
  utils: {
    getSettings: async () => ({ maxApplicationsPerDay: 40, runsPerDay: 8, matchThreshold: 55, maxManualPerDay: 15, letterStyle: 's' }),
    startOfDayLagos: () => new Date(0),
    notify: async () => {},
  },
  jobs: { refreshForUser: async () => {} },
  matcher: { score: () => 90 },
  ai: {
    AiError: class AiError extends Error {},
    writeLetter: async () => { if (scenario === 'ai') throw new Error('HTTP 404 model not found'); return 'letter'; },
  },
  mailer: {
    sendFromUser: async () => {
      if (scenario === '400') { const e = new Error('bad'); e.response = { status: 400, data: { error: { message: 'Invalid To header' } } }; throw e; }
      if (scenario === '429') { const e = new Error('limit'); e.response = { status: 429, data: { error: { message: 'User-rate limit exceeded' } } }; throw e; }
    },
  },
  storage: { downloadCv: async () => ({ filename: 'cv.pdf', buffer: Buffer.alloc(1) }) },
};
const origLoad = Module._load;
Module._load = function (request, parent, ...rest) {
  if (parent?.filename?.endsWith(path.join('services', 'runner.js'))) {
    const key = path.basename(request);
    if (fakes[key]) return fakes[key];
  }
  return origLoad.call(this, request, parent, ...rest);
};
const { runAll } = require('../src/services/runner');
const realSetTimeout = global.setTimeout;
global.setTimeout = (fn) => { fn(); return 0; }; // skip the 4 second pause between emails

async function run(name) {
  scenario = name;
  created.length = 0;
  await runAll();
  return created.map((c) => c.status);
}

test('sends applications and lists email-less jobs as manual', async () => {
  assert.deepEqual(await run('ok'), ['sent', 'sent', 'manual']);
});

test('an AI failure never uses up a job', async () => {
  assert.deepEqual(await run('ai'), []);
});

test('a bad address is recorded as failed', async () => {
  assert.deepEqual(await run('400'), ['failed', 'failed', 'manual']);
});

test('a Gmail limit pauses the user without using up jobs', async () => {
  assert.deepEqual(await run('429'), []);
});

test('a failed application caused by a retired model is retried and updated', async () => {
  const failed = {
    job: 'j1',
    status: 'failed',
    error: 'This model models/gemini-2.0-flash is no longer available',
    save: async () => {},
  };
  existing = [failed];

  assert.deepEqual(await run('ok'), ['sent', 'manual']);
  assert.equal(failed.status, 'sent');
  assert.equal(failed.error, undefined);
  existing = [];
});

test.after(() => { global.setTimeout = realSetTimeout; });
