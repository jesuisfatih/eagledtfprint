'use client';

import { PageContent, PageHeader } from '@/components/ui';
import { adminFetch } from '@/lib/api-client';
import { useCallback, useEffect, useState } from 'react';

interface EntityState {
  status: string;
  isRunning: boolean;
  lastCompletedAt: string | null;
  lastFailedAt: string | null;
  lastError: string | null;
  totalRecordsSynced: number;
  lastRunRecords: number;
  consecutiveFailures: number;
}

const ENTITY_ICONS: Record<string, { icon: string; color: string }> = {
  customers: { icon: 'ti-users', color: '#667eea' },
  products: { icon: 'ti-package', color: '#11998e' },
  orders: { icon: 'ti-shopping-cart', color: '#f5576c' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function formatDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function SyncLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [entities, setEntities] = useState<Record<string, EntityState>>({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminFetch('/api/v1/sync/status');
      if (response.ok) {
        const data = await response.json();
        setLogs(data.recentLogs || []);
        setEntities(data.entities || {});
      }
    } catch (err) {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      completed: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
      failed: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
      running: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
    };
    const s = map[status] || { bg: 'rgba(161,161,170,0.1)', color: '#a1a1aa' };
    return (
      <span style={{
        fontSize: 11, padding: '3px 10px', borderRadius: 6,
        background: s.bg, color: s.color, fontWeight: 600,
        textTransform: 'capitalize',
      }}>
        {status}
      </span>
    );
  };

  return (
    <div>
      <PageHeader
        title="Sync Logs"
        subtitle="Detailed synchronization history and entity states"
        actions={[
          { label: 'Back to Settings', icon: 'arrow-left', variant: 'secondary', href: '/settings' },
          { label: 'Refresh', icon: 'refresh', variant: 'primary', onClick: loadData, disabled: loading },
        ]}
      />

      <PageContent loading={loading}>
        {/* Entity State Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
          {Object.entries(entities).map(([key, state]) => {
            const cfg = ENTITY_ICONS[key] || { icon: 'ti-database', color: '#a1a1aa' };
            return (
              <div key={key} className="apple-card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: `${cfg.color}15`, color: cfg.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                  }}>
                    <i className={`ti ${cfg.icon}`} />
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                    {key}
                  </span>
                  {statusBadge(state.status)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {state.totalRecordsSynced.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Total Records</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {state.lastRunRecords}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Last Run</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: state.consecutiveFailures > 0 ? '#ef4444' : 'var(--text-primary)' }}>
                      {state.consecutiveFailures}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Failures</div>
                  </div>
                </div>
                {state.lastError && (
                  <div style={{
                    marginTop: 10, padding: '6px 10px', borderRadius: 6,
                    background: 'rgba(239,68,68,0.06)', fontSize: 11,
                    color: '#ef4444', wordBreak: 'break-word',
                  }}>
                    {state.lastError}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Sync Logs Table */}
        <div className="apple-card">
          <div className="apple-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="ti ti-history" style={{ fontSize: 16 }} />
              <h3 className="apple-card-title">Sync History</h3>
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 4,
                background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)',
              }}>
                {logs.length} entries
              </span>
            </div>
          </div>
          <div className="apple-card-body" style={{ padding: 0 }}>
            {logs.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>
                <i className="ti ti-database-off" style={{ fontSize: 32, marginBottom: 8, display: 'block', opacity: 0.5 }} />
                <p style={{ fontSize: 14, margin: 0 }}>No sync logs recorded yet</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-tertiary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Type</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-tertiary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-tertiary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Records</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-tertiary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Started</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-tertiary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Duration</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-tertiary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log: any) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                        <td style={{ padding: '10px 16px', fontWeight: 500, color: 'var(--text-primary)' }}>
                          {log.syncType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </td>
                        <td style={{ padding: '10px 16px' }}>{statusBadge(log.status)}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {log.recordsProcessed || 0}
                        </td>
                        <td style={{ padding: '10px 16px', color: 'var(--text-tertiary)', fontSize: 12 }}>
                          {formatDate(log.startedAt)}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-tertiary)', fontSize: 12 }}>
                          {log.completedAt ? formatDuration(log.startedAt, log.completedAt) : (
                            <span style={{ color: '#3b82f6' }}>Running...</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: 11, color: '#ef4444', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.errorMessage || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </PageContent>
    </div>
  );
}
