import React from 'react';
import { COMPANY_NAME, SUPPORT_EMAIL } from '../api.js';
import { usePublicPageMeta } from './PublicLayout.jsx';

export default function Contact() {
  usePublicPageMeta(
    'Contact',
    `Contact ${COMPANY_NAME} support for help with your account, applications, or privacy requests.`,
    '/contact',
  );

  return (
    <section className="contact-page">
      <span className="eyebrow">WE’RE HERE TO HELP</span>
      <h1>Contact {COMPANY_NAME}</h1>
      <p className="muted">For account support, payment questions, or privacy requests, send us an email.</p>
      <a className="contact-email" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
    </section>
  );
}
