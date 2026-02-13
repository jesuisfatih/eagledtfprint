'use client';

import { ReactNode } from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export default function Card({ title, subtitle, action, children, className = '', noPadding = false }: CardProps) {
  return (
    <div className={`apple-card ${className}`}>
      {(title || action) && (
        <div className="apple-card-header">
          <div>
            {title && <h3 className="apple-card-title">{title}</h3>}
            {subtitle && <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0, marginTop: 2 }}>{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'apple-card-body'}>
        {children}
      </div>
    </div>
  );
}
