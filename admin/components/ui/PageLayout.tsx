'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

/* ─── Page Header ─── */
interface PageAction {
  label: string;
  icon?: string;
  variant?: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: PageAction[] | ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && (
        <div className="page-header-actions">
          {Array.isArray(actions) ? actions.map((action, i) => {
            const cls = `btn-apple ${action.variant || 'secondary'}`;
            if (action.href) {
              return (
                <Link key={i} href={action.href} className={cls} style={{ textDecoration: 'none' }}>
                  {action.icon && <i className={`ti ti-${action.icon}`} />}
                  {action.label}
                </Link>
              );
            }
            return (
              <button key={i} className={cls} onClick={action.onClick} disabled={action.disabled}>
                {action.icon && <i className={`ti ti-${action.icon}`} />}
                {action.label}
              </button>
            );
          }) : actions}
        </div>
      )}
    </div>
  );
}

/* ─── Page Content ─── */
interface PageContentProps {
  children: ReactNode;
  className?: string;
  loading?: boolean;
  empty?: { show: boolean; icon?: string; title?: string; message?: string };
}

export function PageContent({ children, className = '', loading, empty }: PageContentProps) {
  if (loading) {
    return (
      <div className={className} style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <i className="ti ti-loader-2 spin" style={{ fontSize: 28, color: 'var(--accent-primary)' }} />
      </div>
    );
  }
  if (empty?.show) {
    return (
      <div className="empty-state" style={{ padding: 48 }}>
        <div className="empty-state-icon">
          <i className={`ti ti-${empty.icon || 'database-off'}`} />
        </div>
        <h4 className="empty-state-title">{empty.title || 'No data'}</h4>
        <p className="empty-state-desc">{empty.message}</p>
      </div>
    );
  }
  return <div className={className}>{children}</div>;
}

/* ─── Stats Card ─── */
const COLOR_MAP: Record<string, string> = {
  primary: '#007aff',
  success: '#34c759',
  warning: '#ff9500',
  danger: '#ff3b30',
  info: '#5856d6',
  secondary: '#8e8e93',
};

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: string;
  color?: string;
  iconColor?: string;
  trend?: string;
  meta?: string;
  loading?: boolean;
}

export function StatsCard({ title, value, icon, color, iconColor, trend, meta, loading }: StatsCardProps) {
  const resolvedColor = color || COLOR_MAP[iconColor || 'primary'] || '#007aff';

  if (loading) {
    return (
      <div className="stat-card">
        <div className="skeleton" style={{ height: 42, width: 42, borderRadius: 'var(--radius-md)' }} />
        <div className="stat-content">
          <div className="skeleton" style={{ height: 12, width: 80 }} />
          <div className="skeleton" style={{ height: 28, width: 64, marginTop: 4 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="stat-card" style={{ '--stat-accent': resolvedColor } as React.CSSProperties}>
      <div className="stat-icon" style={{ background: `${resolvedColor}14`, color: resolvedColor }}>
        <i className={`ti ti-${icon}`} />
      </div>
      <div className="stat-content">
        <div className="stat-label">{title}</div>
        <div className="stat-value">{value}</div>
        {trend && <div className="stat-change">{trend}</div>}
        {meta && <div className="stat-meta">{meta}</div>}
      </div>
    </div>
  );
}

/* ─── Tabs ─── */
interface TabItem {
  id: string;
  label: string;
  icon?: string;
  count?: number;
}

interface TabsProps {
  tabs: TabItem[];
  active?: string;
  activeTab?: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, active, activeTab, onChange }: TabsProps) {
  const current = active || activeTab || tabs[0]?.id;
  return (
    <div className="apple-tabs" style={{ marginBottom: 20 }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`apple-tab ${current === tab.id ? 'active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon && <i className={`ti ti-${tab.icon}`} style={{ fontSize: 16 }} />}
          {tab.label}
          {tab.count !== undefined && (
            <span className="badge-apple info" style={{ marginLeft: 6, fontSize: 11 }}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ─── Filter Bar ─── */
export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap',
      marginBottom: 16,
    }}>
      {children}
    </div>
  );
}

/* ─── Search Input ─── */
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Search...' }: SearchInputProps) {
  return (
    <div className="input-apple" style={{ minWidth: 240 }}>
      <i className="ti ti-search input-icon" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/* ─── Select Filter ─── */
interface SelectFilterProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function SelectFilter({ value, onChange, options, placeholder }: SelectFilterProps) {
  return (
    <select className="select-apple" value={value} onChange={(e) => onChange(e.target.value)}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}
