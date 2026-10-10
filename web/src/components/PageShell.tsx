import React, { useEffect } from 'react';
import { Nav } from './Nav';
import { Footer } from './Footer';
import { ErrorBoundary } from './ErrorBoundary';

interface PageShellProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export const PageShell: React.FC<PageShellProps> = ({
  children,
  title = 'Verity — Your AI Growth Team',
  description = 'Autonomous agents that find leads, write outreach and follow up. Every claim is checked. You approve what goes out.',
  className = '',
}) => {
  useEffect(() => {
    document.title = title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', description);
    }
  }, [title, description]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--ink)]">
      <Nav />
      <main className={`flex-1 w-full max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8 py-6 ${className}`}>
        <ErrorBoundary fallbackTitle={`Error rendering ${title}`}>
          {children}
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
};

export default PageShell;
