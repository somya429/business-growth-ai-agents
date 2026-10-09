import React, { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Nav } from './Nav';
import { Footer } from './Footer';

interface PageShellProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export const PageShell: React.FC<PageShellProps> = ({
  children,
  title = 'Verity — Growth, verified',
  description = 'Agents that find leads, write outreach and follow up. Every claim is checked. You approve what goes out.',
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    document.title = title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', description);
    }
    window.scrollTo(0, 0);
  }, [title, description]);

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text selection:bg-[#8F703620] selection:text-text">
      <Nav />

      <motion.main
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`flex-1 w-full max-w-[1280px] mx-auto px-6 md:px-16 ${className}`}
      >
        {children}
      </motion.main>

      <Footer />
    </div>
  );
};
