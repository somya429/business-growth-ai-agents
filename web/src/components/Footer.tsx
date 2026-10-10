import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export const Footer: React.FC = () => {
  const { pathname } = useLocation();
  const isLanding = pathname === '/' || pathname === '/home';

  return (
    <footer className="site-footer mt-auto border-t border-[var(--ink)] bg-[var(--paper)] py-6 text-[var(--ink-deep)]">
      <div className="wrap max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="logo">
            VERITY
          </Link>
          <small className="text-xs text-[var(--ink-2)]">
            Autonomous growth fleet with factual grounding & human sign-off gates.
          </small>
        </div>

        {isLanding ? (
          <nav aria-label="Landing Footer links" className="flex items-center gap-6 text-sm font-semibold text-[var(--ink)]">
            <a href="#how" className="hover:text-[var(--accent)] transition-colors">How it works</a>
            <a href="#team" className="hover:text-[var(--accent)] transition-colors">AI Team</a>
            <Link to="/onboard" className="btn solid small">Start for free →</Link>
          </nav>
        ) : (
          <nav aria-label="Footer links" className="flex items-center gap-5 text-xs font-semibold text-[var(--ink-2)] flex-wrap">
            <Link to="/command" className="hover:text-[var(--accent)]">Apex Command</Link>
            <Link to="/orchestrator" className="hover:text-[var(--accent)]">Mission Control</Link>
            <Link to="/review" className="hover:text-[var(--accent)]">Clearance Desk</Link>
            <Link to="/roster" className="hover:text-[var(--accent)]">Fleet Roster</Link>
            <Link to="/onboard" className="hover:text-[var(--accent)]">Company ICP</Link>
          </nav>
        )}

        <small className="text-xs text-[var(--ink-2)]">© Verity • Nothing is sent until you approve.</small>
      </div>
    </footer>
  );
};

export default Footer;
