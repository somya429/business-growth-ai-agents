import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverable = true,
  ...props
}) => {
  const hoverStyles = hoverable
    ? 'hover:bg-[var(--tint)] transition-all duration-200'
    : '';

  return (
    <div
      className={`panel p-6 rounded-none ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
