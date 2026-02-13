'use client';

import { PageHeader } from '@/components/ui';
import { adminFetch } from '@/lib/api-client';
import { useCallback, useEffect, useState } from 'react';

interface SystemHealth {
  api: 'online' | 'offline' | 'checking';
  database: 'connected' | 'error' | 'checking';
  redis: 'active' | 'error' | 'checking';
  shopify: 'connected' | 'error' | 'checking';
  latency?: number;
}

export default function IntegrationsPage() {
  const [health, setHealth] = useState<SystemHealth>({ api: 'checking', database: 'checking', redis: 'checking', shopify: 'checking' });
  const [syncStatus, setSyncStatus] = useState<any>(null);

  const checkHealth = useCallback(async () => {
    const start = Date.now();
    try {
      const [healthRes, syncRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.eagledtfsupply.com'}/api/v1/health`),
        adminFetch('/api/v1/sync/status'),
      ]);

      const latency = Date.now() - start;

      if (healthRes.ok) {
        const d = await healthRes.json();
        setHealth({
          api: 'online',
          database: d.database?.status === 'ok' ? 'connected' : 'error',
          redis: d.redis?.status === 'ok' ? 'active' : 'error',
          shopify: 'connected',
          latency,
        });
      } else {
        setHealth({ api: 'offline', database: 'error', redis: 'error', shopify: 'error', latency });
      }

      if (syncRes.ok) {
        const d = await syncRes.json();
        setSyncStatus(d);
      }
    } catch {
      setHealth({ api: 'offline', database: 'error', redis: 'error', shopify: 'error' });
    }
  }, []);

  useEffect(() => { checkHealth(); }, [checkHealth]);

  const statusColor = (s: string) => {
    if (['online', 'connected', 'active'].includes(s)) return '#34c759';
    if (s === 'checking') return '#ff9500';
    return '#ff3b30';
  };

  const integrations = [
    { name: 'API Server', desc: `NestJS Backend${health.latency ? ` (${health.latency}ms)` : ''}`, icon: 'ti-server', status: health.api, color: '#007aff' },
    { name: 'PostgreSQL', desc: 'Primary database', icon: 'ti-database', status: health.database, color: '#336791' },
    { name: 'Redis', desc: 'Session cache & queue', icon: 'ti-bolt', status: health.redis, color: '#ff3b30' },
    { name: 'Shopify', desc: `E-commerce platform${syncStatus?.entities ? ` · ${Object.keys(syncStatus.entities).length} sync entities` : ''}`, icon: 'ti-brand-shopify', status: health.shopify, color: '#95bf47' },
  ];

  const syncEntities = syncStatus?.entities ? Object.entries(syncStatus.entities).map(([key, value]: [string, any]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    synced: value.totalRecordsSynced || 0,
    lastSync: value.lastCompletedAt,
    status: value.isRunning ? 'Running' : value.consecutiveFailures > 0 ? 'Error' : 'Idle',
    color: value.isRunning ? '#ff9500' : value.consecutiveFailures > 0 ? '#ff3b30' : '#34c759',
  })) : [];

  return (
    <div>
      <PageHeader title="Integrations" subtitle="System health & connected services"
        actions={[{ label: 'Check Health', icon: 'refresh', variant: 'secondary', onClick: checkHealth }]} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {integrations.map(i => (
          <div key={i.name} className="apple-card">
            <div className="apple-card-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: `${i.color}14`, color: i.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`ti ${i.icon}`} style={{ fontSize: 24 }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{i.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{i.desc}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: statusColor(i.status) }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: statusColor(i.status), textTransform: 'capitalize' }}>{i.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sync Details */}
      {syncEntities.length > 0 && (
        <div className="apple-card" style={{ marginTop: 20 }}>
          <div className="apple-card-header"><h3 className="apple-card-title">Shopify Sync Status</h3></div>
          <div className="apple-card-body">
            <table className="apple-table">
              <thead>
                <tr><th>Entity</th><th>Records Synced</th><th>Last Sync</th><th>Status</th></tr>
              </thead>
              <tbody>
                {syncEntities.map(e => (
                  <tr key={e.name}>
                    <td style={{ fontWeight: 500 }}>{e.name}</td>
                    <td>{e.synced.toLocaleString()}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{e.lastSync ? new Date(e.lastSync).toLocaleString() : 'Never'}</td>
                    <td>
                      <span className={`badge-apple ${e.status === 'Idle' ? 'success' : e.status === 'Running' ? 'warning' : 'danger'}`}>{e.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
