import React from 'react';
import { Link } from 'react-router-dom';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost';
  size?: 'normal' | 'sm';
  to?: string;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'normal',
  to,
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-sans font-medium rounded-[2px] transition-colors focus-visible:outline-2 focus-visible:outline-accent select-none';

  const sizeStyles = size === 'sm' ? 'px-[22px] py-[10px] text-[14px]' : 'px-[26px] py-[14px] text-[15px]';

  const variantStyles =
    variant === 'primary'
      ? 'bg-[#1A1C21] text-[#FAF8F4] hover:bg-[#2C3038] disabled:opacity-50'
      : 'border border-border bg-transparent text-[#1A1C21] hover:border-[#8F703688] disabled:opacity-50';

  const combinedClasses = `${baseStyles} ${sizeStyles} ${variantStyles} ${className}`;

  if (to) {
    return (
      <Link to={to} className={combinedClasses}>
        {children}
      </Link>
    );
  }

  return (
    <button className={combinedClasses} disabled={disabled || isLoading} {...props}>
      {isLoading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : null}
      {children}
    </button>
  );
};
