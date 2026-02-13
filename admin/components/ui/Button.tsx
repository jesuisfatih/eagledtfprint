'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  loading?: boolean;
  children: ReactNode;
}

export default function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  loading,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const sizeClass = size === 'sm' ? 'small' : size === 'lg' ? 'large' : '';

  return (
    <button
      className={`btn-apple ${variant} ${sizeClass} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <i className="ti ti-loader-2 spin" style={{ fontSize: 16 }} />
      ) : icon ? (
        <i className={`ti ${icon}`} style={{ fontSize: 16 }} />
      ) : null}
      {children}
    </button>
  );
}
