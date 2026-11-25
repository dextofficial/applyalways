import React from 'react';
import { COMPANY_NAME, LAST_UPDATED, SUPPORT_EMAIL } from '../api.js';
import { usePublicPageMeta } from './PublicLayout.jsx';

export default function Privacy() {
  usePublicPageMeta(
    'Privacy Policy',
    `Learn how ${COMPANY_NAME} collects, uses, shares, and protects personal information and Google user data.`,
    '/privacy',
  );

  return (
    <article className="legal-document">
      <header className="legal-heading">
        <span className="eyebrow">YOUR DATA, EXPLAINED</span>
        <h1>Privacy Policy</h1>
        <p className="muted">Last updated: {LAST_UPDATED}</p>
        <p>This policy explains how {COMPANY_NAME} handles information when you use our job-application service.</p>
      </header>

      <section>
        <h2>1. Who we are</h2>
        <p>{COMPANY_NAME} (“Applyly”, “we”, “us”, or “our”) is a service that helps users find relevant job opportunities and sends job applications that users request. For privacy questions or data requests, contact us at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
      </section>

      <section>
        <h2>2. Information we collect</h2>
        <p>Depending on how you use Applyly, we collect and process:</p>
        <ul>
          <li>Your name, email address, phone number, and nationality.</li>
          <li>Your password, stored in hashed form rather than as readable text.</li>
          <li>Your CV file and text extracted from that file so we can match roles and prepare applications.</li>
          <li>Your job preferences, including role titles, skills, locations, work modes, experience, and salary expectations.</li>
          <li>Payment records, such as plan, amount, payment reference, and status. Paystack processes payments; we do not store card details.</li>
          <li>Your application history and the cover letters we generate for applications.</li>
        </ul>
      </section>

      <section>
        <h2>3. Google user data and Gmail permission</h2>
        <p>When you connect Google, we request only the Gmail <code>gmail.send</code> permission and your Google account email address. We use this permission solely to send job applications you asked us to send, from your own email address, with your CV attached.</p>
        <p>We do not read, store, search, or analyse your inbox or emails. We store the Google refresh token encrypted using AES-256 so Applyly can send applications on your behalf until you disconnect access or revoke it.</p>
        <h3>Limited Use</h3>
        <p className="limited-use-quote">Applyly's use and transfer of information received from Google APIs to any other app will adhere to the Google API Services User Data Policy, including the Limited Use requirements.</p>
      </section>

      <section>
        <h2>4. How we use information</h2>
        <p>We use information to match jobs to your preferences, generate cover letters, send applications you request, process and reconcile payments, operate your account, and respond to support requests.</p>
      </section>

      <section>
        <h2>5. Services that process or receive information</h2>
        <p>We share only the information needed for the following services to perform their role:</p>
        <ul>
          <li><b>Google Gemini</b> helps generate cover letters using your CV and job details.</li>
          <li><b>Cloudinary</b> stores CV files.</li>
          <li><b>MongoDB Atlas</b> stores account, profile, and application data.</li>
          <li><b>Paystack</b> processes payments and payment records.</li>
          <li><b>Render and Vercel</b> provide application hosting and related infrastructure.</li>
          <li><b>Employers</b> receive the CV, cover letter, and application information needed for the specific job application you asked us to send.</li>
        </ul>
        <p>We do not sell personal data.</p>
      </section>

      <section>
        <h2>6. Retention and deletion</h2>
        <p>You can disconnect Gmail at any time in the app. You can also revoke Applyly’s Google access at <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">myaccount.google.com/permissions</a>. To request deletion of your account and associated data, email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We delete requested account data within 30 days, subject to records we must retain by law.</p>
      </section>

      <section>
        <h2>7. Security</h2>
        <p>We use safeguards intended to protect information, including hashed passwords and AES-256 encryption for Google refresh tokens, and limit data use to operating the service. No online service can guarantee absolute security. If you believe your account or information may be at risk, contact us promptly.</p>
      </section>

      <section>
        <h2>8. Children</h2>
        <p>Applyly is for people aged 18 and over. We do not knowingly collect personal information from children under 18.</p>
      </section>

      <section>
        <h2>9. International transfers</h2>
        <p>Our service providers may process information in countries other than the country where you live. Where information is transferred internationally, we take steps intended to protect it and require service providers to handle it appropriately.</p>
      </section>

      <section>
        <h2>10. Privacy rights and legal compliance</h2>
        <p>We handle personal information in accordance with applicable requirements of the Nigeria Data Protection Act (NDPA, previously referred to as NDPR) and, where applicable, the GDPR. Depending on your location, you may have the right to access, correct, or request deletion of your personal information, or object to certain processing. Contact <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> to exercise these rights.</p>
      </section>

      <section>
        <h2>11. Changes to this policy</h2>
        <p>We may update this policy as the service changes. We will update the date at the top and provide notice in the app or by email when a change is material.</p>
      </section>

      <section>
        <h2>12. Contact</h2>
        <p>For privacy questions or requests, contact {COMPANY_NAME} at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
      </section>
    </article>
  );
}
