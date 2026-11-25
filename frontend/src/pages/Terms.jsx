import React from 'react';
import { COMPANY_NAME, LAST_UPDATED, SUPPORT_EMAIL } from '../api.js';
import { usePublicPageMeta } from './PublicLayout.jsx';

export default function Terms() {
  usePublicPageMeta(
    'Terms of Service',
    `Read the terms that apply when you use ${COMPANY_NAME} to prepare and send job applications.`,
    '/terms',
  );

  return (
    <article className="legal-document">
      <header className="legal-heading">
        <span className="eyebrow">PLEASE READ BEFORE USING APPLYLY</span>
        <h1>Terms of Service</h1>
        <p className="muted">Last updated: {LAST_UPDATED}</p>
        <p>These terms explain the rules for using {COMPANY_NAME}. By creating an account or using the service, you agree to them.</p>
      </header>

      <section>
        <h2>1. What the service does</h2>
        <p>{COMPANY_NAME} helps match your profile and preferences with job opportunities, prepares cover letters, and sends job applications you ask us to send. Applications are sent from your connected Gmail account with your CV attached.</p>
      </section>

      <section>
        <h2>2. No promise of results</h2>
        <p>We do not guarantee jobs, interviews, employer replies, or any particular outcome. Employers make their own decisions about applications, hiring, and communication.</p>
      </section>

      <section>
        <h2>3. Your responsibilities and permission to send</h2>
        <ul>
          <li>Provide accurate, current information and a CV you are entitled to use.</li>
          <li>Use Applyly only for lawful purposes and only for applications you genuinely want to make.</li>
          <li>Use and connect a Gmail account that you own or are authorized to control.</li>
          <li>Review your profile and preferences, and keep your sign-in details secure.</li>
        </ul>
        <p>When you enable application sending and connect Gmail, you authorize us to send the applications you request from your Gmail account. You can pause automation or disconnect Gmail at any time. You remain responsible for the accuracy of your application materials.</p>
      </section>

      <section>
        <h2>4. Plans and payments</h2>
        <p>Plans describe the application limits and duration shown at checkout. Payments are processed by Paystack. Plans do not automatically renew; a new payment is required to start another plan.</p>
        <p>If you paid but no applications were sent, contact <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> within 48 hours of payment and include your payment reference. We will review the account and payment records and advise you about any applicable refund. Refunds, when approved, are processed through Paystack and remain subject to applicable law.</p>
      </section>

      <section>
        <h2>5. Acceptable use and suspension</h2>
        <p>You must not use Applyly to send misleading, unlawful, abusive, or unauthorized applications, or to violate another person’s rights or an employer’s application rules. We may pause or suspend access if we reasonably believe an account is being misused, creates a security risk, or violates these terms or applicable law.</p>
      </section>

      <section>
        <h2>6. Third-party sites and employers</h2>
        <p>Job feeds, employer websites, and external services are operated by third parties. We do not control their availability, content, hiring processes, decisions, or privacy practices. You are responsible for reviewing an employer’s requirements and any linked third-party terms before proceeding.</p>
      </section>

      <section>
        <h2>7. Limitation of liability</h2>
        <p>To the extent permitted by law, Applyly is provided without a promise that it will be uninterrupted or error-free. We are not responsible for an employer’s decisions, missed opportunities, third-party service interruptions, or outcomes from applications. Nothing in these terms limits liability where applicable law does not allow that limitation.</p>
      </section>

      <section>
        <h2>8. Ending your use of Applyly</h2>
        <p>You can stop using Applyly at any time, pause automation, and disconnect Gmail. You may request account and data deletion by contacting support. We may suspend or terminate access for a breach of these terms or where required to protect users, the service, or comply with law.</p>
      </section>

      <section>
        <h2>9. Changes to these terms</h2>
        <p>We may update these terms as Applyly changes. We will post the revised terms with an updated date and provide notice in the app or by email when changes are material. Continued use after an update takes effect means you accept the revised terms.</p>
      </section>

      <section>
        <h2>10. Governing law</h2>
        <p>These terms are governed by the laws of the Federal Republic of Nigeria, subject to any mandatory consumer protections that apply where you live.</p>
      </section>

      <section>
        <h2>11. Contact</h2>
        <p>Questions about these terms? Contact {COMPANY_NAME} at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
      </section>
    </article>
  );
}
