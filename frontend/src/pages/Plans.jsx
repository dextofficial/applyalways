import React, { useEffect, useState } from 'react';
import { api, naira } from '../api.js';

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const [promo, setPromo] = useState('');
  const [off, setOff] = useState(0);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => { api('/plans').then((d) => setPlans(d.plans)); }, []);
  const bestValueId = plans.reduce((best, plan) => (
    !best || plan.price / plan.durationDays < best.price / best.durationDays ? plan : best
  ), null)?._id;

  async function check() {
    setErr(''); setOff(0);
    try { setOff((await api('/promo/check', { method: 'POST', body: { code: promo } })).percentOff); } catch (e) { setErr(e.message); }
  }
  async function pay(id) {
    setErr(''); setMsg('');
    try {
      const d = await api('/payments/init', { method: 'POST', body: { planId: id, promoCode: off ? promo : undefined } });
      if (d.free) { setMsg('Plan activated!'); return; }
      window.location.href = d.url;
    } catch (e) { setErr(e.message); }
  }

  return (
    <>
      <header className="page-heading">
        <span className="eyebrow">SIMPLE, FLEXIBLE PRICING</span>
        <h1>Choose a plan</h1>
        <p className="muted">Pay, and we start applying on the next run. Longer plans cost less per day.</p>
      </header>
      <div className="card row promo-card">
        <label>Promo code<input placeholder="Enter code" value={promo} onChange={(e) => setPromo(e.target.value)} /></label>
        <button className="btn small" onClick={check}>Apply</button>
      </div>
      {off > 0 && <div className="ok">{off}% off applied</div>}
      {msg && <div className="ok">{msg}</div>}
      {err && <div className="err">{err}</div>}
      {plans.map((p) => (
        <div className={'card plan pricing-card' + (p._id === bestValueId ? ' featured-plan' : '')} key={p._id}>
          <div>
            {p._id === bestValueId && <span className="plan-featured-label">Best value</span>}
            <h3>{p.name}</h3>
            <p className="muted">{p.applicationsPerDay} applications/day · {p.durationDays} day{p.durationDays > 1 ? 's' : ''}</p>
            {p.description && <p className="small-text">{p.description}</p>}
          </div>
          <div className="right">
            {off > 0 && <s className="muted">{naira(p.price)}</s>}
            <b className="plan-price">{naira(Math.round(p.price * (1 - off / 100)))}</b>
            <span className="muted small-text">{naira(Math.round(p.price / p.durationDays))} per day</span>
            <button className="btn" onClick={() => pay(p._id)}>Pay</button>
          </div>
        </div>
      ))}
    </>
  );
}
