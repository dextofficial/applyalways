import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, naira, COMPANY_NAME, SUPPORT_EMAIL } from '../api.js';
import { usePublicPageMeta } from './PublicLayout.jsx';

const STEPS = [
  ['01', 'Upload your CV and preferences', 'Tell us about your experience, the roles you want, and where you would like to work.'],
  ['02', 'Start free, then choose', 'Try it with free applications. Then pick a daily plan, or buy credits and pay only for what is sent.'],
  ['03', 'Connect your Gmail', 'Authorize Applyly to send applications you request from your own email address.'],
  ['04', 'We apply for you', 'We send tailored applications and replies come directly to your inbox.'],
];

const FEATURES = [
  ['Tailored cover letters', 'Each application includes a cover letter prepared for the role and your experience.'],
  ['Work your way', 'Set your preferences for remote, hybrid, or on-site opportunities.'],
  ['Any currency', 'Set your minimum salary expectations in the currency that works for you.'],
  ['See every letter sent', 'Review your sent applications and the cover letters created for them.'],
  ['Interview preparation', 'For jobs we applied to, get likely questions and talking points based on your CV.'],
  ['Skip companies', 'List your current employer or any company you never want to apply to.'],
];

function LivePricing() {
  const [data, setData] = useState({ plans: [], packs: [], trial: 0 });
  useEffect(() => {
    Promise.all([api('/plans'), api('/packs')])
      .then(([p, k]) => setData({ plans: p.plans.slice(0, 3), packs: k.packs.slice(0, 3), trial: k.freeTrialCredits }))
      .catch(() => {});
  }, []);
  if (!data.plans.length && !data.packs.length) return null;
  return (
    <section className="landing-section" id="pricing">
      <div className="landing-section-heading">
        <span className="eyebrow">PRICES IN NAIRA</span>
        <h2>Pay by the day, or pay per application</h2>
        <p className="muted">No contract. Plans do not renew by themselves.{data.trial ? ` New accounts get ${data.trial} free applications.` : ''}</p>
      </div>
      <div className="price-grid">
        {data.plans.map((p) => (
          <div className="card pricing-card" key={p._id}>
            <div className="pricing-top"><h3>{p.name}</h3><p className="muted">{p.applicationsPerDay} applications/day · {p.durationDays} day{p.durationDays > 1 ? 's' : ''}</p></div>
            <div className="pricing-bottom"><b className="plan-price">{naira(p.price)}</b><span className="muted small-text">{naira(Math.round(p.price / p.durationDays))} per day</span></div>
          </div>
        ))}
        {data.packs.map((p) => (
          <div className="card pricing-card" key={p._id}>
            <div className="pricing-top"><span className="plan-featured-label">Credits</span><h3>{p.name}</h3><p className="muted">Pay only for applications sent. Never expire.</p></div>
            <div className="pricing-bottom"><b className="plan-price">{naira(p.price)}</b><span className="muted small-text">{naira(Math.round(p.price / p.credits))} per application</span></div>
          </div>
        ))}
      </div>
      <div><Link className="btn" to="/register">Start free <ArrowIcon /></Link></div>
    </section>
  );
}

function ArrowIcon() {
  return <span aria-hidden="true">↗</span>;
}

export default function Landing() {
  usePublicPageMeta(
    COMPANY_NAME,
    'Applyly sends job applications you request, with tailored cover letters from your own Gmail. Job and interview outcomes are not guaranteed.',
    '/',
  );

  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="eyebrow">A MORE FOCUSED JOB SEARCH</span>
          <h1>Make your next move, without sending every application yourself.</h1>
          <p className="landing-lead">
            Applyly matches your preferences with job opportunities and sends applications you request, with a tailored cover letter from your own Gmail.
          </p>
          <div className="landing-hero-actions">
            <Link className="btn" to="/register">Start free <ArrowIcon /></Link>
            <a className="btn ghost-btn" href="#how-it-works">See how it works</a>
          </div>
          <p className="landing-disclaimer">We send applications on your behalf. Jobs, interviews, and replies are not guaranteed.</p>
        </div>
        <div className="landing-hero-visual" aria-label="Your job search, organized">
          <div className="hero-visual-orbit orbit-one" />
          <div className="hero-visual-orbit orbit-two" />
          <div className="hero-mini-card hero-mini-top"><span className="hero-check">✓</span><span><b>Application sent</b><small>Tailored to your profile</small></span></div>
          <div className="hero-visual-card">
            <div className="hero-visual-heading"><span className="hero-avatar">A</span><span><b>Your applications</b><small>Made for your next move</small></span></div>
            <div className="hero-progress"><span /></div>
            <div className="hero-visual-meta"><span>Personalized</span><b>On your terms</b></div>
            <div className="hero-letter-lines"><i /><i /><i /><i /></div>
          </div>
          <div className="hero-mini-card hero-mini-bottom"><span className="hero-mail-icon">@</span><span><b>Your Gmail</b><small>Replies stay in your inbox</small></span></div>
        </div>
      </section>

      <section className="landing-permission" aria-label="Why Applyly requests Gmail access">
        <span className="permission-icon" aria-hidden="true">@</span>
        <p><b>Why connect Gmail?</b> We ask for permission to send job applications you requested, from your own email address. We do not read your inbox.</p>
      </section>

      <section className="landing-section" id="how-it-works">
        <div className="landing-section-heading">
          <span className="eyebrow">A SIMPLE FOUR-STEP FLOW</span>
          <h2>How it works</h2>
          <p className="muted">You choose what you are looking for. Applyly helps with the sending.</p>
        </div>
        <ol className="steps-grid">
          {STEPS.map(([number, title, copy]) => (
            <li className="landing-step card" key={number}>
              <span className="landing-step-number">{number}</span>
              <h3>{title}</h3>
              <p className="muted">{copy}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-section landing-features-section">
        <div className="landing-section-heading">
          <span className="eyebrow">DESIGNED AROUND YOUR SEARCH</span>
          <h2>More control, less repetitive work</h2>
          <p className="muted">Set your preferences and stay informed about what gets sent.</p>
        </div>
        <div className="features-grid">
          {FEATURES.map(([title, copy], index) => (
            <article className="card landing-feature" key={title}>
              <span className="feature-icon" aria-hidden="true">{['✳', '⌖', '◎', '↗', '?', '⊘'][index]}</span>
              <h3>{title}</h3>
              <p className="muted">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <LivePricing />

      <section className="landing-section landing-faq">
        <div className="landing-section-heading">
          <span className="eyebrow">GOOD TO KNOW</span>
          <h2>Frequently asked questions</h2>
        </div>
        <div className="faq-list">
          <details className="faq-item">
            <summary>Does Applyly guarantee jobs or interviews?</summary>
            <p>No. Applyly sends applications you request, but employers decide who they respond to and hire. Jobs, interviews, and replies are not guaranteed.</p>
          </details>
          <details className="faq-item">
            <summary>What is a credit?</summary>
            <p>One credit pays for one application we send. If an application fails, or the job can only be applied to on its own website, it costs nothing. Credits never expire. You can also choose a daily plan instead.</p>
          </details>
          <details className="faq-item">
            <summary>Can I stop anytime?</summary>
            <p>Yes. You can pause autopilot in your dashboard and disconnect Gmail from your account whenever you choose.</p>
          </details>
          <details className="faq-item">
            <summary>What is sent from my Gmail?</summary>
            <p>Your CV and a cover letter prepared for the role are sent with the job application. We use Gmail permission only to send applications you asked us to send; we do not read your inbox.</p>
          </details>
        </div>
      </section>

      <section className="landing-final-cta">
        <span className="eyebrow">YOUR NEXT STEP STARTS HERE</span>
        <h2>Put the repetitive part of your job search on autopilot.</h2>
        <p>Applyly sends applications you request. Outcomes are always up to the employer.</p>
        <Link className="btn" to="/register">Get started <ArrowIcon /></Link>
        <small>Questions? <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></small>
      </section>
    </div>
  );
}
