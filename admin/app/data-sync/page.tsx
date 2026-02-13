'use client';

import { PageHeader } from '@/components/ui/PageLayout';
import { showToast } from '@/components/ui/Toast';
import { adminFetch } from '@/lib/api-client';
import { useState } from 'react';

export default function DataSyncPage() {
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, number>>({});

  const sync = async (endpoint: string, label: string) => {
    setSyncing(p => ({ ...p, [endpoint]: true }));
    try {
      const res = await adminFetch(`/api/v1/dittofeed/sync/${endpoint}`, { method: 'POST' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const count = data.synced ?? data.companies ?? 0;
      setResults(p => ({ ...p, [endpoint]: count }));
      showToast(`${label}: ${count} items synced`, 'success');
    } catch {
      showToast(`${label} sync failed`, 'danger');
    } finally {
      setSyncing(p => ({ ...p, [endpoint]: false }));
    }
  };

  const fullSync = async () => {
    setSyncing(p => ({ ...p, all: true }));
    try {
      const res = await adminFetch('/api/v1/dittofeed/sync/all', { method: 'POST' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResults({
        companies: data.companies,
        intelligence: data.intelligence,
        orders: data.orders,
        events: data.events,
      });
      showToast('Full sync complete!', 'success');
    } catch {
      showToast('Full sync failed', 'danger');
    } finally {
      setSyncing(p => ({ ...p, all: false }));
    }
  };

  const modules = [
    { key: 'companies', label: 'Companies & Users', icon: 'ti-building', color: '#007aff',
      desc: 'Sync company profiles and user accounts to Dittofeed. Each user becomes an identity with company traits.',
      dataPoints: ['Company Name', 'Status', 'User Email', 'First/Last Name', 'Role'] },
    { key: 'intelligence', label: 'Company Intelligence', icon: 'ti-brain', color: '#5856d6',
      desc: 'Push computed intelligence metrics — engagement score, buyer intent, segment classification, churn risk predictions.',
      dataPoints: ['Engagement Score', 'Buyer Intent', 'Segment', 'Churn Risk', 'Upsell Potential', 'Total Revenue', 'AOV', 'Days Since Order'] },
    { key: 'orders', label: 'Order Events', icon: 'ti-shopping-cart', color: '#34c759',
      desc: 'Send order placement events. Each order becomes a trackable event with price, status, and company info.',
      dataPoints: ['Order Total', 'Financial Status', 'Fulfillment Status', 'Company Association'] },
    { key: 'events', label: 'Visitor Behavior', icon: 'ti-click', color: '#ff9500',
      desc: 'Push product views, add-to-cart events, page views from the Eagle snippet into Dittofeed for behavioral segmentation.',
      dataPoints: ['Product Views', 'Add to Cart', 'Page Views', 'Collection Views', 'Product Title', 'Page URL'] },
  ];

  return (
    <>
      <PageHeader
        title="Data Sync"
        subtitle="Sync Eagle Engine data → Dittofeed segmentation engine"
        actions={
          <button className="btn-apple sm" onClick={fullSync} disabled={syncing.all}>
            {syncing.all ? <><i className="ti ti-loader-2 spin" style={{ fontSize: 14 }}/> Syncing All...</> : <><i className="ti ti-refresh" style={{ fontSize: 14 }}/> Full Sync</>}
          </button>
        }
      />

      {/* Architecture */}
      <div className="apple-card" style={{ padding: 24, marginTop: 20, marginBottom: 20 }}>
        <h4 style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 16 }}>
          <i className="ti ti-git-merge" style={{ color: 'var(--accent-blue)', marginRight: 6 }}/>Data Pipeline
        </h4>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          {[
            { icon: 'ti-brand-shopify', label: 'Shopify', sub: 'Orders, Products, Customers', color: '#95bf47' },
            { icon: 'ti-code', label: 'Eagle Snippet', sub: 'Fingerprints, Events, Sessions', color: '#007aff' },
            { icon: 'ti-database', label: 'Eagle DB', sub: 'PostgreSQL', color: '#336791' },
            { icon: 'ti-brain', label: 'Intelligence Engine', sub: 'Scoring & Classification', color: '#5856d6' },
            { icon: 'ti-send', label: 'Dittofeed', sub: 'Segments & Campaigns', color: '#ff6b35' },
          ].map((n, i, arr) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${n.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}>
                  <i className={`ti ${n.icon}`} style={{ fontSize: 22, color: n.color }}/>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{n.label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{n.sub}</div>
              </div>
              {i < arr.length - 1 && <i className="ti ti-chevron-right" style={{ fontSize: 16, color: 'var(--text-tertiary)' }}/>}
            </div>
          ))}
        </div>
      </div>

      {/* Sync Modules */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {modules.map(m => (
          <div key={m.key} className="apple-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 11, background: `${m.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`ti ${m.icon}`} style={{ fontSize: 20, color: m.color }}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{m.label}</div>
                {results[m.key] != null && (
                  <div style={{ fontSize: 11, color: '#34c759', fontWeight: 600 }}>
                    ✓ {results[m.key]} synced
                  </div>
                )}
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5, margin: '0 0 12px' }}>{m.desc}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14 }}>
              {m.dataPoints.map(d => (
                <span key={d} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: `${m.color}14`, color: m.color, fontWeight: 600 }}>{d}</span>
              ))}
            </div>
            <button
              className="btn-apple secondary sm"
              style={{ width: '100%' }}
              onClick={() => sync(m.key, m.label)}
              disabled={!!syncing[m.key]}
            >
              {syncing[m.key] ? <><i className="ti ti-loader-2 spin" style={{ fontSize: 13 }}/> Syncing...</> : <><i className="ti ti-refresh" style={{ fontSize: 13 }}/> Sync {m.label}</>}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
