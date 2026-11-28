const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

// Runs the real runner.js with fake database, AI and Gmail modules (no network needed).
const created = [];
let scenario = 'ok';
const jobs = [
  { _id: 'j1', title: 'Data Analyst', company: 'Alpha Ltd', applyEmail: 'a@x.com', applyUrl: 'u1' },
  { _id: 'j2', title: 'Data Analyst', company: 'Beta Ltd', applyEmail: 'b@x.com', applyUrl: 'u2' },
  { _id: 'j3', title: 'Data Analyst', company: 'Gamma Ltd', applyUrl: 'u3' },
];
const user = {
  _id: 'u1', email: 'u@x.com', name: 'U', cv: { url: 'x' }, gmail: { connected: true },
  subscription: { applicationsPerDay: 20, expiresAt: new Date(Date.now() + 864e5) }, credits: 0, blockedCompanies: [], save: async () => {},
};
const creditUpdates = [];
const fakes = {
  models: {
    User: { find: async () => [user], updateOne: async (f, u) => { creditUpdates.push(u); } },
    Job: { find: () => ({ sort: () => ({ limit: async () => jobs }) }) },
    Application: {
      countDocuments: async () => 0,
      find: () => ({ distinct: async () => [] }),
      create: async (d) => { created.push(d); return d; },
    },
    Blacklist: { find: async () => [] },
  },
  utils: {
    getSettings: async () => ({ creditDailyCap: 10, maxApplicationsPerDay: 40, runsPerDay: 8, matchThreshold: 55, maxManualPerDay: 15, letterStyle: 's' }),
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
  creditUpdates.length = 0;
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

function withoutPlan(credits, blocked = []) {
  user.subscription = {};
  user.credits = credits;
  user.blockedCompanies = blocked;
}
function withPlan() {
  user.subscription = { applicationsPerDay: 20, expiresAt: new Date(Date.now() + 864e5) };
  user.credits = 0;
  user.blockedCompanies = [];
}

test('with a plan, no credits are used', async () => {
  withPlan();
  await run('ok');
  assert.equal(creditUpdates.length, 0);
});

test('without a plan, each sent application uses one credit and stops when they run out', async () => {
  withoutPlan(1);
  assert.deepEqual(await run('ok'), ['sent']);
  assert.equal(creditUpdates.length, 1);
  withPlan();
});

test('no plan and no credits means nothing is sent', async () => {
  withoutPlan(0);
  assert.deepEqual(await run('ok'), []);
  withPlan();
});

test('failed and manual applications never use credits', async () => {
  withoutPlan(5);
  await run('400');
  assert.equal(creditUpdates.length, 0);
  withPlan();
});

test("a company on the user's block list is skipped", async () => {
  withoutPlan(5, ['alpha']);
  assert.deepEqual(await run('ok'), ['sent', 'manual']);
  withPlan();
});

test.after(() => { global.setTimeout = realSetTimeout; });
