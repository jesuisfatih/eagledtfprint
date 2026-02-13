'use client';

import React, { useEffect, useState, useCallback } from 'react';

/* ── Spinner ── */
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'sm' ? 20 : size === 'lg' ? 40 : 32;
  return <div className="spinner-apple" style={{ width: s, height: s }} />;
}

/* ── Page Loading ── */
export function PageLoading({ text = 'Loading...' }: { text?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 12 }}>
      <Spinner size="lg" />
      <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>{text}</p>
    </div>
  );
}

/* ── Loading Button ── */
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  variant?: string;
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  children: React.ReactNode;
}

export function LoadingButton({ loading = false, loadingText, variant = 'primary', size = 'md', icon, children, disabled, className = '', ...props }: LoadingButtonProps) {
  const sizeClass = size === 'sm' ? 'small' : size === 'lg' ? 'lg' : '';
  return (
    <button className={`btn-apple ${variant} ${sizeClass} ${className}`} disabled={disabled || loading} {...props}>
      {loading ? (<><i className="ti ti-loader-2" style={{ animation: 'spin 0.8s linear infinite' }} /> {loadingText || children}</>) : (<>{icon && <i className={`ti ${icon}`} />} {children}</>)}
    </button>
  );
}

/* ── Skeleton ── */
export function Skeleton({ width, height, variant = 'text', className = '' }: { width?: string | number; height?: string | number; variant?: 'text' | 'circular' | 'rectangular'; className?: string }) {
  return (
    <span className={`skeleton ${className}`} style={{
      display: 'inline-block',
      width: width || (variant === 'text' ? '100%' : undefined),
      height: height || (variant === 'text' ? '1em' : undefined),
      borderRadius: variant === 'circular' ? '50%' : variant === 'text' ? 4 : 8,
    }} />
  );
}

export function SkeletonCard() {
  return (
    <div className="apple-card">
      <div className="apple-card-body">
        <Skeleton height={200} variant="rectangular" />
        <div style={{ marginTop: 12 }}><Skeleton width="60%" /></div>
        <div style={{ marginTop: 8 }}><Skeleton width="40%" /></div>
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="apple-card">
      <table className="apple-table">
        <thead><tr><th><Skeleton width="80%" /></th><th><Skeleton width="60%" /></th><th><Skeleton width="70%" /></th><th><Skeleton width="50%" /></th></tr></thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}><td><Skeleton /></td><td><Skeleton width="80%" /></td><td><Skeleton width="60%" /></td><td><Skeleton width="40%" /></td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Empty State ── */
interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void; variant?: string };
  className?: string;
}

export function EmptyState({ icon = 'ti-inbox', title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`empty-state ${className}`}>
      <div className="empty-state-icon"><i className={`ti ${icon}`} /></div>
      <h4 className="empty-state-title">{title}</h4>
      {description && <p className="empty-state-desc">{description}</p>}
      {action && <button className={`btn-apple ${action.variant || 'primary'}`} onClick={action.onClick} style={{ marginTop: 16 }}>{action.label}</button>}
    </div>
  );
}

/* ── Error Display ── */
export function ErrorDisplay({ title = 'Something went wrong', message, retry }: { title?: string; message: string; retry?: () => void; className?: string }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon"><i className="ti ti-alert-circle" style={{ color: 'var(--accent-red)' }} /></div>
      <h4 className="empty-state-title" style={{ color: 'var(--accent-red)' }}>{title}</h4>
      <p className="empty-state-desc">{message}</p>
      {retry && <button className="btn-apple secondary" onClick={retry} style={{ marginTop: 16 }}><i className="ti ti-refresh" /> Try Again</button>}
    </div>
  );
}

/* ── Alert ── */
export function Alert({ type, title, message, closable = false, onClose }: { type: 'success' | 'error' | 'warning' | 'info'; title?: string; message: string; closable?: boolean; onClose?: () => void; className?: string }) {
  const icons: Record<string, string> = { success: 'ti-check', error: 'ti-x', warning: 'ti-alert-triangle', info: 'ti-info-circle' };
  const cls = type === 'error' ? 'danger' : type;
  return (
    <div className={`apple-alert ${cls}`}>
      <i className={`ti ${icons[type]}`} />
      <div style={{ flex: 1 }}>
        {title && <strong style={{ display: 'block' }}>{title}</strong>}
        {message}
      </div>
      {closable && onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.7, fontSize: 16 }}>✕</button>}
    </div>
  );
}

/* ── Toast System ── */
interface ToastItem { id: string; type: 'success' | 'error' | 'warning' | 'info' | 'danger'; message: string; }
let toastListeners: ((t: ToastItem) => void)[] = [];

export function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' | 'danger' = 'info') {
  const toast: ToastItem = { id: Date.now().toString(), type, message };
  toastListeners.forEach(fn => fn(toast));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (t: ToastItem) => {
      setToasts(prev => [...prev, t]);
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 4000);
    };
    toastListeners.push(handler);
    return () => { toastListeners = toastListeners.filter(fn => fn !== handler); };
  }, []);

  const icons: Record<string, string> = { success: 'ti-check', error: 'ti-x', danger: 'ti-x', warning: 'ti-alert-triangle', info: 'ti-info-circle' };

  return (
    <div className="apple-toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`apple-toast ${t.type}`}>
          <div className="toast-icon"><i className={`ti ${icons[t.type]}`} /></div>
          <span className="toast-message">{t.message}</span>
          <button className="toast-close" onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}>✕</button>
        </div>
      ))}
    </div>
  );
}

/* ── Progress Bar ── */
export function ProgressBar({ value, max = 100, variant = 'blue' }: { value: number; max?: number; variant?: string; className?: string }) {
  const pct = Math.min(Math.round((value / max) * 100), 100);
  return (
    <div className="progress-apple">
      <div className={`progress-apple-fill ${variant}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ── Badge ── */
export function Badge({ variant = 'blue', children }: { variant?: string; pill?: boolean; children: React.ReactNode; className?: string }) {
  return <span className={`badge-apple ${variant}`}>{children}</span>;
}

/* ── Status Badge ── */
const STATUS_MAP: Record<string, string> = {
  active: 'green', completed: 'green', paid: 'green', fulfilled: 'green', delivered: 'green', approved: 'green',
  pending: 'orange', processing: 'orange', in_progress: 'orange', partial: 'orange',
  cancelled: 'red', rejected: 'red', failed: 'red', refunded: 'red', overdue: 'red',
  draft: 'gray', inactive: 'gray', archived: 'gray',
};

export function StatusBadge({ status, colorMap }: { status: string; colorMap?: Record<string, string> }) {
  const map = { ...STATUS_MAP, ...colorMap };
  const color = map[status?.toLowerCase()] || 'gray';
  return <span className={`badge-apple ${color}`}>{status}</span>;
}

/* ── Confirm Modal ── */
export function ConfirmModal({ isOpen, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'primary', loading = false, onConfirm, onCancel }: {
  isOpen: boolean; title: string; message: string; confirmText?: string; cancelText?: string; variant?: string; loading?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="apple-modal-overlay" onClick={onCancel}>
      <div className="apple-modal" onClick={e => e.stopPropagation()}>
        <div className="apple-modal-header"><h3 className="apple-modal-title">{title}</h3></div>
        <div className="apple-modal-body"><p>{message}</p></div>
        <div className="apple-modal-footer">
          <button className="btn-apple secondary" onClick={onCancel} disabled={loading}>{cancelText}</button>
          <LoadingButton variant={variant} loading={loading} onClick={onConfirm}>{confirmText}</LoadingButton>
        </div>
      </div>
    </div>
  );
}

/* ── Quantity Control ── */
export function QuantityControl({ value, onChange, min = 1, max = 999, disabled = false }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; disabled?: boolean;
}) {
  return (
    <div className="qty-control">
      <button className="qty-btn" onClick={() => onChange(Math.max(min, value - 1))} disabled={disabled || value <= min}>−</button>
      <input className="qty-value" type="number" value={value} onChange={e => { const v = parseInt(e.target.value) || min; onChange(Math.max(min, Math.min(max, v))); }} disabled={disabled} />
      <button className="qty-btn" onClick={() => onChange(Math.min(max, value + 1))} disabled={disabled || value >= max}>+</button>
    </div>
  );
}

/* ── Format Helpers ── */
export function formatCurrency(amount: number | string) {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
}

export function formatRelativeTime(date: string | Date) {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

/* ── Export ── */
export default {
  Spinner, PageLoading, LoadingButton, Skeleton, SkeletonCard, SkeletonTable,
  EmptyState, ErrorDisplay, Alert, showToast, ToastContainer,
  ProgressBar, Badge, StatusBadge, ConfirmModal, QuantityControl,
  formatCurrency, formatRelativeTime,
};
