// Scores how well a job fits a user. Returns 0 when the job is a hard mismatch.
const lower = (s) => (s || '').toLowerCase();

function titleMatches(title, wanted) {
  const t = lower(title);
  return wanted.some((w) => {
    const w1 = lower(w).trim();
    if (!w1) return false;
    if (t.includes(w1)) return true;
    const words = w1.split(/\s+/).filter((x) => x.length > 3);
    return words.length > 0 && words.every((x) => t.includes(x));
  });
}

function score(user, job) {
  const p = user.profile || {};
  const modes = p.workModes || [];
  if (!titleMatches(job.title, p.desiredTitles || [])) return 0;

  const locs = (p.locations || []).map(lower).filter(Boolean);
  const jobLoc = lower(job.location);
  const home = [lower(user.country), lower(user.nationality)].filter(Boolean);

  if (job.isRemote) {
    if (!modes.includes('remote')) return 0;
    const open = !jobLoc || /(worldwide|anywhere|global|africa|emea|international)/.test(jobLoc);
    if (!open && ![...locs, ...home].some((l) => jobLoc.includes(l))) return 0; // region-locked elsewhere
  } else {
    if (!modes.includes('onsite') && !modes.includes('hybrid')) return 0;
    if (locs.length && !locs.some((l) => jobLoc.includes(l))) return 0;
  }

  let s = 50;

  const skills = (p.skills || []).map(lower).filter(Boolean);
  if (skills.length) {
    const hay = lower(`${job.title} ${job.description}`);
    const hits = skills.filter((k) => hay.includes(k)).length;
    s += Math.round((hits / skills.length) * 30);
  } else s += 10;

  // Salary: only compared when the currencies match (we do not guess exchange rates)
  if (p.salaryMin && job.salaryMax && job.currency && job.currency === p.salaryCurrency) {
    const wantYear = p.salaryPeriod === 'month' ? p.salaryMin * 12 : p.salaryMin;
    if (job.salaryMax < wantYear) return 0;
    s += 10;
  } else s += 5;

  if (job.postedAt) {
    const days = (Date.now() - new Date(job.postedAt).getTime()) / 864e5;
    if (days < 3) s += 10;
    else if (days < 10) s += 5;
  }
  return Math.min(100, s);
}

module.exports = { score };
