const axios = require('axios');
const { Job, FetchLog } = require('../models');

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const BAD_EMAIL = /(no-?reply|donotreply|example\.com|sentry|\.png|\.jpg|\.gif|\.svg)/i;

function extractEmail(text) {
  const found = (text || '').match(EMAIL_RE) || [];
  return found.find((e) => !BAD_EMAIL.test(e)) || null;
}

function stripHtml(h) {
  return (h || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

// Countries Adzuna supports (Nigeria is NOT one of them - Jooble covers it)
const ADZUNA = {
  'united kingdom': ['gb', 'GBP'], uk: ['gb', 'GBP'], 'united states': ['us', 'USD'], usa: ['us', 'USD'],
  canada: ['ca', 'CAD'], australia: ['au', 'AUD'], 'south africa': ['za', 'ZAR'], india: ['in', 'INR'],
  germany: ['de', 'EUR'], france: ['fr', 'EUR'], netherlands: ['nl', 'EUR'], italy: ['it', 'EUR'],
  spain: ['es', 'EUR'], 'new zealand': ['nz', 'NZD'], singapore: ['sg', 'SGD'], poland: ['pl', 'PLN'],
  brazil: ['br', 'BRL'], austria: ['at', 'EUR'], switzerland: ['ch', 'CHF'], mexico: ['mx', 'MXN'],
};

async function shouldFetch(key, hours) {
  const l = await FetchLog.findOne({ key });
  if (l && Date.now() - l.at.getTime() < hours * 3600e3) return false;
  await FetchLog.findOneAndUpdate({ key }, { at: new Date() }, { upsert: true });
  return true;
}

async function saveJobs(jobs) {
  const ops = jobs
    .filter((j) => j.externalId && j.title)
    .map((j) => ({
      updateOne: {
        filter: { source: j.source, externalId: String(j.externalId) },
        update: { $setOnInsert: { ...j, externalId: String(j.externalId) } },
        upsert: true,
      },
    }));
  if (ops.length) await Job.bulkWrite(ops, { ordered: false });
}

async function fromAdzuna(title, place, userCountry) {
  if (!process.env.ADZUNA_APP_ID) return;
  const key = (place || '').toLowerCase();
  let entry = ADZUNA[key];
  let where;
  if (!entry) {
    entry = ADZUNA[(userCountry || '').toLowerCase()];
    where = place;
  }
  if (!entry) return;
  const ck = `adzuna:${entry[0]}:${title}:${where || ''}`.toLowerCase();
  if (!(await shouldFetch(ck, 12))) return;
  const { data } = await axios.get(`https://api.adzuna.com/v1/api/jobs/${entry[0]}/search/1`, {
    params: {
      app_id: process.env.ADZUNA_APP_ID, app_key: process.env.ADZUNA_APP_KEY,
      results_per_page: 50, what: title, where, 'content-type': 'application/json',
    },
    timeout: 20000,
  });
  await saveJobs(
    (data.results || []).map((r) => ({
      source: 'adzuna', externalId: r.id, title: r.title?.replace(/<[^>]*>/g, ''),
      company: r.company?.display_name, location: r.location?.display_name,
      isRemote: /remote/i.test(`${r.title} ${r.description}`),
      description: stripHtml(r.description), applyUrl: r.redirect_url,
      applyEmail: extractEmail(r.description), salaryMin: r.salary_min, salaryMax: r.salary_max,
      currency: entry[1], postedAt: r.created ? new Date(r.created) : new Date(),
    }))
  );
}

async function fromJooble(title, place) {
  if (!process.env.JOOBLE_API_KEY) return;
  const ck = `jooble:${title}:${place || ''}`.toLowerCase();
  if (!(await shouldFetch(ck, 12))) return;
  const { data } = await axios.post(
    `https://jooble.org/api/${process.env.JOOBLE_API_KEY}`,
    { keywords: title, location: place || '' },
    { timeout: 20000 }
  );
  await saveJobs(
    (data.jobs || []).map((r) => ({
      source: 'jooble', externalId: r.id, title: stripHtml(r.title), company: r.company,
      location: r.location, isRemote: /remote/i.test(`${r.title} ${r.location} ${r.type}`),
      description: stripHtml(r.snippet), applyUrl: r.link, applyEmail: extractEmail(r.snippet),
      postedAt: r.updated ? new Date(r.updated) : new Date(),
    }))
  );
}

async function fromRemotive(title) {
  const ck = `remotive:${title}`.toLowerCase();
  if (!(await shouldFetch(ck, 24))) return; // Remotive asks API users to fetch sparingly
  const { data } = await axios.get('https://remotive.com/api/remote-jobs', {
    params: { search: title, limit: 50 }, timeout: 20000,
  });
  await saveJobs(
    (data.jobs || []).map((r) => {
      const desc = stripHtml(r.description);
      return {
        source: 'remotive', externalId: r.id, title: r.title, company: r.company_name,
        location: r.candidate_required_location || 'Worldwide', isRemote: true, description: desc,
        applyUrl: r.url, applyEmail: extractEmail(desc), postedAt: new Date(r.publication_date),
      };
    })
  );
}

async function fromRemoteOK() {
  if (!(await shouldFetch('remoteok:all', 6))) return;
  const { data } = await axios.get('https://remoteok.com/api', {
    headers: { 'User-Agent': 'Applyly/1.0' }, timeout: 20000,
  });
  await saveJobs(
    (data || [])
      .filter((r) => r.id && r.position)
      .map((r) => {
        const desc = stripHtml(r.description);
        return {
          source: 'remoteok', externalId: r.id, title: r.position, company: r.company,
          location: r.location || 'Worldwide', isRemote: true, description: `${desc} ${(r.tags || []).join(' ')}`,
          applyUrl: r.apply_url || r.url, applyEmail: extractEmail(desc),
          salaryMin: r.salary_min || undefined, salaryMax: r.salary_max || undefined,
          currency: r.salary_min ? 'USD' : undefined, postedAt: r.date ? new Date(r.date) : new Date(),
        };
      })
  );
}

// Pull fresh jobs relevant to one user. Each source is isolated so one failure never stops the run.
async function refreshForUser(user, settings) {
  const p = user.profile || {};
  const titles = (p.desiredTitles || []).slice(0, 3);
  const modes = p.workModes || [];
  const places = [...(p.locations || []), user.country, user.nationality].filter(Boolean).slice(0, 3);
  const s = settings.sources || {};
  const tasks = [];
  for (const t of titles) {
    if (modes.includes('remote')) {
      if (s.remotive) tasks.push(fromRemotive(t));
      if (s.jooble) tasks.push(fromJooble(t, ''));
    }
    if (modes.includes('hybrid') || modes.includes('onsite')) {
      for (const place of places.slice(0, 2)) {
        if (s.adzuna) tasks.push(fromAdzuna(t, place, user.country || user.nationality));
        if (s.jooble) tasks.push(fromJooble(t, place));
      }
    }
  }
  if (modes.includes('remote') && s.remoteok) tasks.push(fromRemoteOK());
  const results = await Promise.allSettled(tasks);
  results.forEach((r) => r.status === 'rejected' && console.error('job source error:', r.reason?.message));
}

module.exports = { refreshForUser, extractEmail };
