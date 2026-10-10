import React from 'react';
import { Link } from 'react-router-dom';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'secondary' | 'accent';
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
    'inline-flex items-center justify-center gap-2 font-sans font-semibold rounded-full border border-[var(--ink)] transition-all cursor-pointer select-none';

  const sizeStyles =
    size === 'sm' ? 'px-4 py-2 text-xs' : 'px-6 py-3 text-sm';

  let variantStyles = '';
  if (variant === 'primary') {
    variantStyles =
      'bg-[var(--ink)] text-[var(--bg)] hover:bg-[var(--accent)] hover:text-[var(--ink-deep)] hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[3px_3px_0_var(--ink)] disabled:opacity-40 disabled:pointer-events-none';
  } else if (variant === 'accent') {
    variantStyles =
      'bg-[var(--accent)] text-[var(--ink-deep)] border-[var(--accent)] hover:shadow-[3px_3px_0_var(--ink)] hover:-translate-x-[2px] hover:-translate-y-[2px] disabled:opacity-40 disabled:pointer-events-none';
  } else {
    variantStyles =
      'bg-transparent text-[var(--ink)] hover:bg-[var(--tint)] hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[3px_3px_0_var(--ink)] disabled:opacity-40 disabled:pointer-events-none';
  }

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

export default Button;
