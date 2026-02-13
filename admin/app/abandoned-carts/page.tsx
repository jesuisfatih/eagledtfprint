'use client';

import { PageHeader, StatsCard, StatusBadge } from '@/components/ui';
import { adminFetch } from '@/lib/api-client';
import { useEffect, useState } from 'react';

interface AbandonedCart {
  id: string;
  total: string | number;
  status: string;
  createdAt: string;
  items: any[];
  createdBy?: { email: string; firstName?: string; lastName?: string };
  company?: { name: string };
  shopifyCheckoutUrl?: string;
}

export default function AbandonedCartsPage() {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminFetch('/api/v1/abandoned-carts');
        if (res.ok) { const d = await res.json(); setCarts(d.carts || d.data || d || []); }
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, []);

  const totalValue = carts.reduce((sum, c) => sum + parseFloat(String(c.total || '0')), 0);
  const recovered = carts.filter(c => c.status === 'recovered').length;

  return (
    <div>
      <PageHeader title="Abandoned Carts" subtitle={`${carts.length} abandoned carts`} />

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <StatsCard title="Total Carts" value={carts.length} icon="shopping-cart-off" iconColor="warning" loading={loading} />
        <StatsCard title="Lost Revenue" value={`$${totalValue.toFixed(2)}`} icon="currency-dollar" iconColor="danger" loading={loading} />
        <StatsCard title="Recovered" value={recovered} icon="check" iconColor="success" loading={loading} />
      </div>

      <div className="apple-card" style={{ marginTop: 20 }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}><i className="ti ti-loader-2 spin" style={{ fontSize: 24, color: 'var(--accent-primary)' }} /></div>
        ) : carts.length === 0 ? (
          <div className="empty-state" style={{ padding: 48 }}>
            <div className="empty-state-icon"><i className="ti ti-shopping-cart-off" /></div>
            <h4 className="empty-state-title">No abandoned carts</h4>
            <p className="empty-state-desc">Good news! No abandoned carts found.</p>
          </div>
        ) : (
          <table className="apple-table">
            <thead><tr><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {carts.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{c.createdBy ? `${c.createdBy.firstName || ''} ${c.createdBy.lastName || ''}`.trim() || 'Guest' : 'Guest'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{c.createdBy?.email || c.company?.name || '-'}</div>
                  </td>
                  <td>{c.items?.length || 0} items</td>
                  <td style={{ fontWeight: 500 }}>${parseFloat(String(c.total || '0')).toFixed(2)}</td>
                  <td><StatusBadge status={c.status} colorMap={{ abandoned: 'warning', recovered: 'success', expired: 'secondary' }} /></td>
                  <td style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td>
                    {c.shopifyCheckoutUrl && (
                      <a href={c.shopifyCheckoutUrl} target="_blank" rel="noopener noreferrer" className="btn-apple primary small" style={{ textDecoration: 'none' }}>
                        <i className="ti ti-mail" /> Send Recovery
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
