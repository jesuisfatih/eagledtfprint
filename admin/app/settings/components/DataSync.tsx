'use client';

import { showToast } from '@/components/ui';
import { adminFetch } from '@/lib/api-client';
import { useCallback, useEffect, useState } from 'react';
import type { AdminMerchantSettings } from './types';

interface DataSyncProps {
  settings: AdminMerchantSettings | null;
  onSyncComplete: () => void;
}

interface EntitySyncState {
  status: string;
  isRunning: boolean;
  lastCompletedAt: string | null;
  lastFailedAt: string | null;
  lastError: string | null;
  totalRecordsSynced: number;
  lastRunRecords: number;
  consecutiveFailures: number;
  lastCursor: string | null;
}

interface SyncStatusResponse {
  merchantLastSyncAt: string | null;
  isAnySyncing: boolean;
  hasErrors: boolean;
  entities: {
    customers?: EntitySyncState;
    products?: EntitySyncState;
    orders?: EntitySyncState;
  };
  recentLogs: any[];
}

const ENTITY_CONFIG = {
  customers: { label: 'Customers', icon: 'ti-users', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', lightBg: 'rgba(102,126,234,0.08)', color: '#667eea' },
  products: { label: 'Products', icon: 'ti-package', gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', lightBg: 'rgba(17,153,142,0.08)', color: '#11998e' },
  orders: { label: 'Orders', icon: 'ti-shopping-cart', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', lightBg: 'rgba(245,87,108,0.08)', color: '#f5576c' },
} as const;

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function StatusDot({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    completed: '#22c55e',
    running: '#3b82f6',
    failed: '#ef4444',
    idle: '#a1a1aa',
  };
  const pulseMap: Record<string, boolean> = { running: true };
  const c = colorMap[status] || '#a1a1aa';
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8 }}>
      {pulseMap[status] && (
        <span style={{
          position: 'absolute', inset: -2, borderRadius: '50%',
          background: c, opacity: 0.4, animation: 'pulse-ring 1.5s ease-out infinite',
        }} />
      )}
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
    </span>
  );
}

export default function DataSync({ settings, onSyncComplete }: DataSyncProps) {
  const [syncing, setSyncing] = useState<string | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatusResponse | null>(null);
  const [pollingActive, setPollingActive] = useState(false);

  const loadSyncStatus = useCallback(async () => {
    try {
      const response = await adminFetch('/api/v1/sync/status');
      if (response.ok) {
        const data = await response.json();
        setSyncStatus(data);
        return data;
      }
    } catch (err) {
      // Silently fail
    }
    return null;
  }, []);

  // Initial load
  useEffect(() => {
    loadSyncStatus();
  }, [loadSyncStatus]);

  // Auto-poll when syncing
  useEffect(() => {
    if (!pollingActive) return;
    const interval = setInterval(async () => {
      const data = await loadSyncStatus();
      if (data && !data.isAnySyncing) {
        setPollingActive(false);
        onSyncComplete();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [pollingActive, loadSyncStatus, onSyncComplete]);

  const handleSync = async (type: 'customers' | 'products' | 'orders' | 'initial') => {
    setSyncing(type);
    try {
      const endpoint = type === 'initial' ? '/api/v1/sync/initial' : `/api/v1/sync/${type}`;
      const response = await adminFetch(endpoint, { method: 'POST' });
      if (response.ok) {
        const result = await response.json();
        if (result.skipped) {
          showToast(result.message, 'warning');
        } else {
          const message = type === 'initial' ? 'Full sync started!' : `${type.charAt(0).toUpperCase() + type.slice(1)} sync started!`;
          showToast(message, 'success');
          setPollingActive(true);
        }
        await loadSyncStatus();
      } else {
        const err = await response.json();
        showToast(err.message || 'Sync failed', 'danger');
      }
    } catch (err: unknown) {
      showToast(`Sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'danger');
    } finally { setSyncing(null); }
  };

  const handleReset = async (entityType: string) => {
    setResetting(entityType);
    try {
      const endpoint = entityType === 'all' ? '/api/v1/sync/reset-all' : `/api/v1/sync/reset/${entityType}`;
      const response = await adminFetch(endpoint, { method: 'POST' });
      if (response.ok) {
        showToast(`${entityType === 'all' ? 'All syncs' : entityType} reset successfully`, 'success');
        await loadSyncStatus();
        onSyncComplete();
      } else {
        const err = await response.json();
        showToast(err.message || 'Reset failed', 'danger');
      }
    } catch (err: unknown) {
      showToast(`Reset failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'danger');
    } finally { setResetting(null); }
  };

  const entities = syncStatus?.entities || {};

  return (
    <>
      {/* Pulse animation */}
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      {/* Global Sync Status Bar */}
      <div className="apple-card" style={{ marginBottom: 16 }}>
        <div style={{
          padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderRadius: 'var(--radius-lg)',
          background: syncStatus?.isAnySyncing
            ? 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(59,130,246,0.02))'
            : syncStatus?.hasErrors
              ? 'linear-gradient(135deg, rgba(239,68,68,0.06), rgba(239,68,68,0.02))'
              : 'linear-gradient(135deg, rgba(34,197,94,0.06), rgba(34,197,94,0.02))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: syncStatus?.isAnySyncing ? 'rgba(59,130,246,0.12)' : syncStatus?.hasErrors ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
              color: syncStatus?.isAnySyncing ? '#3b82f6' : syncStatus?.hasErrors ? '#ef4444' : '#22c55e',
              fontSize: 18,
            }}>
              <i className={`ti ${syncStatus?.isAnySyncing ? 'ti-loader-2 spin' : syncStatus?.hasErrors ? 'ti-alert-triangle' : 'ti-circle-check'}`} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                {syncStatus?.isAnySyncing ? 'Synchronization in Progress' : syncStatus?.hasErrors ? 'Sync Errors Detected' : 'All Systems Synced'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                Last sync: {formatTimeAgo(syncStatus?.merchantLastSyncAt || null)} • Auto-sync every 5 min
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {syncStatus?.hasErrors && (
              <button
                onClick={() => handleReset('all')}
                disabled={resetting !== null}
                className="btn-apple secondary small"
                style={{ fontSize: 12, padding: '6px 12px' }}
              >
                {resetting === 'all' ? <><i className="ti ti-loader-2 spin" /> Resetting...</> : <><i className="ti ti-refresh" /> Reset All</>}
              </button>
            )}
            <button
              onClick={() => handleSync('initial')}
              disabled={syncing !== null || syncStatus?.isAnySyncing}
              className="btn-apple primary small"
              style={{ fontSize: 12, padding: '6px 12px' }}
            >
              {syncing === 'initial' ? <><i className="ti ti-loader-2 spin" /> Starting...</> : <><i className="ti ti-refresh" /> Full Sync</>}
            </button>
          </div>
        </div>
      </div>

      {/* Entity Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
        {(Object.keys(ENTITY_CONFIG) as Array<keyof typeof ENTITY_CONFIG>).map(entityType => {
          const config = ENTITY_CONFIG[entityType];
          const state = entities[entityType];
          const isRunning = state?.isRunning;
          const hasFailed = (state?.consecutiveFailures || 0) > 0;

          return (
            <div key={entityType} className="apple-card" style={{ overflow: 'hidden' }}>
              {/* Progress shimmer when running */}
              {isRunning && (
                <div style={{
                  height: 3, width: '100%',
                  background: `linear-gradient(90deg, transparent, ${config.color}40, transparent)`,
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s infinite',
                }} />
              )}

              <div style={{ padding: 20 }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12,
                      background: config.gradient,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 18,
                      boxShadow: `0 4px 12px ${config.color}30`,
                    }}>
                      <i className={`ti ${config.icon}`} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>
                        {config.label}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <StatusDot status={state?.status || 'idle'} />
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>
                          {state?.status || 'idle'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr',
                  gap: 8, marginBottom: 16,
                  padding: 12, borderRadius: 10,
                  background: config.lightBg,
                }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                      {state?.totalRecordsSynced?.toLocaleString() || 0}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Total Synced</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                      {state?.lastRunRecords?.toLocaleString() || 0}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Last Run</div>
                  </div>
                </div>

                {/* Last Sync Time */}
                <div style={{
                  fontSize: 12, color: 'var(--text-tertiary)',
                  marginBottom: 12,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <i className="ti ti-clock" style={{ fontSize: 14 }} />
                  Last completed: {formatTimeAgo(state?.lastCompletedAt || null)}
                </div>

                {/* Error Banner */}
                {hasFailed && (
                  <div style={{
                    padding: '8px 12px', borderRadius: 8,
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.15)',
                    marginBottom: 12,
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                  }}>
                    <i className="ti ti-alert-circle" style={{ color: '#ef4444', fontSize: 14, marginTop: 1 }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#ef4444' }}>
                        {state?.consecutiveFailures} consecutive failures
                      </div>
                      {state?.lastError && (
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, wordBreak: 'break-word' }}>
                          {state.lastError.length > 80 ? state.lastError.slice(0, 80) + '...' : state.lastError}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleSync(entityType)}
                    disabled={syncing !== null || isRunning}
                    className="btn-apple primary small"
                    style={{ flex: 1, fontSize: 12, padding: '8px 0' }}
                  >
                    {syncing === entityType || isRunning
                      ? <><i className="ti ti-loader-2 spin" /> Syncing...</>
                      : <><i className="ti ti-refresh" /> Sync Now</>
                    }
                  </button>
                  {hasFailed && (
                    <button
                      onClick={() => handleReset(entityType)}
                      disabled={resetting !== null}
                      className="btn-apple secondary small"
                      style={{ fontSize: 12, padding: '8px 12px' }}
                      title="Reset failure counter"
                    >
                      <i className="ti ti-arrow-back-up" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Sync Logs */}
      {syncStatus?.recentLogs && syncStatus.recentLogs.length > 0 && (
        <div className="apple-card">
          <div className="apple-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="ti ti-list" style={{ fontSize: 16, color: 'var(--text-tertiary)' }} />
              <h3 className="apple-card-title" style={{ fontSize: 14 }}>Recent Sync Activity</h3>
            </div>
          </div>
          <div style={{ padding: '0 20px 16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {syncStatus.recentLogs.slice(0, 8).map((log: any) => {
                const duration = log.completedAt
                  ? `${Math.round((new Date(log.completedAt).getTime() - new Date(log.startedAt).getTime()) / 1000)}s`
                  : null;
                const statusColor = log.status === 'completed' ? '#22c55e' : log.status === 'failed' ? '#ef4444' : '#f59e0b';

                return (
                  <div key={log.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', borderRadius: 8,
                    background: 'var(--bg-secondary)',
                    fontSize: 13,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: statusColor, flexShrink: 0,
                      }} />
                      <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                        {log.syncType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </span>
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 4,
                        background: `${statusColor}15`, color: statusColor,
                        fontWeight: 500,
                      }}>
                        {log.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-tertiary)', fontSize: 12 }}>
                      {log.recordsProcessed > 0 && (
                        <span>{log.recordsProcessed} records</span>
                      )}
                      {duration && <span>{duration}</span>}
                      <span>{formatTimeAgo(log.startedAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
