'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { adminFetch } from '@/lib/api-client';

interface Stats {
  totalCompanies: number;
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  avgOrderValue: number;
}

interface Activity {
  id: string;
  type: string;
  description: string;
  user?: string;
  createdAt: string;
}

interface SyncEntity {
  status: string;
  isRunning: boolean;
  lastCompletedAt: string | null;
  totalRecordsSynced: number;
  consecutiveFailures: number;
}

interface TopCompany {
  companyId: string;
  _count: { id: number };
  company?: { name: string };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ totalCompanies: 0, totalUsers: 0, totalOrders: 0, totalRevenue: 0, totalProducts: 0, avgOrderValue: 0 });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [syncStatus, setSyncStatus] = useState<Record<string, SyncEntity>>({});
  const [topCompanies, setTopCompanies] = useState<TopCompany[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState('');
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    try {
      const [statsRes, activityRes, syncRes, topRes] = await Promise.all([
        adminFetch('/api/v1/merchants/stats'),
        adminFetch('/api/v1/events/admin-activity?limit=8'),
        adminFetch('/api/v1/sync/status'),
        adminFetch('/api/v1/analytics/top-companies?limit=5'),
      ]);

      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats({
          totalCompanies: d.totalCompanies || 0,
          totalUsers: d.totalUsers || 0,
          totalOrders: d.totalOrders || 0,
          totalRevenue: Number(d.totalRevenue || 0),
          totalProducts: d.totalProducts || 0,
          avgOrderValue: Number(d.avgOrderValue || 0),
        });
      }

      if (activityRes.ok) {
        const d = await activityRes.json();
        setActivities(d.activities || d.data || []);
      }

      if (syncRes.ok) {
        const d = await syncRes.json();
        setSyncStatus(d.entities || {});
      }

      if (topRes.ok) {
        const d = await topRes.json();
        setTopCompanies(Array.isArray(d) ? d : d.data || []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleSync = async (type: 'initial' | 'products' | 'customers' | 'orders' = 'initial') => {
    setSyncing(true);
    setSyncResult('');
    try {
      const res = await adminFetch(`/api/v1/sync/${type}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (type === 'initial') {
          setSyncResult(`✅ Synced: ${data.products || 0} products, ${data.customers || 0} customers, ${data.orders || 0} orders`);
        } else {
          setSyncResult(`✅ ${type.charAt(0).toUpperCase() + type.slice(1)} sync completed`);
        }
        loadAll();
      } else {
        setSyncResult('❌ Sync failed. Check API connection.');
      }
    } catch {
      setSyncResult('❌ Sync error. Server might be unreachable.');
    } finally {
      setSyncing(false);
    }
  };

  const fmtRevenue = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const statsCards = [
    { title: 'Total Revenue', value: fmtRevenue(stats.totalRevenue), icon: 'ti-currency-dollar', color: '#34c759', bg: 'linear-gradient(135deg, #34c75920, #34c75908)' },
    { title: 'Orders', value: stats.totalOrders, icon: 'ti-shopping-cart', color: '#007aff', bg: 'linear-gradient(135deg, #007aff20, #007aff08)' },
    { title: 'Companies', value: stats.totalCompanies, icon: 'ti-building', color: '#5856d6', bg: 'linear-gradient(135deg, #5856d620, #5856d608)' },
    { title: 'Users', value: stats.totalUsers, icon: 'ti-users', color: '#ff9500', bg: 'linear-gradient(135deg, #ff950020, #ff950008)' },
    { title: 'Products', value: stats.totalProducts, icon: 'ti-package', color: '#af52de', bg: 'linear-gradient(135deg, #af52de20, #af52de08)' },
    { title: 'Avg Order', value: fmtRevenue(stats.avgOrderValue), icon: 'ti-chart-line', color: '#ff3b30', bg: 'linear-gradient(135deg, #ff3b3020, #ff3b3008)' },
  ];

  const syncEntities = [
    { key: 'products', label: 'Products', icon: 'ti-package', color: '#11998e' },
    { key: 'customers', label: 'Customers', icon: 'ti-users', color: '#667eea' },
    { key: 'orders', label: 'Orders', icon: 'ti-shopping-cart', color: '#f5576c' },
  ];

  const typeIcons: Record<string, { icon: string; color: string }> = {
    product: { icon: 'ti-package', color: '#af52de' },
    add: { icon: 'ti-shopping-cart', color: '#007aff' },
    page: { icon: 'ti-eye', color: '#8e8e93' },
    login: { icon: 'ti-login', color: '#34c759' },
    checkout: { icon: 'ti-credit-card', color: '#ff9500' },
    system: { icon: 'ti-settings', color: '#8e8e93' },
  };

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Loading...</p>
          </div>
        </div>
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="stat-card">
              <div className="skeleton" style={{ height: 14, width: 80, marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 28, width: 60 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Eagle B2B Commerce Overview</p>
        </div>
        <div className="page-header-actions">
          <button className="btn-apple primary" onClick={() => handleSync('initial')} disabled={syncing}>
            <i className={`ti ti-refresh ${syncing ? 'spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Full Sync'}
          </button>
        </div>
      </div>

      {syncResult && (
        <div className={`apple-alert ${syncResult.includes('❌') ? 'danger' : 'success'}`} style={{ marginBottom: 20 }}>
          <span>{syncResult}</span>
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6, fontSize: 16 }} onClick={() => setSyncResult('')}>
            <i className="ti ti-x" />
          </button>
        </div>
      )}

      {/* Stats Grid - 6 cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {statsCards.map((card) => (
          <div key={card.title} className="stat-card" style={{ background: card.bg }}>
            <div className="stat-icon" style={{ background: `${card.color}20`, color: card.color }}>
              <i className={`ti ${card.icon}`} />
            </div>
            <div className="stat-label">{card.title}</div>
            <div className="stat-value">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Main Content - 3 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginTop: 24 }}>

        {/* Recent Activity */}
        <div className="apple-card">
          <div className="apple-card-header">
            <h3 className="apple-card-title">Recent Activity</h3>
            <Link href="/activity" className="btn-apple ghost" style={{ fontSize: 13 }}>View All</Link>
          </div>
          <div className="apple-card-body" style={{ maxHeight: 360, overflowY: 'auto' }}>
            {activities.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 16px' }}>
                <div className="empty-state-icon"><i className="ti ti-activity" /></div>
                <h4 className="empty-state-title">No recent activity</h4>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {activities.map((a, i) => {
                  const t = typeIcons[a.type] || typeIcons.system;
                  return (
                    <div key={a.id || i} style={{
                      display: 'flex', gap: 10, padding: '10px 0',
                      borderBottom: i < activities.length - 1 ? '1px solid var(--border-light)' : 'none',
                    }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: `${t.color}14`, color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className={`ti ${t.icon}`} style={{ fontSize: 14 }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.description}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                          {a.user && <span>{a.user} · </span>}
                          {fmtDate(a.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sync Status - Live from backend */}
        <div className="apple-card">
          <div className="apple-card-header">
            <h3 className="apple-card-title">Shopify Sync</h3>
            <Link href="/settings/sync-logs" className="btn-apple ghost" style={{ fontSize: 13 }}>Logs</Link>
          </div>
          <div className="apple-card-body">
            {syncEntities.map(entity => {
              const state = syncStatus[entity.key];
              const isRunning = state?.isRunning;
              const hasError = (state?.consecutiveFailures || 0) > 0;
              const statusColor = isRunning ? '#ff9500' : hasError ? '#ff3b30' : '#34c759';
              const statusText = isRunning ? 'Syncing...' : hasError ? 'Error' : state ? 'Ready' : 'Not configured';

              return (
                <div key={entity.key} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
                  borderBottom: '1px solid var(--border-light)',
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${entity.color}14`, color: entity.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className={`ti ${entity.icon}`} style={{ fontSize: 18 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{entity.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                      {state?.totalRecordsSynced || 0} synced · Last: {fmtDate(state?.lastCompletedAt || null)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 4, background: statusColor }} />
                    <span style={{ fontSize: 12, color: statusColor, fontWeight: 500 }}>{statusText}</span>
                    <button
                      className="btn-apple ghost small"
                      onClick={() => handleSync(entity.key as 'products' | 'customers' | 'orders')}
                      disabled={syncing}
                      title={`Sync ${entity.label}`}
                    >
                      <i className={`ti ti-refresh ${isRunning ? 'spin' : ''}`} style={{ fontSize: 14 }} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Quick Sync Actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn-apple secondary small" style={{ flex: 1, justifyContent: 'center' }} onClick={() => handleSync('initial')} disabled={syncing}>
                <i className="ti ti-refresh" /> Full Sync
              </button>
              <Link href="/settings/sync-logs" className="btn-apple ghost small" style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}>
                <i className="ti ti-list" /> View Logs
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Actions + Top Companies */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="apple-card">
            <div className="apple-card-header">
              <h3 className="apple-card-title">Quick Actions</h3>
            </div>
            <div className="apple-card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { title: 'Add Company', icon: 'ti-building-plus', href: '/companies/invite', color: '#007aff' },
                  { title: 'View Orders', icon: 'ti-list-check', href: '/orders', color: '#ff9500' },
                  { title: 'Catalog', icon: 'ti-package', href: '/catalog', color: '#af52de' },
                  { title: 'Analytics', icon: 'ti-chart-bar', href: '/analytics', color: '#34c759' },
                  { title: 'Pricing', icon: 'ti-discount', href: '/pricing', color: '#ff3b30' },
                  { title: 'Support', icon: 'ti-help', href: '/support', color: '#5856d6' },
                ].map((action) => (
                  <Link
                    key={action.title}
                    href={action.href}
                    className="btn-apple secondary small"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-start', textDecoration: 'none', fontSize: 12 }}
                  >
                    <i className={`ti ${action.icon}`} style={{ color: action.color, fontSize: 16 }} />
                    {action.title}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Top Companies */}
          <div className="apple-card">
            <div className="apple-card-header">
              <h3 className="apple-card-title">Top Companies</h3>
              <Link href="/companies" className="btn-apple ghost" style={{ fontSize: 13 }}>View All</Link>
            </div>
            <div className="apple-card-body">
              {topCompanies.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', padding: 16 }}>No data yet</div>
              ) : (
                topCompanies.map((tc, i) => (
                  <div key={tc.companyId || i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 0', borderBottom: i < topCompanies.length - 1 ? '1px solid var(--border-light)' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', width: 16 }}>#{i + 1}</span>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{tc.company?.name || 'Unknown'}</span>
                    </div>
                    <span className="badge-apple info" style={{ fontSize: 11 }}>{tc._count?.id || 0} orders</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
