import React from 'react';

interface KickerProps {
  children: React.ReactNode;
  variant?: 'accent' | 'verified';
  className?: string;
}

export const Kicker: React.FC<KickerProps> = ({
  children,
  variant = 'accent',
  className = '',
}) => {
  const colorClass = variant === 'verified' ? 'text-verified' : 'text-accent';

  return (
    <div
      className={`text-[13px] font-sans font-medium uppercase tracking-[0.19em] select-none ${colorClass} ${className}`}
    >
      {children}
    </div>
  );
};
