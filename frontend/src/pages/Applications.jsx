import React, { useEffect, useState } from 'react';
import { api, dateTime } from '../api.js';

const TABS = [['sent', 'Sent'], ['manual', 'Apply manually'], ['failed', 'Failed']];

export default function Applications() {
  const [tab, setTab] = useState('sent');
  const [data, setData] = useState({ items: [], pages: 1 });
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);

  useEffect(() => { api(`/applications?status=${tab}&page=${page}`).then(setData); }, [tab, page]);
  const view = async (id) => setOpen((await api(`/applications/${id}`)).application);

  return (
    <>
      <div className="chips application-tabs" role="tablist" aria-label="Application status">
        {TABS.map(([k, l]) => <button key={k} className={'chip' + (tab === k ? ' on' : '')} onClick={() => { setTab(k); setPage(1); }}>{l}</button>)}
      </div>
      {tab === 'manual' && <p className="muted small-text">These jobs match you, but only accept applications through their website. Tap to open them.</p>}
      {data.items.length === 0 && <div className="card empty-state"><span className="empty-icon" aria-hidden="true">↗</span><h3>Nothing here yet</h3><p className="muted">Your applications will appear here as your search gets underway.</p></div>}
      {data.items.map((a) => (
        <div className="card app" key={a._id}>
          <div className="company-avatar" aria-hidden="true">{(a.company || 'C').charAt(0).toUpperCase()}</div>
          <div className="app-details">
            <b>{a.title}</b>
            <div className="muted small-text">{a.company || 'Company not listed'} · {a.location || 'Location not listed'}</div>
            <div className="muted small-text">{dateTime(a.createdAt)}{a.toEmail ? ` · to ${a.toEmail}` : ''}</div>
            {a.error && <div className="err small-text">{a.error}</div>}
          </div>
          <span className={'badge badge-' + a.status}>{a.status === 'manual' ? 'Manual' : a.status === 'failed' ? 'Failed' : 'Sent'}</span>
          {a.status === 'sent' && <button className="btn small" onClick={() => view(a._id)}>Letter</button>}
          {a.status === 'manual' && a.applyUrl && <a className="btn small" href={a.applyUrl} target="_blank" rel="noreferrer">Open</a>}
        </div>
      ))}
      {data.pages > 1 && (
        <div className="row">
          <button className="btn small" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
          <span className="muted">Page {page} / {data.pages}</span>
          <button className="btn small" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
      {open && (
        <div className="modal" onClick={() => setOpen(null)}>
          <div className="card letter-modal" role="dialog" aria-modal="true" aria-labelledby="letter-title" onClick={(e) => e.stopPropagation()}>
            <div className="section-heading"><h2 id="letter-title">{open.title}</h2><button className="link modal-close" aria-label="Close letter" onClick={() => setOpen(null)}>×</button></div>
            <p className="muted small-text">To: {open.toEmail}<br />Subject: {open.subject}</p>
            <pre className="letter">{open.body}</pre>
            <button className="btn" onClick={() => setOpen(null)}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}
