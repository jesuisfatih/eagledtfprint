'use client';

import { adminFetch } from '@/lib/api-client';
import { useCallback, useEffect, useState } from 'react';

interface EntityState {
  status: string;
  isRunning: boolean;
  totalRecordsSynced: number;
  lastRunRecords: number;
  lastCompletedAt: string | null;
}

const ENTITY_CONFIG = {
  customers: { label: 'Customers', color: '#667eea' },
  products: { label: 'Products', color: '#11998e' },
  orders: { label: 'Orders', color: '#f5576c' },
};

export default function SyncProgress() {
  const [entities, setEntities] = useState<Record<string, EntityState>>({});
  const [isAnySyncing, setIsAnySyncing] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await adminFetch('/api/v1/sync/status');
      if (!response.ok) return;
      const data = await response.json();
      if (data?.entities) {
        setEntities(data.entities);
        setIsAnySyncing(data.isAnySyncing || false);
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, isAnySyncing ? 3000 : 15000);
    return () => clearInterval(interval);
  }, [fetchStatus, isAnySyncing]);

  if (Object.keys(entities).length === 0) return null;

  return (
    <div className="apple-card" style={{ marginBottom: 16 }}>
      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <i className="ti ti-chart-bar" style={{ fontSize: 16, color: 'var(--text-tertiary)' }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Sync Progress</span>
          {isAnySyncing && (
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 4,
              background: 'rgba(59,130,246,0.1)', color: '#3b82f6',
              fontWeight: 500, marginLeft: 'auto',
            }}>
              <i className="ti ti-loader-2 spin" style={{ fontSize: 10, marginRight: 4 }} />
              Syncing
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(Object.entries(ENTITY_CONFIG) as [string, typeof ENTITY_CONFIG.customers][]).map(([key, config]) => {
            const entity = entities[key];
            if (!entity) return null;
            const isRunning = entity.isRunning;

            return (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
                    {config.label}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {entity.totalRecordsSynced.toLocaleString()} records
                  </span>
                </div>
                <div style={{
                  height: 6, borderRadius: 3,
                  background: 'var(--bg-tertiary)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    background: isRunning
                      ? `linear-gradient(90deg, ${config.color}, ${config.color}80, ${config.color})`
                      : config.color,
                    backgroundSize: isRunning ? '200% 100%' : undefined,
                    animation: isRunning ? 'shimmer 1.5s infinite' : undefined,
                    width: entity.status === 'completed' ? '100%' : isRunning ? '65%' : '0%',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
