import React from 'react';
import { motion } from 'framer-motion';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'verified';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'relative inline-flex items-center justify-center font-medium tracking-tight select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none transition-all duration-200 active:scale-[0.98]';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 rounded-lg gap-1.5 h-8',
    md: 'text-xs sm:text-sm px-4 py-2 rounded-xl gap-2 h-10',
    lg: 'text-sm px-5 py-2.5 rounded-xl gap-2.5 h-11',
  };

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-[#D4AF37] to-[#E5C378] text-[#0A0D14] font-semibold shadow-[0_2px_15px_rgba(212,175,55,0.25)] hover:shadow-[0_4px_22px_rgba(212,175,55,0.4)] hover:brightness-105 border border-[#F3DE9C]/40',
    secondary:
      'bg-surface-2 text-text border border-white/10 hover:border-accent/40 hover:bg-surface-2/80 shadow-sm',
    outline:
      'bg-transparent text-text border border-white/15 hover:border-accent hover:text-accent hover:bg-accent-soft',
    ghost:
      'bg-transparent text-text-muted hover:text-text hover:bg-white/5',
    danger:
      'bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25 hover:border-danger/50 shadow-sm',
    verified:
      'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold shadow-[0_2px_15px_rgba(16,185,129,0.3)] hover:brightness-105 border border-emerald-400/30',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : (
        leftIcon && <span className="inline-flex items-center">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="inline-flex items-center">{rightIcon}</span>}
    </button>
  );
};
