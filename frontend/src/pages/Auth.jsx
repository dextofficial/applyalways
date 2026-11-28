import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, setToken, APP_NAME } from '../api.js';
import { useMe } from '../App.jsx';
import { ThemeToggle } from '../Theme.jsx';
import AsyncButton from '../components/AsyncButton.jsx';

export default function Auth({ mode, admin }) {
  const nav = useNavigate();
  const { refresh } = useMe();
  const [f, setF] = useState({ name: '', email: '', password: '', nationality: '', phone: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [trial, setTrial] = useState(0);
  useEffect(() => { if (mode === 'register') api('/packs').then((d) => setTrial(d.freeTrialCredits || 0)).catch(() => {}); }, [mode]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const d = await api(mode === 'login' ? '/auth/login' : '/auth/register', { method: 'POST', body: f });
      if (admin && d.user.role !== 'admin') throw new Error('This is not an admin account');
      setToken(d.token);
      await refresh();
      nav(d.user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  }

  return (
    <div className="auth">
      <div className="auth-theme-switch"><ThemeToggle /></div>
      <aside className="auth-brand">
        <div className="auth-brand-content">
          <span className="brand-mark">{APP_NAME}</span>
          <p className="auth-kicker">Your next opportunity, on autopilot.</p>
          <h2>Make your job search work for you.</h2>
          <p>Spend less time applying and more time getting ready for what comes next.</p>
        </div>
      </aside>
      <form className="card auth-card" onSubmit={submit}>
        <div className="auth-heading">
          <span className="brand-mark auth-mobile-brand">{APP_NAME}{admin ? ' Admin' : ''}</span>
          <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
          <p className="muted">{admin ? 'Owner dashboard sign in' : mode === 'login' ? 'Sign in to continue your job search.' : 'Your applications run on autopilot.'}</p>
        </div>
        {mode === 'register' && trial > 0 && <div className="info-alert">Free to start: you get {trial} free applications. No card needed.</div>}
        {mode === 'register' && (
          <>
            <label>Full name<input placeholder="Your full name" value={f.name} onChange={set('name')} required /></label>
            <label>Nationality / country<input placeholder="e.g. Nigeria" value={f.nationality} onChange={set('nationality')} required /></label>
            <label>Phone <span className="muted">(optional)</span><input placeholder="Your phone number" value={f.phone} onChange={set('phone')} /></label>
          </>
        )}
        <label>Email address<input type="email" placeholder="you@example.com" value={f.email} onChange={set('email')} required /></label>
        <label>Password<input type="password" placeholder="At least 8 characters" value={f.password} onChange={set('password')} required minLength={8} /></label>
        {err && <div className="err">{err}</div>}
        <AsyncButton className="btn auth-submit" loading={busy} loadingText="Please wait…">{mode === 'login' ? 'Log in' : 'Create account'}</AsyncButton>
        {!admin && (mode === 'login'
          ? <p className="muted">New here? <Link to="/register">Create an account</Link></p>
          : <p className="muted">Have an account? <Link to="/login">Log in</Link></p>)}
        {!admin && <nav className="auth-legal" aria-label="Legal">
          <Link to="/privacy">Privacy Policy</Link>
          <span aria-hidden="true">·</span>
          <Link to="/terms">Terms of Service</Link>
        </nav>}
      </form>
    </div>
  );
}
