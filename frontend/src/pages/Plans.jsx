import React, { useEffect, useState } from 'react';
import { api, naira } from '../api.js';
import { useMe } from '../App.jsx';
import EmptyState from '../components/EmptyState.jsx';
import AsyncButton from '../components/AsyncButton.jsx';

export default function Plans() {
  const { me } = useMe();
  const [tab, setTab] = useState('plans');
  const [plans, setPlans] = useState([]);
  const [packs, setPacks] = useState([]);
  const [promo, setPromo] = useState('');
  const [off, setOff] = useState(0);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [checking, setChecking] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dailyCap, setDailyCap] = useState(0);

  useEffect(() => {
    Promise.all([api('/plans'), api('/packs')])
      .then(([p, k]) => { setPlans(p.plans); setPacks(k.packs); setDailyCap(k.creditDailyCap); })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  const bestValueId = plans.reduce((best, plan) => (
    !best || plan.price / plan.durationDays < best.price / best.durationDays ? plan : best
  ), null)?._id;
  const bestPackId = packs.reduce((best, pack) => (!best || pack.price / pack.credits < best.price / best.credits ? pack : best), null)?._id;

  async function check() {
    setErr(''); setOff(0);
    setChecking(true);
    try { setOff((await api('/promo/check', { method: 'POST', body: { code: promo } })).percentOff); } catch (e) { setErr(e.message); } finally { setChecking(false); }
  }
  async function pay(kind, id) {
    setErr(''); setMsg('');
    setPayingId(id);
    try {
      const d = await api('/payments/init', { method: 'POST', body: { [kind === 'plan' ? 'planId' : 'packId']: id, promoCode: off ? promo : undefined } });
      if (d.free) { setMsg('Activated!'); return; }
      window.location.href = d.url;
    } catch (e) { setErr(e.message); } finally { setPayingId(null); }
  }

  const price = (p) => naira(Math.round(p.price * (1 - off / 100)));

  return (
    <>
      <header className="page-heading">
        <span className="eyebrow">SIMPLE, FLEXIBLE PRICING</span>
        <h1>Plans &amp; credits</h1>
        <p className="muted">Pick a plan for steady daily applications, or buy credits and pay only for what is sent. You have <b>{me.stats.credits}</b> credit{me.stats.credits === 1 ? '' : 's'} now.</p>
      </header>

      <div className="segmented" role="tablist" aria-label="Choose how to pay">
        <button role="tab" aria-selected={tab === 'plans'} className={tab === 'plans' ? 'on' : ''} onClick={() => setTab('plans')}>Plans <small>by the day</small></button>
        <button role="tab" aria-selected={tab === 'credits'} className={tab === 'credits' ? 'on' : ''} onClick={() => setTab('credits')}>Credits <small>pay as you go</small></button>
      </div>

      <div className="card row promo-card">
        <label>Promo code<input placeholder="Enter code" value={promo} onChange={(e) => setPromo(e.target.value)} /></label>
        <AsyncButton className="btn small" loading={checking} loadingText="Checking…" disabled={payingId !== null || !promo} onClick={check}>Apply</AsyncButton>
      </div>
      {off > 0 && <div className="ok">{off}% off applied</div>}
      {msg && <div className="ok">{msg}</div>}
      {err && <div className="err">{err}</div>}
      {loading && <p className="muted loading-message" role="status">Loading…</p>}

      {!loading && tab === 'plans' && (
        <>
          <p className="muted small-text">A plan covers every application we send during its dates, up to your daily limit. Longer plans cost less per day. Plans do not renew by themselves.</p>
          {plans.length === 0 && <EmptyState title="No plans available yet" message="Check back soon, or buy credits instead." />}
          <div className="price-grid">
            {plans.map((p) => (
              <div className={'card pricing-card' + (p._id === bestValueId ? ' featured-plan' : '')} key={p._id}>
                <div className="pricing-top">
                  {p._id === bestValueId && <span className="plan-featured-label">Best value</span>}
                  <h3>{p.name}</h3>
                  <p className="muted">{p.applicationsPerDay} applications/day · {p.durationDays} day{p.durationDays > 1 ? 's' : ''}</p>
                  {p.description && <p className="small-text muted">{p.description}</p>}
                </div>
                <div className="pricing-bottom">
                  {off > 0 && <s className="muted">{naira(p.price)}</s>}
                  <b className="plan-price">{price(p)}</b>
                  <span className="muted small-text">{naira(Math.round(p.price / p.durationDays))} per day</span>
                  <AsyncButton loading={payingId === p._id} disabled={checking || (payingId !== null && payingId !== p._id)} loadingText="Processing…" onClick={() => pay('plan', p._id)}>Choose plan</AsyncButton>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && tab === 'credits' && (
        <>
          <p className="muted small-text">1 credit = 1 application sent. Credits never expire. If an application fails or the job needs manual apply, it costs nothing.{dailyCap ? ` Without a plan, up to ${dailyCap} applications are sent per day.` : ''}</p>
          {packs.length === 0 && <EmptyState title="No credit packs yet" message="Check back soon, or choose a plan instead." />}
          <div className="price-grid">
            {packs.map((p) => (
              <div className={'card pricing-card' + (p._id === bestPackId && packs.length > 1 ? ' featured-plan' : '')} key={p._id}>
                <div className="pricing-top">
                  {p._id === bestPackId && packs.length > 1 && <span className="plan-featured-label">Lowest price each</span>}
                  <h3>{p.name}</h3>
                  <p className="muted">{p.credits} application credits</p>
                </div>
                <div className="pricing-bottom">
                  {off > 0 && <s className="muted">{naira(p.price)}</s>}
                  <b className="plan-price">{price(p)}</b>
                  <span className="muted small-text">{naira(Math.round(p.price / p.credits))} per application</span>
                  <AsyncButton loading={payingId === p._id} disabled={checking || (payingId !== null && payingId !== p._id)} loadingText="Processing…" onClick={() => pay('pack', p._id)}>Buy credits</AsyncButton>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
