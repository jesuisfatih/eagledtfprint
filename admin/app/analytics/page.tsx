'use client';

import { PageHeader, StatsCard } from '@/components/ui';
import { adminFetch } from '@/lib/api-client';
import { useCallback, useEffect, useState } from 'react';

interface TopCompany {
  id: string;
  name: string;
  orderCount: number;
  totalSpent: number;
}

interface FunnelStep {
  name: string;
  count: number;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState({ totalCompanies: 0, totalUsers: 0, totalOrders: 0, totalRevenue: 0, totalProducts: 0, avgOrderValue: 0, totalEvents: 0 });
  const [funnel, setFunnel] = useState<{ steps: FunnelStep[]; conversionRate: string | number }>({ steps: [], conversionRate: '0' });
  const [topCompanies, setTopCompanies] = useState<TopCompany[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    try {
      const [statsRes, analyticsRes, funnelRes, topCompRes] = await Promise.all([
        adminFetch('/api/v1/merchants/stats'),
        adminFetch('/api/v1/analytics/dashboard'),
        adminFetch('/api/v1/analytics/funnel'),
        adminFetch('/api/v1/analytics/top-companies?limit=10'),
      ]);

      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(prev => ({ ...prev,
          totalCompanies: d.totalCompanies || 0,
          totalUsers: d.totalUsers || 0,
          totalOrders: d.totalOrders || 0,
          totalRevenue: Number(d.totalRevenue || 0),
          totalProducts: d.totalProducts || 0,
          avgOrderValue: Number(d.avgOrderValue || 0),
        }));
      }

      if (analyticsRes.ok) {
        const d = await analyticsRes.json();
        setStats(prev => ({ ...prev, totalEvents: d.totalEvents || 0 }));
      }

      if (funnelRes.ok) {
        const d = await funnelRes.json();
        setFunnel(d);
      }

      if (topCompRes.ok) {
        const d = await topCompRes.json();
        setTopCompanies(Array.isArray(d) ? d : []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const fmtMoney = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const funnelIcons: Record<string, { icon: string; color: string }> = {
    'Product Views': { icon: 'ti-eye', color: '#007aff' },
    'Add to Cart': { icon: 'ti-shopping-cart-plus', color: '#5856d6' },
    'Checkouts': { icon: 'ti-credit-card', color: '#ff9500' },
    'Orders': { icon: 'ti-check', color: '#34c759' },
  };

  const maxFunnel = Math.max(...(funnel.steps?.map(s => s.count) || [1]), 1);

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Platform performance & conversion insights"
        actions={[{ label: 'Refresh', icon: 'refresh', variant: 'secondary', onClick: loadAll }]} />

      {/* KPI Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <StatsCard title="Total Revenue" value={fmtMoney(stats.totalRevenue)} icon="currency-dollar" iconColor="success" loading={loading} />
        <StatsCard title="Total Orders" value={stats.totalOrders} icon="shopping-cart" iconColor="primary" loading={loading} />
        <StatsCard title="Avg Order Value" value={fmtMoney(stats.avgOrderValue)} icon="chart-line" iconColor="info" loading={loading} />
        <StatsCard title="Products" value={stats.totalProducts} icon="package" iconColor="warning" loading={loading} />
        <StatsCard title="Companies" value={stats.totalCompanies} icon="building" iconColor="primary" loading={loading} />
        <StatsCard title="Tracked Events" value={stats.totalEvents.toLocaleString()} icon="activity" iconColor="danger" loading={loading} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
        {/* Conversion Funnel - Live Data */}
        <div className="apple-card">
          <div className="apple-card-header">
            <h3 className="apple-card-title">Conversion Funnel</h3>
            <span className="badge-apple info">
              {funnel.conversionRate}% conversion
            </span>
          </div>
          <div className="apple-card-body">
            {(funnel.steps?.length || 0) === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <div className="empty-state-icon"><i className="ti ti-chart-funnel" /></div>
                <h4 className="empty-state-title">No funnel data yet</h4>
                <p className="empty-state-desc">Funnel data appears as users browse, add to cart, and place orders.</p>
              </div>
            ) : (
              funnel.steps.map((step, i) => {
                const fi = funnelIcons[step.name] || { icon: 'ti-point', color: '#8e8e93' };
                const pct = maxFunnel > 0 ? (step.count / maxFunnel) * 100 : 0;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: `${fi.color}14`, color: fi.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={`ti ${fi.icon}`} style={{ fontSize: 20 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontWeight: 500, fontSize: 14 }}>{step.name}</span>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{step.count.toLocaleString()}</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${fi.color}, ${fi.color}aa)`, borderRadius: 4, transition: 'width 0.8s ease' }} />
                      </div>
                      {i < funnel.steps.length - 1 && step.count > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                          → {funnel.steps[i + 1] ? ((funnel.steps[i + 1].count / step.count) * 100).toFixed(1) : 0}% proceed
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Top Companies by Revenue */}
        <div className="apple-card">
          <div className="apple-card-header">
            <h3 className="apple-card-title">Top Companies by Revenue</h3>
          </div>
          <div className="apple-card-body">
            {topCompanies.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <div className="empty-state-icon"><i className="ti ti-building" /></div>
                <h4 className="empty-state-title">No company data yet</h4>
                <p className="empty-state-desc">Revenue rankings will appear after orders are placed.</p>
              </div>
            ) : (
              <table className="apple-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Company</th>
                    <th style={{ textAlign: 'right' }}>Orders</th>
                    <th style={{ textAlign: 'right' }}>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topCompanies.sort((a, b) => b.totalSpent - a.totalSpent).map((tc, i) => (
                    <tr key={tc.id}>
                      <td style={{ width: 32 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, fontSize: 11, fontWeight: 600,
                          background: i < 3 ? ['#ffd70020', '#c0c0c020', '#cd7f3220'][i] : 'var(--bg-tertiary)',
                          color: i < 3 ? ['#b8860b', '#808080', '#8b4513'][i] : 'var(--text-tertiary)',
                        }}>{i + 1}</span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{tc.name}</td>
                      <td style={{ textAlign: 'right' }}>{tc.orderCount}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent-primary)' }}>{fmtMoney(tc.totalSpent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Platform Overview */}
      <div className="apple-card" style={{ marginTop: 20 }}>
        <div className="apple-card-header"><h3 className="apple-card-title">Platform Overview</h3></div>
        <div className="apple-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            {[
              { label: 'Active Users', value: stats.totalUsers, icon: 'ti-users', color: '#ff9500' },
              { label: 'Products Listed', value: stats.totalProducts, icon: 'ti-package', color: '#af52de' },
              { label: 'B2B Companies', value: stats.totalCompanies, icon: 'ti-building', color: '#5856d6' },
              { label: 'Revenue per Company', value: stats.totalCompanies > 0 ? fmtMoney(stats.totalRevenue / stats.totalCompanies) : '$0.00', icon: 'ti-chart-bar', color: '#34c759' },
              { label: 'Orders per Company', value: stats.totalCompanies > 0 ? (stats.totalOrders / stats.totalCompanies).toFixed(1) : '0', icon: 'ti-receipt', color: '#007aff' },
              { label: 'User / Company Ratio', value: stats.totalCompanies > 0 ? (stats.totalUsers / stats.totalCompanies).toFixed(1) : '0', icon: 'ti-users-group', color: '#ff3b30' },
            ].map(item => (
              <div key={item.label} style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 12, transition: 'transform 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <i className={`ti ${item.icon}`} style={{ fontSize: 16, color: item.color }} />
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{item.label}</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
