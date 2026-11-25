import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { COMPANY_NAME, SITE_URL } from '../api.js';
import { ThemeToggle } from '../Theme.jsx';

export function usePublicPageMeta(title, description, path) {
  useEffect(() => {
    const previousTitle = document.title;
    const descriptionMeta = document.querySelector('meta[name="description"]');
    const previousDescription = descriptionMeta?.getAttribute('content');
    let canonical = document.querySelector('link[rel="canonical"]');
    const createdCanonical = !canonical;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    const previousCanonical = canonical.href;

    document.title = title === COMPANY_NAME ? COMPANY_NAME : `${title} | ${COMPANY_NAME}`;
    descriptionMeta?.setAttribute('content', description);
    canonical.href = `${SITE_URL}${path}`;

    return () => {
      document.title = previousTitle;
      if (previousDescription !== null && descriptionMeta) {
        descriptionMeta.setAttribute('content', previousDescription);
      }
      if (createdCanonical) canonical.remove();
      else canonical.href = previousCanonical;
    };
  }, [title, description, path]);
}

export default function PublicLayout({ children }) {
  return (
    <div className="public-site">
      <header className="public-header">
        <div className="public-header-inner">
          <Link className="public-logo" to="/" aria-label={`${COMPANY_NAME} home`}>
            <span className="brand-mark">{COMPANY_NAME}</span>
          </Link>
          <ThemeToggle />
          <nav className="public-header-actions" aria-label="Account">
            <Link className="btn ghost-btn public-login" to="/login">Log in</Link>
            <Link className="btn public-get-started" to="/register">Get started</Link>
          </nav>
        </div>
      </header>
      <main className="public-main">{children}</main>
      <footer className="public-footer">
        <div className="public-footer-inner">
          <div className="public-footer-top">
            <Link className="public-logo" to="/" aria-label={`${COMPANY_NAME} home`}>
              <span className="brand-mark">{COMPANY_NAME}</span>
            </Link>
            <nav className="public-footer-links" aria-label="Legal and support">
              <Link to="/privacy">Privacy</Link>
              <Link to="/terms">Terms</Link>
              <Link to="/contact">Contact</Link>
            </nav>
          </div>
          <div className="public-footer-bottom">
            <p>© {new Date().getFullYear()} {COMPANY_NAME}. All rights reserved.</p>
            <p>Powered by job feeds from Remotive, RemoteOK, Jooble and Adzuna</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
