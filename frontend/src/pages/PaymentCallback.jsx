import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useMe } from '../App.jsx';

export default function PaymentCallback() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { refresh } = useMe();
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    const ref = params.get('reference') || params.get('trxref');
    if (!ref) return setStatus('failed');
    api('/payments/verify', { method: 'POST', body: { reference: ref } })
      .then(async (d) => { setStatus(d.status === 'success' ? 'success' : 'failed'); await refresh(); })
      .catch(() => setStatus('failed'));
  }, []); // eslint-disable-line

  return (
    <div className="card center-text payment-result">
      <div className={'payment-icon ' + status} aria-hidden="true">{status === 'checking' ? <span className="button-spinner" /> : status === 'success' ? '✓' : '!'}</div>
      {status === 'checking' && <><span className="eyebrow">PAYMENT</span><h2>Confirming your payment…</h2></>}
      {status === 'success' && (<><span className="eyebrow">PAYMENT CONFIRMED</span><h2>Payment received</h2><p className="muted">Your plan is active. Applications start on the next run.</p><button className="btn" onClick={() => nav('/dashboard')}>Go to dashboard</button></>)}
      {status === 'failed' && (<><span className="eyebrow">PAYMENT UPDATE</span><h2>Payment not confirmed</h2><p className="muted">If money left your account, it will be confirmed automatically in a few minutes. Otherwise try again.</p><button className="btn" onClick={() => nav('/plans')}>Back to plans</button></>)}
    </div>
  );
}
