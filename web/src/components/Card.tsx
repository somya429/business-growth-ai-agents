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
    ? 'hover:border-[#8F703655] transition-colors duration-200'
    : '';

  return (
    <div
      className={`bg-surface border border-border rounded-[4px] p-[28px] ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
