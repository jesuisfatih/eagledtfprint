'use client';

import { ReactNode } from 'react';

/* ─── Loading Overlay ─── */
export function LoadingOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(255,255,255,0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{ textAlign: 'center' }}>
        <i className="ti ti-loader-2 spin" style={{ fontSize: 32, color: 'var(--accent-primary)' }} />
        <div style={{ marginTop: 12, color: 'var(--text-secondary)', fontSize: 14 }}>Loading...</div>
      </div>
    </div>
  );
}

/* ─── Action Result ─── */
interface ActionResultProps {
  type: 'success' | 'danger' | 'warning' | 'info';
  message: string;
  onDismiss?: () => void;
}

export function ActionResult({ type, message, onDismiss }: ActionResultProps) {
  const icons: Record<string, string> = {
    success: 'ti-check',
    danger: 'ti-x',
    warning: 'ti-alert-triangle',
    info: 'ti-info-circle',
  };

  return (
    <div className={`apple-alert ${type}`} style={{ marginBottom: 16 }}>
      <i className={`ti ${icons[type]}`} />
      <span style={{ flex: 1 }}>{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <i className="ti ti-x" style={{ fontSize: 14, color: 'var(--text-tertiary)' }} />
        </button>
      )}
    </div>
  );
}

/* ─── Skeletons ─── */
function SkeletonLine({ width = '100%', height = 14 }: { width?: string | number; height?: number }) {
  return <div className="skeleton" style={{ width, height, borderRadius: 6 }} />;
}

export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="stats-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="stat-card">
          <SkeletonLine width={80} />
          <SkeletonLine width={60} height={28} />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="apple-card">
      <div style={{ padding: 20 }}>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center' }}>
            {Array.from({ length: cols }).map((_, c) => (
              <SkeletonLine key={c} width={`${Math.random() * 40 + 60}%`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="apple-card">
      <div className="apple-card-body">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <SkeletonLine width={120} height={12} />
            <div style={{ marginTop: 8 }}>
              <SkeletonLine height={40} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Inline Error ─── */
export function InlineError({ message }: { message: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-danger)', fontSize: 13, marginTop: 4 }}>
      <i className="ti ti-alert-circle" style={{ fontSize: 14 }} />
      <span>{message}</span>
    </div>
  );
}

/* ─── Field Status ─── */
export function FieldStatus({ status, message }: { status: 'valid' | 'invalid' | 'loading'; message?: string }) {
  const config = {
    valid: { color: 'var(--color-success)', icon: 'ti-check' },
    invalid: { color: 'var(--color-danger)', icon: 'ti-x' },
    loading: { color: 'var(--text-tertiary)', icon: 'ti-loader-2 spin' },
  };
  const c = config[status];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: c.color, marginTop: 4 }}>
      <i className={`ti ${c.icon}`} style={{ fontSize: 14 }} />
      {message && <span>{message}</span>}
    </div>
  );
}

/* ─── Step Indicator ─── */
interface StepIndicatorProps {
  steps: string[];
  current: number;
}

export function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
      {steps.map((step, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 600,
            background: i <= current ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
            color: i <= current ? '#fff' : 'var(--text-tertiary)',
            transition: 'all 0.2s',
          }}>
            {i < current ? <i className="ti ti-check" style={{ fontSize: 14 }} /> : i + 1}
          </div>
          <span style={{
            fontSize: 13,
            fontWeight: i === current ? 500 : 400,
            color: i <= current ? 'var(--text-primary)' : 'var(--text-tertiary)',
          }}>
            {step}
          </span>
          {i < steps.length - 1 && (
            <div style={{
              width: 24,
              height: 1,
              background: i < current ? 'var(--accent-primary)' : 'var(--border-default)',
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Animated Counter ─── */
export function AnimatedCounter({ value }: { value: number }) {
  return <span>{value.toLocaleString()}</span>;
}

/* ─── Copy Button ─── */
export function CopyButton({ text, children }: { text: string; children?: ReactNode }) {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <button
      className="btn-apple ghost small"
      onClick={handleCopy}
      title="Copy to clipboard"
    >
      {children || <i className="ti ti-copy" style={{ fontSize: 14 }} />}
    </button>
  );
}
