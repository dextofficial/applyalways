import React, { useState } from 'react';
import { api } from '../api.js';
import { useMe } from '../App.jsx';
import AsyncButton from '../components/AsyncButton.jsx';

const MODES = [['remote', 'Remote'], ['hybrid', 'Hybrid'], ['onsite', 'On-site']];

export default function Profile() {
  const { me, refresh } = useMe();
  const u = me.user;
  const p = u.profile || {};
  const [f, setF] = useState({
    name: u.name, nationality: u.nationality || '', country: u.country || '', phone: u.phone || '',
    desiredTitles: (p.desiredTitles || []).join(', '), skills: (p.skills || []).join(', '),
    experienceYears: p.experienceYears ?? '', workModes: p.workModes || ['remote'],
    locations: (p.locations || []).join(', '), salaryMin: p.salaryMin ?? '',
    salaryCurrency: p.salaryCurrency || 'NGN', salaryPeriod: p.salaryPeriod || 'month', summary: p.summary || '',
  });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggleMode = (m) => setF({ ...f, workModes: f.workModes.includes(m) ? f.workModes.filter((x) => x !== m) : [...f.workModes, m] });

  async function save(e) {
    e.preventDefault(); setMsg(''); setErr('');
    setSaving(true);
    try { await api('/profile', { method: 'PUT', body: f }); await refresh(); setMsg('Saved'); } catch (x) { setErr(x.message); } finally { setSaving(false); }
  }
  async function uploadCv(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true); setMsg(''); setErr('');
    try {
      const form = new FormData(); form.append('cv', file);
      await api('/profile/cv', { method: 'POST', form });
      await refresh(); setMsg('CV uploaded');
    } catch (x) { setErr(x.message); } finally { setUploading(false); }
  }

  return (
    <>
      <section className="card profile-section cv-section">
        <div><span className="eyebrow">YOUR DOCUMENTS</span><h2>Your CV</h2></div>
        <p className="muted">{u.cv?.filename ? `Current: ${u.cv.filename}` : 'No CV yet. PDF or DOCX, text-based (not a scan), max 5 MB.'}</p>
        <label className="upload-zone">
          <span className="upload-icon" aria-hidden="true">↑</span>
          <b>{uploading ? 'Uploading your CV…' : u.cv?.filename ? 'Replace your CV' : 'Choose a CV to upload'}</b>
          <span className="muted small-text">{uploading ? 'Uploading…' : 'PDF or DOCX · Text-based · Max 5 MB'}</span>
          <input type="file" accept=".pdf,.docx" onChange={uploadCv} disabled={uploading} />
        </label>
        {uploading && <p className="muted uploading-message" role="status">Uploading CV…</p>}
      </section>

      <form className="card profile-section profile-form" onSubmit={save}>
        <div className="profile-group">
        <div><span className="eyebrow">PREFERENCES</span><h2>Job preferences</h2></div>
        <label>Job titles you want <span className="muted small-text">(comma separated)</span>
          <input value={f.desiredTitles} onChange={set('desiredTitles')} placeholder="Petroleum Engineer, Process Engineer" />
        </label>
        <label>Key skills <span className="muted small-text">(comma separated)</span>
          <input value={f.skills} onChange={set('skills')} placeholder="HYSYS, project management, safety" />
        </label>
        <label>Years of experience
          <input type="number" min="0" value={f.experienceYears} onChange={set('experienceYears')} />
        </label>
        <label>Work type</label>
        <div className="chips">
          {MODES.map(([k, l]) => <button type="button" key={k} className={'chip' + (f.workModes.includes(k) ? ' on' : '')} onClick={() => toggleMode(k)}>{l}</button>)}
        </div>
        </div>
        <div className="profile-group">
        <div><span className="eyebrow">LOCATION & COMPENSATION</span><h2>Where you want to work</h2></div>
        <label>Where? Cities or countries for hybrid/on-site (comma separated)
          <input value={f.locations} onChange={set('locations')} placeholder="Abuja, Lagos" />
        </label>
        <label>Minimum salary
          <div className="row">
            <input type="number" min="0" value={f.salaryMin} onChange={set('salaryMin')} placeholder="Amount" />
            <input value={f.salaryCurrency} onChange={set('salaryCurrency')} placeholder="NGN" maxLength={5} style={{ maxWidth: 90 }} />
            <select value={f.salaryPeriod} onChange={set('salaryPeriod')}><option value="month">/ month</option><option value="year">/ year</option></select>
          </div>
        </label>
        </div>
        <div className="profile-group">
        <div><span className="eyebrow">ABOUT YOU</span><h2>Your details</h2></div>
        <label>Full name
          <input value={f.name} onChange={set('name')} />
        </label>
        <label>Phone
          <input value={f.phone} onChange={set('phone')} />
        </label>
        <label>Your nationality
          <input value={f.nationality} onChange={set('nationality')} />
        </label>
        <label>Country you live in
          <input value={f.country} onChange={set('country')} />
        </label>
        <label>Short note about you (optional)
          <textarea rows="3" value={f.summary} onChange={set('summary')} />
        </label>
        </div>
        {msg && <div className="ok">{msg}</div>}
        {err && <div className="err">{err}</div>}
        <AsyncButton loading={saving} loadingText="Saving…">Save</AsyncButton>
      </form>
    </>
  );
}
