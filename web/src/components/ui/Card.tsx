import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'surface' | 'surface-2' | 'subtle' | 'glass';
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'surface',
  hoverable = false,
  className = '',
  ...props
}) => {
  const variantStyles = {
    surface: 'bg-surface border-white/[0.08] text-text shadow-sm',
    'surface-2': 'bg-surface-2 border-white/[0.08] text-text',
    subtle: 'bg-surface-2/40 backdrop-blur-md border-white/[0.06] text-text',
    glass: 'bg-surface/70 backdrop-blur-xl border-white/[0.1] text-text shadow-lg',
  };

  const hoverStyles = hoverable
    ? 'transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4),0_0_20px_rgba(212,175,55,0.08)]'
    : '';

  return (
    <div
      className={`rounded-card border p-5 ${variantStyles[variant]} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
