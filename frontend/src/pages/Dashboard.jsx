import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, dateTime } from '../api.js';
import { useMe } from '../App.jsx';
import AsyncButton from '../components/AsyncButton.jsx';

export default function Dashboard() {
  const { me, refresh } = useMe();
  const [params] = useSearchParams();
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const { user, stats } = me;
  const sub = user.subscription || {};
  const g = params.get('gmail');

  useEffect(() => { refresh(); }, []); // eslint-disable-line

  async function connectGmail() {
    setBusyAction('gmail');
    setErr('');
    try {
      const { url } = await api('/gmail/auth-url');
      window.location.href = url;
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyAction('');
    }
  }
  async function toggle() {
    setBusyAction('autopilot');
    setErr('');
    try {
      await api('/profile/automation', { method: 'POST', body: { enabled: !user.automationEnabled } });
      await refresh();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyAction('');
    }
  }
  async function disconnectGmail() {
    setBusyAction('disconnect');
    setErr('');
    try {
      await api('/gmail/disconnect', { method: 'POST' });
      setMsg('Gmail disconnected');
      await refresh();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyAction('');
    }
  }

  const steps = [
    { done: !!user.cv?.url, text: 'Upload your CV', to: '/profile' },
    { done: (user.profile?.desiredTitles || []).length > 0, text: 'Set the jobs you want', to: '/profile' },
    { done: user.gmail?.connected, text: 'Connect your Gmail', action: connectGmail },
    { done: stats.active, text: 'Choose a plan', to: '/plans' },
  ];
  const ready = steps.every((s) => s.done);

  return (
    <>
      {g === 'connected' && <div className="ok">Gmail connected.</div>}
      {g && g !== 'connected' && <div className="err">Gmail connection failed ({g}). Please try again.</div>}
      {msg && <div className="ok">{msg}</div>}
      {err && <div className="err">{err}</div>}

      <header className="welcome-header">
        <span className="eyebrow">YOUR JOB SEARCH, SIMPLIFIED</span>
        <h1>Hello, {user.name.split(' ')[0]}</h1>
        <p className="muted">Here’s your application activity at a glance.</p>
      </header>

      <div className="card dashboard-plan">
        <div className="section-heading">
          <div><span className="eyebrow">YOUR PLAN</span><h2>{stats.active ? sub.planName : 'Ready when you are'}</h2></div>
          {stats.active && <span className="badge badge-active">Active</span>}
        </div>
        {stats.active ? (
          <p className="muted">Up to {stats.dailyLimit} applications per day · ends {dateTime(sub.expiresAt)}</p>
        ) : (
          <p className="muted">No active plan. Applications are paused until you pay.</p>
        )}
        {stats.active && <div className="limit-wrap">
          <div className="limit-label"><span>Daily applications</span><b>{stats.sentToday} / {stats.dailyLimit}</b></div>
          <div className="limit-track" role="progressbar" aria-valuenow={stats.sentToday} aria-valuemin="0" aria-valuemax={stats.dailyLimit}>
            <span style={{ width: `${Math.min(100, stats.dailyLimit ? (stats.sentToday / stats.dailyLimit) * 100 : 0)}%` }} />
          </div>
        </div>}
        <div className="stats">
          <div className="stat-tile"><b>{stats.sentToday}</b><span>Today</span></div>
          <div className="stat-tile"><b>{stats.totalSent}</b><span>Total sent</span></div>
          <div className="stat-tile"><b>{stats.manualCount}</b><span>To apply manually</span></div>
        </div>
      </div>

      {!ready && (
        <div className="card checklist-card">
          <div><span className="eyebrow">A FEW QUICK STEPS</span><h2>Get started</h2></div>
          {steps.map((s) => (
            <div key={s.text} className="step">
              <span className={'step-check' + (s.done ? ' complete' : '')} aria-hidden="true">{s.done ? '✓' : ''}</span>
              <span className="step-label">{s.text}</span>
              {!s.done && (s.to ? <Link className="btn small" to={s.to}>Go</Link> : <AsyncButton className="btn small" loading={busyAction === 'gmail'} loadingText="Connecting…" onClick={s.action}>Connect</AsyncButton>)}
            </div>
          ))}
        </div>
      )}

      {ready && (
        <div className="card autopilot-card">
          <div className="autopilot-copy">
            <span className="eyebrow">APPLICATION AUTOMATION</span>
            <h2>Autopilot is {user.automationEnabled ? 'ON' : 'PAUSED'}</h2>
          </div>
          <p className="muted">We apply in small batches through the day from <b>{user.gmail.email}</b>. Replies from companies land in that Gmail inbox. Check it, and respond.</p>
          <button className={'toggle-control' + (user.automationEnabled ? ' is-on' : '')} role="switch" aria-checked={user.automationEnabled} aria-label="Toggle autopilot" aria-busy={busyAction === 'autopilot'} disabled={busyAction !== ''} onClick={toggle}><span /></button>
          <AsyncButton className="btn secondary-btn" loading={busyAction === 'autopilot'} loadingText="Updating…" disabled={busyAction !== '' && busyAction !== 'autopilot'} onClick={toggle}>{user.automationEnabled ? 'Pause autopilot' : 'Resume autopilot'}</AsyncButton>
        </div>
      )}

      {user.gmail?.connected && (
        <p className="muted small-text">Gmail: {user.gmail.email} · <AsyncButton className="link" loading={busyAction === 'gmail'} loadingText="Connecting…" disabled={busyAction !== '' && busyAction !== 'gmail'} onClick={connectGmail}>Reconnect</AsyncButton> · <AsyncButton className="link" loading={busyAction === 'disconnect'} loadingText="Disconnecting…" disabled={busyAction !== '' && busyAction !== 'disconnect'} onClick={disconnectGmail}>Disconnect</AsyncButton></p>
      )}
      <p className="muted small-text">We send applications for you; we cannot promise interviews or jobs.</p>
    </>
  );
}
