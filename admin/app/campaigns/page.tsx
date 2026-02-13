'use client';

import { PageHeader } from '@/components/ui/PageLayout';
import { showToast } from '@/components/ui/Toast';
import { adminFetch } from '@/lib/api-client';
import { useCallback, useEffect, useState } from 'react';

interface SyncStatus {
  companies: number;
  intelligence: number;
  orders: number;
  events: number;
}

export default function CampaignsPage() {
  const [dashboardUrl, setDashboardUrl] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<SyncStatus | null>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'sync'>('dashboard');

  useEffect(() => {
    adminFetch('/api/v1/dittofeed/dashboard-url').then(r => r.json()).then(d => {
      setDashboardUrl(d.url);
    }).catch(() => {});
  }, []);

  const runFullSync = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await adminFetch('/api/v1/dittofeed/sync/all', { method: 'POST' });
      if (!res.ok) throw new Error('Sync failed');
      const data = await res.json();
      setLastSync(data);
      showToast(`Synced: ${data.companies} users, ${data.intelligence} intel, ${data.orders} orders, ${data.events} events`, 'success');
    } catch {
      showToast('Sync failed', 'danger');
    } finally {
      setSyncing(false);
    }
  }, []);

  const runPartialSync = useCallback(async (type: string) => {
    setSyncing(true);
    try {
      const res = await adminFetch(`/api/v1/dittofeed/sync/${type}`, { method: 'POST' });
      if (!res.ok) throw new Error('Sync failed');
      const data = await res.json();
      showToast(`${type} sync: ${data.synced} items synced`, 'success');
    } catch {
      showToast(`${type} sync failed`, 'danger');
    } finally {
      setSyncing(false);
    }
  }, []);

  return (
    <>
      <PageHeader
        title="Campaigns"
        subtitle="Segmentation & campaign management powered by Dittofeed"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`btn-apple ${activeView === 'dashboard' ? '' : 'secondary'} sm`}
              onClick={() => setActiveView('dashboard')}
            >
              <i className="ti ti-layout-dashboard" style={{ fontSize: 14 }} /> Dashboard
            </button>
            <button
              className={`btn-apple ${activeView === 'sync' ? '' : 'secondary'} sm`}
              onClick={() => setActiveView('sync')}
            >
              <i className="ti ti-refresh" style={{ fontSize: 14 }} /> Data Sync
            </button>
          </div>
        }
      />

      {activeView === 'dashboard' && (
        <div style={{ marginTop: 20 }}>
          {dashboardUrl ? (
            <div className="apple-card" style={{ overflow: 'hidden', borderRadius: 16 }}>
              <iframe
                src={`${dashboardUrl}/dashboard`}
                style={{
                  width: '100%',
                  height: 'calc(100vh - 180px)',
                  border: 'none',
                  borderRadius: 16,
                }}
                title="Dittofeed Campaigns"
              />
            </div>
          ) : (
            <div className="apple-card" style={{ padding: 60, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Dittofeed Not Connected</h3>
              <p style={{ color: 'var(--text-tertiary)', fontSize: 14, maxWidth: 400, margin: '0 auto 20px' }}>
                Set DITTOFEED_WRITE_KEY and DITTOFEED_HOST environment variables to connect your
                segmentation and campaign engine.
              </p>
            </div>
          )}
        </div>
      )}

      {activeView === 'sync' && (
        <div style={{ marginTop: 20 }}>
          {/* Sync Overview */}
          <div className="apple-card" style={{ padding: 24, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 4 }}>
                  <i className="ti ti-database" style={{ color: 'var(--accent-blue)', marginRight: 8 }} />
                  Eagle → Dittofeed Data Pipeline
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>
                  Sync your company data, intelligence metrics, orders, and visitor events to Dittofeed for segmentation.
                </p>
              </div>
              <button
                className="btn-apple sm"
                onClick={runFullSync}
                disabled={syncing}
              >
                {syncing ? (
                  <><i className="ti ti-loader-2 spin" style={{ fontSize: 14 }} /> Syncing...</>
                ) : (
                  <><i className="ti ti-refresh" style={{ fontSize: 14 }} /> Full Sync</>
                )}
              </button>
            </div>

            {lastSync && (
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
                padding: 16, background: 'var(--bg-primary)', borderRadius: 12,
                border: '1px solid var(--border-primary)',
              }}>
                {[
                  { label: 'Company Users', value: lastSync.companies, icon: 'ti-users', color: '#007aff' },
                  { label: 'Intel Profiles', value: lastSync.intelligence, icon: 'ti-brain', color: '#5856d6' },
                  { label: 'Orders', value: lastSync.orders, icon: 'ti-shopping-cart', color: '#34c759' },
                  { label: 'Events', value: lastSync.events, icon: 'ti-activity', color: '#ff9500' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <i className={`ti ${s.icon}`} style={{ fontSize: 20, color: s.color, marginBottom: 4 }} />
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Individual Sync Modules */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {[
              {
                title: 'Companies & Users',
                desc: 'Sync all company profiles and their users with traits (name, email, role, status)',
                icon: 'ti-building', color: '#007aff', endpoint: 'companies',
                traits: ['Company Name', 'Status', 'Email', 'Role', 'First/Last Name'],
              },
              {
                title: 'Company Intelligence',
                desc: 'Push engagement scores, buyer intent, churn risk, revenue, and segment data',
                icon: 'ti-brain', color: '#5856d6', endpoint: 'intelligence',
                traits: ['Engagement Score', 'Buyer Intent', 'Churn Risk', 'Total Revenue', 'Segment', 'AOV'],
              },
              {
                title: 'Orders',
                desc: 'Track order events — total price, status, company association (last 30 days)',
                icon: 'ti-shopping-cart', color: '#34c759', endpoint: 'orders',
                traits: ['Order Total', 'Financial Status', 'Fulfillment', 'Line Items', 'Company'],
              },
              {
                title: 'Visitor Events',
                desc: 'Product views, add to carts, page views — behavioral events from snippet',
                icon: 'ti-click', color: '#ff9500', endpoint: 'events',
                traits: ['Product View', 'Add to Cart', 'Page View', 'Collection View', 'Search'],
              },
            ].map(m => (
              <div key={m.endpoint} className="apple-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: `${m.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <i className={`ti ${m.icon}`} style={{ fontSize: 18, color: m.color }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{m.title}</div>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5, margin: '0 0 12px' }}>{m.desc}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14 }}>
                  {m.traits.map(t => (
                    <span key={t} style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 6,
                      background: `${m.color}14`, color: m.color, fontWeight: 600,
                    }}>{t}</span>
                  ))}
                </div>
                <button
                  className="btn-apple secondary sm"
                  style={{ width: '100%' }}
                  onClick={() => runPartialSync(m.endpoint)}
                  disabled={syncing}
                >
                  <i className="ti ti-refresh" style={{ fontSize: 13 }} /> Sync {m.title}
                </button>
              </div>
            ))}
          </div>

          {/* Data Flow Diagram */}
          <div className="apple-card" style={{ padding: 24, marginTop: 20 }}>
            <h4 style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 16 }}>
              <i className="ti ti-git-merge" style={{ color: 'var(--accent-blue)', marginRight: 6 }} />
              Data Flow Architecture
            </h4>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              flexWrap: 'wrap', fontSize: 13, color: 'var(--text-secondary)',
            }}>
              {[
                { icon: 'ti-brand-shopify', label: 'Shopify', color: '#95bf47' },
                { icon: 'ti-arrow-right', label: '', color: 'var(--text-tertiary)' },
                { icon: 'ti-database', label: 'Eagle DB', color: '#007aff' },
                { icon: 'ti-arrow-right', label: '', color: 'var(--text-tertiary)' },
                { icon: 'ti-brain', label: 'Intelligence', color: '#5856d6' },
                { icon: 'ti-arrow-right', label: '', color: 'var(--text-tertiary)' },
                { icon: 'ti-send', label: 'Dittofeed', color: '#ff6b35' },
                { icon: 'ti-arrow-right', label: '', color: 'var(--text-tertiary)' },
                { icon: 'ti-filter', label: 'Segments', color: '#34c759' },
                { icon: 'ti-arrow-right', label: '', color: 'var(--text-tertiary)' },
                { icon: 'ti-speakerphone', label: 'Campaigns', color: '#ff2d55' },
              ].map((n, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <i className={`ti ${n.icon}`} style={{ fontSize: 18, color: n.color }} />
                  {n.label && <span style={{ fontWeight: 600 }}>{n.label}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
