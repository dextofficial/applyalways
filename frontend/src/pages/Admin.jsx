import React, { useEffect, useState, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, getToken, setToken, naira, dateTime, APP_NAME } from '../api.js';
import { useMe } from '../App.jsx';
import { ThemeToggle } from '../Theme.jsx';
import EmptyState from '../components/EmptyState.jsx';
import AsyncButton from '../components/AsyncButton.jsx';
import LoadingState from '../components/LoadingState.jsx';

const TABS = ['Overview', 'Users', 'Applications', 'Payments', 'Plans', 'Settings', 'Promos', 'Jobs', 'Blacklist', 'Announce'];

function Pager({ page, pages, set, loading = false }) {
  if (!pages || pages < 2) return null;
  return (
    <div className="row">
      <AsyncButton className="btn small" loading={loading} loadingText="Loading…" disabled={page <= 1} onClick={() => set(page - 1)}>Prev</AsyncButton>
      <span className="muted">Page {page} / {pages}</span>
      <AsyncButton className="btn small" loading={loading} loadingText="Loading…" disabled={page >= pages} onClick={() => set(page + 1)}>Next</AsyncButton>
    </div>
  );
}

function Overview() {
  const [s, setS] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [running, setRunning] = useState(false);
  useEffect(() => { api('/admin/stats').then(setS); }, []);
  const runNow = async () => {
    setRunning(true);
    setErr('');
    try {
      await api('/admin/run', { method: 'POST' });
      setMsg('Run started in the background. Check Applications in a minute.');
    } catch (e) {
      setErr(e.message);
    } finally {
      setRunning(false);
    }
  };
  if (!s) return <p>Loading…</p>;
  const max = Math.max(1, ...s.byDay.map((d) => d.total));
  return (
    <>
      <div className="grid">
        {[['Users', s.users], ['Active plans', s.activeSubs], ['Sent today', s.appsToday], ['Failed today', s.failedToday], ['Total sent', s.appsTotal],
          ['Revenue today', naira(s.revenue.today)], ['Last 7 days', naira(s.revenue.week)], ['Last 30 days', naira(s.revenue.month)], ['All time', naira(s.revenue.total)]].map(([k, v]) => (
          <div className="card stat" key={k}><span className="muted">{k}</span><b>{v}</b></div>
        ))}
      </div>
      <div className="card revenue-card">
        <div><span className="eyebrow">PERFORMANCE</span><h2>Revenue, last 30 days</h2></div>
        <div className="bars">
          {s.byDay.map((d) => <div key={d._id} className="bar" title={`${d._id}: ${naira(d.total)} (${d.count} payments)`} style={{ height: `${(d.total / max) * 100}%` }}><span className="bar-tooltip">{`${d._id}: ${naira(d.total)} (${d.count} payments)`}</span></div>)}
          {s.byDay.length === 0 && <span className="muted chart-empty">No payments recorded for this period yet.</span>}
        </div>
      </div>
      <div className="card admin-action-card">
        <AsyncButton loading={running} loadingText="Starting run…" onClick={runNow}>Run applications now</AsyncButton>
        {msg && <p className="ok">{msg}</p>}
        {err && <p className="err">{err}</p>}
      </div>
    </>
  );
}

function Users() {
  const [q, setQ] = useState(''); const [page, setPage] = useState(1);
  const [d, setD] = useState({ items: [] });
  const [busyId, setBusyId] = useState(null); const [busyAction, setBusyAction] = useState(''); const [actionErr, setActionErr] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    setLoading(true);
    return api(`/admin/users?q=${encodeURIComponent(q)}&page=${page}`).then(setD).finally(() => setLoading(false));
  }, [q, page]);
  useEffect(() => { load(); }, [load]);
  const patch = async (id, body, action) => {
    setBusyId(id); setBusyAction(action); setActionErr('');
    try {
      await api(`/admin/users/${id}`, { method: 'PATCH', body });
      load();
    } catch (e) {
      setActionErr(e.message);
    } finally {
      setBusyId(null); setBusyAction('');
    }
  };
  const remove = async (u) => {
    if (!confirm(`Permanently delete ${u.name} (${u.email}), their CV, applications and alerts? This cannot be undone. Payment records are kept.`)) return;
    setBusyId(u._id); setBusyAction('delete'); setActionErr('');
    try {
      await api(`/admin/users/${u._id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      setActionErr(e.message);
    } finally {
      setBusyId(null); setBusyAction('');
    }
  };
  return (
    <>
      <label>Search users<input placeholder="Name or email" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></label>
      <p className="muted">{d.total ?? 0} users</p>
      {actionErr && <div className="err">{actionErr}</div>}
      {loading && <p className="muted loading-message" role="status">Loading users…</p>}
      {!loading && d.items.length === 0 && <EmptyState title={q ? 'No users found' : 'No users yet'} message={q ? 'Try another name or email address.' : 'User accounts will appear here after people sign up.'} />}
      {!loading && d.items.map((u) => {
        const active = u.subscription?.expiresAt && new Date(u.subscription.expiresAt) > new Date();
        return (
          <div className="card" key={u._id}>
            <b>{u.name}</b> {u.suspended && <span className="badge badge-suspended">Suspended</span>}
            <div className="muted small-text">{u.email} · {u.nationality || '-'} · joined {dateTime(u.createdAt)}</div>
            <div className="small-text user-meta">Plan: {active ? `${u.subscription.planName} until ${dateTime(u.subscription.expiresAt)}` : 'none'} · Gmail: {u.gmail?.connected ? 'connected' : 'no'} · CV: {u.cv?.url ? 'yes' : 'no'} · Sent: {u.applicationsSent}</div>
            <div className="row">
              <AsyncButton className="btn small" loading={busyId === u._id && busyAction === 'suspend'} loadingText="Updating…" disabled={busyId !== null} onClick={() => patch(u._id, { suspended: !u.suspended }, 'suspend')}>{u.suspended ? 'Unsuspend' : 'Suspend'}</AsyncButton>
              <AsyncButton className="btn small" loading={busyId === u._id && busyAction === 'grant'} loadingText="Granting…" disabled={busyId !== null} onClick={() => { const n = prompt('Grant how many free days?', '7'); if (n) patch(u._id, { grantDays: Number(n) }, 'grant'); }}>Grant days</AsyncButton>
              <AsyncButton className="btn small" loading={busyId === u._id && busyAction === 'delete'} loadingText="Deleting…" disabled={busyId !== null} onClick={() => remove(u)}>Delete user</AsyncButton>
            </div>
          </div>
        );
      })}
      <Pager page={page} pages={d.pages} set={setPage} loading={loading} />
    </>
  );
}

function Applications() {
  const [status, setStatus] = useState(''); const [page, setPage] = useState(1);
  const [d, setD] = useState({ items: [] }); const [open, setOpen] = useState(null);
  const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState('');
  useEffect(() => {
    setLoading(true);
    setLoadError('');
    api(`/admin/applications?status=${status}&page=${page}`)
      .then((data) => {
        if (!Array.isArray(data.items)) throw new Error('The server returned an invalid applications list.');
        setD(data);
      })
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, [status, page]);
  return (
    <>
      <div className="chips">
        {[['', 'All'], ['sent', 'Sent'], ['failed', 'Failed'], ['manual', 'Manual']].map(([k, l]) => <button key={k} className={'chip' + (status === k ? ' on' : '')} onClick={() => { setStatus(k); setPage(1); }}>{l}</button>)}
      </div>
      {loading && <LoadingState title="Loading applications" message="Fetching application records. This may take a moment." />}
      {!loading && loadError && <EmptyState title="Could not load applications" message={loadError} />}
      {!loading && !loadError && d.items.length === 0 && <EmptyState title="No applications found" message={status ? `There are no ${status} applications on this page.` : 'Applications will appear here after users start applying.'} />}
      {!loading && !loadError && d.items.map((a) => (
        <div className="card app" key={a._id}>
          <div>
            <b>{a.title}</b> <span className={'badge badge-' + a.status}>{a.status}</span>
            <div className="small-text">{a.user?.name} ({a.user?.email}) → {a.company || '-'}{a.toEmail ? ` <${a.toEmail}>` : ''}</div>
            <div className="muted small-text">{dateTime(a.createdAt)}</div>
            {a.error && <div className="err small-text">{a.error}</div>}
          </div>
          {a.body && <button className="btn small" onClick={() => setOpen(a)}>Letter</button>}
        </div>
      ))}
      <Pager page={page} pages={d.pages} set={setPage} loading={loading} />
      {open && <div className="modal" onClick={() => setOpen(null)}><div className="card letter-modal" role="dialog" aria-modal="true" aria-labelledby="admin-letter-title" onClick={(e) => e.stopPropagation()}><h2 id="admin-letter-title">{open.subject}</h2><pre className="letter">{open.body}</pre><button className="btn" onClick={() => setOpen(null)}>Close</button></div></div>}
    </>
  );
}

function Payments() {
  const [page, setPage] = useState(1); const [d, setD] = useState({ items: [] });
  const [loading, setLoading] = useState(true); const [refundingId, setRefundingId] = useState(null);
  const load = useCallback(() => api(`/admin/payments?page=${page}`).then(setD), [page]);
  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);
  const refund = async (id) => {
    if (!confirm('Refund this payment via Paystack?')) return;
    setRefundingId(id);
    try { await api(`/admin/payments/${id}/refund`, { method: 'POST' }); load(); } catch (e) { alert(e.message); } finally { setRefundingId(null); }
  };
  return (
    <>
      {loading && <p className="muted loading-message" role="status">Loading payments…</p>}
      {!loading && d.items.length === 0 && <EmptyState title="No payments yet" message="Successful and pending payment records will appear here." />}
      {!loading && d.items.map((p) => (
        <div className="card app" key={p._id}>
          <div>
            <b>{naira(p.amount)}</b> · {p.planName} <span className={p.status === 'success' ? 'ok inline' : 'muted'}>[{p.status}]</span>
            <div className="small-text">{p.user?.name} ({p.user?.email}){p.promoCode ? ` · promo ${p.promoCode}` : ''}</div>
            <div className="muted small-text">{p.reference} · {dateTime(p.createdAt)}</div>
          </div>
          {p.status === 'success' && <AsyncButton className="btn small" loading={refundingId === p._id} loadingText="Refunding…" disabled={refundingId !== null} onClick={() => refund(p._id)}>Refund</AsyncButton>}
        </div>
      ))}
      <Pager page={page} pages={d.pages} set={setPage} loading={loading} />
    </>
  );
}

function Plans() {
  const [plans, setPlans] = useState([]);
  const [f, setF] = useState({ name: '', applicationsPerDay: 10, price: 150, durationDays: 1, description: '' });
  const [err, setErr] = useState('');
  const [adding, setAdding] = useState(false); const [busyAction, setBusyAction] = useState('');
  const [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    return api('/admin/plans').then((d) => setPlans(d.plans)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  const add = async (e) => {
    e.preventDefault(); setErr(''); setAdding(true);
    try { await api('/admin/plans', { method: 'POST', body: f }); setF({ ...f, name: '' }); load(); }
    catch (x) { setErr(x.message); }
    finally { setAdding(false); }
  };
  const edit = async (p, k, label, num) => {
    const v = prompt(label, p[k]);
    if (v === null) return;
    const action = `${p._id}:${k}`;
    setBusyAction(action);
    try { await api(`/admin/plans/${p._id}`, { method: 'PUT', body: { [k]: num ? Number(v) : v } }); load(); }
    catch (x) { alert(x.message); }
    finally { setBusyAction(''); }
  };
  const toggleActive = async (p) => {
    const action = `${p._id}:active`;
    setBusyAction(action);
    try { await api(`/admin/plans/${p._id}`, { method: 'PUT', body: { active: !p.active } }); load(); }
    catch (x) { alert(x.message); }
    finally { setBusyAction(''); }
  };
  return (
    <>
      <form className="card" onSubmit={add}>
        <h3>New plan</h3>
        <label>Plan name<input placeholder="e.g. Starter" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></label>
        <div className="row">
          <label>Apps / day<input type="number" min="1" value={f.applicationsPerDay} onChange={(e) => setF({ ...f, applicationsPerDay: e.target.value })} /></label>
          <label>Price (₦)<input type="number" min="0" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></label>
          <label>Days<input type="number" min="1" value={f.durationDays} onChange={(e) => setF({ ...f, durationDays: e.target.value })} /></label>
        </div>
        <label>Description <span className="muted">(optional)</span><input placeholder="A short summary of this plan" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
        {err && <div className="err">{err}</div>}
        <AsyncButton loading={adding} loadingText="Adding plan…">Add plan</AsyncButton>
      </form>
      {loading && <p className="muted loading-message" role="status">Loading plans…</p>}
      {!loading && plans.map((p) => (
        <div className={'card' + (p.active ? '' : ' faded')} key={p._id}>
          <b>{p.name}</b> {!p.active && <span className="muted">(hidden)</span>}
          <div className="small-text">{p.applicationsPerDay}/day · {naira(p.price)} · {p.durationDays} days</div>
          <div className="row">
            <AsyncButton className="btn small" loading={busyAction === `${p._id}:price`} disabled={!!busyAction} loadingText="Saving…" onClick={() => edit(p, 'price', 'New price (₦)', true)}>Price</AsyncButton>
            <AsyncButton className="btn small" loading={busyAction === `${p._id}:applicationsPerDay`} disabled={!!busyAction} loadingText="Saving…" onClick={() => edit(p, 'applicationsPerDay', 'Applications per day', true)}>Apps/day</AsyncButton>
            <AsyncButton className="btn small" loading={busyAction === `${p._id}:durationDays`} disabled={!!busyAction} loadingText="Saving…" onClick={() => edit(p, 'durationDays', 'Duration in days', true)}>Days</AsyncButton>
            <AsyncButton className="btn small" loading={busyAction === `${p._id}:active`} disabled={!!busyAction} loadingText="Updating…" onClick={() => toggleActive(p)}>{p.active ? 'Hide' : 'Show'}</AsyncButton>
          </div>
        </div>
      ))}
      {!loading && plans.length === 0 && <EmptyState title="No plans configured" message="Add the first plan using the form above to make plans available to users." />}
    </>
  );
}

function SettingsTab() {
  const [s, setS] = useState(null); const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false); const [err, setErr] = useState('');
  useEffect(() => { api('/admin/settings').then((d) => setS(d.settings)); }, []);
  if (!s) return <p>Loading…</p>;
  const num = (k) => (e) => setS({ ...s, [k]: Number(e.target.value) });
  const src = (k) => (e) => setS({ ...s, sources: { ...s.sources, [k]: e.target.checked } });
  const save = async () => {
    setSaving(true); setErr('');
    try { await api('/admin/settings', { method: 'PUT', body: s }); setMsg('Saved'); }
    catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };
  return (
    <div className="card">
      <label>Hard ceiling: max applications per day, any plan<input type="number" value={s.maxApplicationsPerDay} onChange={num('maxApplicationsPerDay')} /></label>
      <label>Match threshold (0-100). Higher = pickier, fewer applications<input type="number" value={s.matchThreshold} onChange={num('matchThreshold')} /></label>
      <label>Runs per day (must equal how many times your scheduler calls the API; default 8)<input type="number" value={s.runsPerDay} onChange={num('runsPerDay')} /></label>
      <label>Max "apply manually" suggestions per user per day<input type="number" value={s.maxManualPerDay} onChange={num('maxManualPerDay')} /></label>
      <label>AI letter style instructions<textarea rows="4" value={s.letterStyle} onChange={(e) => setS({ ...s, letterStyle: e.target.value })} /></label>
      <h3>Job sources</h3>
      <div className="chips">
        {['adzuna', 'jooble', 'remotive', 'remoteok'].map((k) => <label key={k} className="check"><input type="checkbox" checked={!!s.sources?.[k]} onChange={src(k)} /> {k}</label>)}
      </div>
      <AsyncButton loading={saving} loadingText="Saving…" onClick={save}>Save settings</AsyncButton>
      {msg && <p className="ok">{msg}</p>}
      {err && <p className="err">{err}</p>}
    </div>
  );
}

function Promos() {
  const [items, setItems] = useState([]); const [f, setF] = useState({ code: '', percentOff: 10, maxUses: 0 }); const [err, setErr] = useState('');
  const [creating, setCreating] = useState(false); const [busyAction, setBusyAction] = useState('');
  const [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    return api('/admin/promos').then((d) => setItems(d.promos)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  const add = async (e) => {
    e.preventDefault(); setErr(''); setCreating(true);
    try { await api('/admin/promos', { method: 'POST', body: f }); setF({ ...f, code: '' }); load(); }
    catch (x) { setErr(x.message); }
    finally { setCreating(false); }
  };
  const updatePromo = async (promo, action) => {
    const key = `${promo._id}:${action}`;
    setBusyAction(key);
    try {
      if (action === 'toggle') await api(`/admin/promos/${promo._id}`, { method: 'PATCH', body: { active: !promo.active } });
      else await api(`/admin/promos/${promo._id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyAction('');
    }
  };
  return (
    <>
      <form className="card" onSubmit={add}>
        <h3>New promo code</h3>
        <label>Promo code<input placeholder="e.g. WELCOME10" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} required /></label>
        <div className="row">
          <label>% off<input type="number" min="1" max="100" value={f.percentOff} onChange={(e) => setF({ ...f, percentOff: e.target.value })} /></label>
          <label>Max uses (0 = unlimited)<input type="number" min="0" value={f.maxUses} onChange={(e) => setF({ ...f, maxUses: e.target.value })} /></label>
        </div>
        {err && <div className="err">{err}</div>}
        <AsyncButton loading={creating} loadingText="Creating…">Create</AsyncButton>
      </form>
      {loading && <p className="muted loading-message" role="status">Loading promo codes…</p>}
      {!loading && items.map((p) => (
        <div className="card app" key={p._id}>
          <div><b>{p.code}</b> · {p.percentOff}% off · used {p.used}{p.maxUses ? `/${p.maxUses}` : ''} {!p.active && <span className="muted">(off)</span>}</div>
          <div className="row">
            <AsyncButton className="btn small" loading={busyAction === `${p._id}:toggle`} disabled={!!busyAction} loadingText="Updating…" onClick={() => updatePromo(p, 'toggle')}>{p.active ? 'Disable' : 'Enable'}</AsyncButton>
            <AsyncButton className="btn small" loading={busyAction === `${p._id}:delete`} disabled={!!busyAction} loadingText="Deleting…" onClick={() => updatePromo(p, 'delete')}>Delete</AsyncButton>
          </div>
        </div>
      ))}
      {!loading && items.length === 0 && <EmptyState title="No promo codes yet" message="Promo codes you create will be listed here." />}
    </>
  );
}

function Jobs() {
  const [d, setD] = useState({ items: [] }); const [f, setF] = useState({ title: '', company: '', location: '', applyEmail: '', description: '', isRemote: false }); const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    return api('/admin/jobs').then(setD).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  const add = async (e) => {
    e.preventDefault(); setErr(''); setMsg(''); setAdding(true);
    try {
      await api('/admin/jobs', { method: 'POST', body: f });
      setMsg('Job added. It will be matched to users on the next run.');
      setF({ title: '', company: '', location: '', applyEmail: '', description: '', isRemote: false });
      load();
    } catch (x) { setErr(x.message); }
    finally { setAdding(false); }
  };
  return (
    <>
      <p className="muted">{d.total ?? 0} jobs stored · {d.withEmail ?? 0} have an apply email (only these can be auto-applied)</p>
      <form className="card" onSubmit={add}>
        <h3>Add a job with an apply email</h3>
        <p className="muted small-text">Found a company hiring by email (WhatsApp group, newspaper, LinkedIn post)? Add it here and matching users get applied for automatically.</p>
        <label>Job title<input placeholder="e.g. Product Designer" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></label>
        <label>Company<input placeholder="Company name" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></label>
        <label>Location<input placeholder="e.g. Lagos" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></label>
        <label>Apply email<input type="email" placeholder="hiring@example.com" value={f.applyEmail} onChange={(e) => setF({ ...f, applyEmail: e.target.value })} required /></label>
        <label>Job description / requirements<textarea rows="4" placeholder="Describe the role and requirements" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
        <label className="check"><input type="checkbox" checked={f.isRemote} onChange={(e) => setF({ ...f, isRemote: e.target.checked })} /> Remote job</label>
        {err && <div className="err">{err}</div>}{msg && <div className="ok">{msg}</div>}
        <AsyncButton loading={adding} loadingText="Adding job…">Add job</AsyncButton>
      </form>
      {loading && <p className="muted loading-message" role="status">Loading jobs…</p>}
      {!loading && d.items.length === 0 && <EmptyState title="No jobs found" message="Jobs from feeds or added by an admin will appear here." />}
      {!loading && d.items.slice(0, 20).map((j) => <div className="card small-text" key={j._id}><b>{j.title}</b> · {j.company} · {j.source} {j.applyEmail ? '📧' : ''}</div>)}
    </>
  );
}

function Blacklist() {
  const [items, setItems] = useState([]); const [c, setC] = useState('');
  const [adding, setAdding] = useState(false); const [removingId, setRemovingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    return api('/admin/blacklist').then((d) => setItems(d.items)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  const add = async (e) => {
    e.preventDefault(); setAdding(true);
    try { await api('/admin/blacklist', { method: 'POST', body: { company: c } }); setC(''); load(); }
    catch (x) { alert(x.message); }
    finally { setAdding(false); }
  };
  const remove = async (id) => {
    setRemovingId(id);
    try { await api(`/admin/blacklist/${id}`, { method: 'DELETE' }); load(); }
    catch (x) { alert(x.message); }
    finally { setRemovingId(null); }
  };
  return (
    <>
      <form className="card row" onSubmit={add}>
        <label>Company to never apply to<input placeholder="Company name" value={c} onChange={(e) => setC(e.target.value)} required /></label><AsyncButton className="btn small" loading={adding} loadingText="Adding…">Add</AsyncButton>
      </form>
      {loading && <p className="muted loading-message" role="status">Loading blacklist…</p>}
      {!loading && items.length === 0 && <EmptyState title="Blacklist is empty" message="Companies you add here will be excluded from future applications." />}
      {!loading && items.map((i) => <div className="card app" key={i._id}><span>{i.company}</span><AsyncButton className="btn small" loading={removingId === i._id} loadingText="Removing…" disabled={removingId !== null} onClick={() => remove(i._id)}>Remove</AsyncButton></div>)}
    </>
  );
}

function Announce() {
  const [f, setF] = useState({ title: '', message: '' }); const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  const [sending, setSending] = useState(false);
  const send = async (e) => {
    e.preventDefault(); setErr(''); setMsg(''); setSending(true);
    try {
      const d = await api('/admin/announce', { method: 'POST', body: f });
      setMsg(`Sent to ${d.sent} users`);
      setF({ title: '', message: '' });
    } catch (x) { setErr(x.message); }
    finally { setSending(false); }
  };
  return (
    <form className="card" onSubmit={send}>
      <h3>Announcement to all users</h3>
      <label>Title<input placeholder="Announcement title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></label>
      <label>Message<textarea rows="4" placeholder="Write your announcement" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} required /></label>
      {err && <div className="err">{err}</div>}{msg && <div className="ok">{msg}</div>}
      <AsyncButton loading={sending} loadingText="Sending…">Send</AsyncButton>
    </form>
  );
}

const VIEWS = { Overview, Users, Applications, Payments, Plans, Settings: SettingsTab, Promos, Jobs, Blacklist, Announce };

export default function Admin() {
  const { me } = useMe();
  const nav = useNavigate();
  const [tab, setTab] = useState('Overview');
  if (!getToken()) return <Navigate to="/admin/login" replace />;
  if (!me) return <div className="center">Loading…</div>;
  if (me.user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  const View = VIEWS[tab];
  return (
    <div className="admin">
      <header className="top admin-top"><b className="brand-mark">{APP_NAME}<span> Admin</span></b><div className="admin-top-actions"><ThemeToggle /><button className="link logout-link" onClick={() => { setToken(null); nav('/admin/login'); }}>Log out</button></div></header>
      <div className="admin-layout">
        <nav className="admin-nav" aria-label="Admin sections">{TABS.map((t) => <button key={t} className={'admin-nav-item' + (tab === t ? ' on' : '')} aria-current={tab === t ? 'page' : undefined} onClick={() => setTab(t)}>{t}</button>)}</nav>
        <main className="page wide admin-content"><header className="page-heading"><span className="eyebrow">APPLYLY CONTROL CENTER</span><h1>{tab}</h1></header><View /></main>
      </div>
    </div>
  );
}
