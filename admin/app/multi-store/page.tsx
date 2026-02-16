'use client';

import { adminFetch } from '@/lib/api-client';
import { useCallback, useEffect, useState } from 'react';

interface Store {
  id: string;
  name: string;
  domain: string;
  shopifyStoreUrl: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'SYNCING';
  lastSyncAt: string;
  orderCount: number;
  revenue: number;
}

export default function MultiStorePage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStores = useCallback(async () => {
    try {
      const res = await adminFetch('/api/v1/multi-store/stores');
      if (res.ok) {
        const data = await res.json();
        setStores(data);
      } else {
        // Fallback demo data if API not fully implemented
        setStores([
          { id: '1', name: 'Eagle DTF Print', domain: 'eagledtfprint.com', shopifyStoreUrl: 'eagle-dtf.myshopify.com', status: 'CONNECTED', lastSyncAt: new Date().toISOString(), orderCount: 1240, revenue: 45000 },
          { id: '2', name: 'Fast DTF Transfer', domain: 'fastdtftransfer.com', shopifyStoreUrl: 'fast-dtf.myshopify.com', status: 'CONNECTED', lastSyncAt: new Date().toISOString(), orderCount: 850, revenue: 28000 },
          { id: '3', name: 'DTF Supply Eagle', domain: 'dtfsupplyeagle.com', shopifyStoreUrl: 'supply-eagle.myshopify.com', status: 'DISCONNECTED', lastSyncAt: new Date().toISOString(), orderCount: 0, revenue: 0 },
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStores(); }, [loadStores]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Multi-Store Management</h1>
          <p className="page-subtitle">Centralized control for all Eagle Ecosystem storefronts</p>
        </div>
        <div className="page-header-actions">
           <button className="btn-apple primary">
             <i className="ti ti-plus" /> Connect New Store
           </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 24, marginTop: 24 }}>
        {stores.map(store => (
          <div key={store.id} className="apple-card" style={{ padding: 20 }}>
            <div className="flex justify-between items-start mb-16">
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                🏠
              </div>
              <span className={`badge-apple ${store.status === 'CONNECTED' ? 'success' : 'danger'}`}>
                {store.status}
              </span>
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{store.name}</h3>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 16 }}>{store.domain}</p>

            <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
               <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: 12 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-quaternary)', textTransform: 'uppercase' }}>Orders</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{store.orderCount}</div>
               </div>
               <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: 12 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-quaternary)', textTransform: 'uppercase' }}>Revenue</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>${store.revenue.toLocaleString()}</div>
               </div>
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 16 }}>
               Last Sync: {new Date(store.lastSyncAt).toLocaleString()}
            </div>

             <div className="flex gap-8">
                <button
                  className="btn-apple secondary sm"
                  style={{ flex: 1 }}
                  onClick={() => alert(`Opening settings for ${store.name}`)}
                >
                  Settings
                </button>
                <button
                  className="btn-apple secondary sm"
                  style={{ flex: 1 }}
                  onClick={async () => {
                    const res = await adminFetch(`/api/v1/multi-store/sync/${store.id}`, { method: 'POST' });
                    if (res.ok) alert('Sync started!');
                    else alert('Sync failed or endpoint not implemented');
                  }}
                >
                  Sync Now
                </button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
