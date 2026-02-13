'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, error, hint, className = '', ...props }, ref) => {
    return (
      <div style={{ marginBottom: 16 }}>
        {label && <label className="input-label">{label}</label>}
        <div className={`input-apple ${error ? 'error' : ''} ${className}`}>
          {icon && <i className={`ti ${icon} input-icon`} />}
          <input ref={ref} {...props} />
        </div>
        {error && <div style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 4 }}>{error}</div>}
        {hint && !error && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>{hint}</div>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
