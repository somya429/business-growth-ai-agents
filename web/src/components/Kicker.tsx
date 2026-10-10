import React from 'react';

interface KickerProps {
  children: React.ReactNode;
  variant?: 'accent' | 'verified';
  className?: string;
  withDot?: boolean;
}

export const Kicker: React.FC<KickerProps> = ({
  children,
  className = '',
  withDot = false,
}) => {
  return (
    <div className={`eyebrow flex items-center gap-2 select-none ${className}`}>
      {withDot && <span className="dot" />}
      <span>{children}</span>
    </div>
  );
};

export default Kicker;
