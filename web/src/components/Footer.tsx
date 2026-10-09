import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-border bg-bg mt-auto">
      <div className="max-w-[1280px] mx-auto px-6 md:px-16 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left: Wordmark in Fraunces --accent */}
        <Link
          to="/"
          className="font-serif text-[22px] font-light text-accent tracking-[-0.02em] select-none hover:opacity-90 transition-opacity"
        >
          Verity
        </Link>

        {/* Right: Muted exact statement */}
        <p className="text-[13px] font-sans text-muted tracking-normal">
          Nothing leaves without your approval. Demo site, synthetic data.
        </p>
      </div>
    </footer>
  );
};
