'use client';

import { PageHeader } from '@/components/ui/PageLayout';
import { showToast } from '@/components/ui/Toast';
import { adminFetch } from '@/lib/api-client';
import { useEffect, useState } from 'react';

interface CompanyIntel {
  id: string;
  companyId: string;
  company: { id: string; name: string; status: string };
  segment: string;
  buyerIntent: string;
  engagementScore: number;
  totalSessions: number;
  totalPageViews: number;
  totalProductViews: number;
  totalAddToCarts: number;
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  churnRisk: number;
  upsellPotential: number;
  daysSinceLastOrder?: number;
  lastActiveAt?: string;
}

const SEGMENT_COLORS: Record<string, string> = {
  new: '#8e8e93', active: '#007aff', loyal: '#34c759',
  interested: '#ff9500', at_risk: '#ff3b30', churned: '#636366', vip: '#af52de',
};

const INTENT_COLORS: Record<string, string> = {
  low: '#8e8e93', medium: '#ff9500', high: '#34c759', very_high: '#007aff',
};

export default function SegmentsPage() {
  const [intels, setIntels] = useState<CompanyIntel[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSegment, setFilterSegment] = useState('all');
  const [filterIntent, setFilterIntent] = useState('all');
  const [sortBy, setSortBy] = useState<'revenue' | 'churn' | 'engagement' | 'orders'>('revenue');

  useEffect(() => {
    adminFetch('/api/v1/analytics/company-intelligence')
      .then(r => r.json())
      .then(data => {
        setIntels(Array.isArray(data) ? data : data.data || []);
      })
      .catch(() => showToast('Failed to load segments', 'danger'))
      .finally(() => setLoading(false));
  }, []);

  // Compute segment counts
  const segmentCounts: Record<string, number> = {};
  intels.forEach(i => { segmentCounts[i.segment] = (segmentCounts[i.segment] || 0) + 1; });

  const intentCounts: Record<string, number> = {};
  intels.forEach(i => { intentCounts[i.buyerIntent] = (intentCounts[i.buyerIntent] || 0) + 1; });

  // Filter + Sort
  let filtered = intels;
  if (filterSegment !== 'all') filtered = filtered.filter(i => i.segment === filterSegment);
  if (filterIntent !== 'all') filtered = filtered.filter(i => i.buyerIntent === filterIntent);

  filtered = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'revenue': return b.totalRevenue - a.totalRevenue;
      case 'churn': return b.churnRisk - a.churnRisk;
      case 'engagement': return b.engagementScore - a.engagementScore;
      case 'orders': return b.totalOrders - a.totalOrders;
      default: return 0;
    }
  });

  const totalRevenue = intels.reduce((s, i) => s + Number(i.totalRevenue), 0);
  const avgChurn = intels.length ? intels.reduce((s, i) => s + Number(i.churnRisk), 0) / intels.length : 0;
  const avgEngagement = intels.length ? intels.reduce((s, i) => s + Number(i.engagementScore), 0) / intels.length : 0;

  return (
    <>
      <PageHeader
        title="Segments"
        subtitle="Company segmentation based on behavior, revenue, and engagement"
      />

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginTop: 20 }}>
        {[
          { label: 'Total Companies', value: intels.length, icon: 'ti-building', color: '#007aff' },
          { label: 'Total Revenue', value: `$${(totalRevenue).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: 'ti-currency-dollar', color: '#34c759' },
          { label: 'Avg Churn Risk', value: `${(avgChurn * 100).toFixed(0)}%`, icon: 'ti-alert-triangle', color: avgChurn > 0.5 ? '#ff3b30' : '#ff9500' },
          { label: 'Avg Engagement', value: `${(avgEngagement * 100).toFixed(0)}%`, icon: 'ti-chart-bar', color: '#5856d6' },
          { label: 'Segments', value: Object.keys(segmentCounts).length, icon: 'ti-category', color: '#af52de' },
        ].map(s => (
          <div key={s.label} className="apple-card" style={{ padding: 16, textAlign: 'center' }}>
            <i className={`ti ${s.icon}`} style={{ fontSize: 20, color: s.color, marginBottom: 6 }} />
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Segment bubbles + Intent bubbles */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
        <div className="apple-card" style={{ padding: 20 }}>
          <h4 style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: 'var(--text-primary)' }}>
            <i className="ti ti-category" style={{ marginRight: 6, color: '#007aff' }} />Segments
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              className={`btn-apple ${filterSegment === 'all' ? '' : 'secondary'} sm`}
              onClick={() => setFilterSegment('all')}
              style={{ fontSize: 12 }}
            >All ({intels.length})</button>
            {Object.entries(segmentCounts).sort((a, b) => b[1] - a[1]).map(([seg, count]) => (
              <button
                key={seg}
                className={`btn-apple ${filterSegment === seg ? '' : 'secondary'} sm`}
                onClick={() => setFilterSegment(filterSegment === seg ? 'all' : seg)}
                style={{
                  fontSize: 12,
                  borderColor: SEGMENT_COLORS[seg] || '#8e8e93',
                  ...(filterSegment === seg ? { background: SEGMENT_COLORS[seg], color: '#fff' } : {}),
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: 4, display: 'inline-block', marginRight: 4,
                  background: SEGMENT_COLORS[seg] || '#8e8e93',
                }} />
                {seg.replace('_', ' ')} ({count})
              </button>
            ))}
          </div>
        </div>
        <div className="apple-card" style={{ padding: 20 }}>
          <h4 style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: 'var(--text-primary)' }}>
            <i className="ti ti-target" style={{ marginRight: 6, color: '#ff9500' }} />Buyer Intent
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              className={`btn-apple ${filterIntent === 'all' ? '' : 'secondary'} sm`}
              onClick={() => setFilterIntent('all')}
              style={{ fontSize: 12 }}
            >All</button>
            {Object.entries(intentCounts).sort((a, b) => b[1] - a[1]).map(([intent, count]) => (
              <button
                key={intent}
                className={`btn-apple ${filterIntent === intent ? '' : 'secondary'} sm`}
                onClick={() => setFilterIntent(filterIntent === intent ? 'all' : intent)}
                style={{
                  fontSize: 12,
                  ...(filterIntent === intent ? { background: INTENT_COLORS[intent], color: '#fff' } : {}),
                }}
              >
                {intent.replace('_', ' ')} ({count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sort controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600 }}>Sort by:</span>
        {(['revenue', 'churn', 'engagement', 'orders'] as const).map(s => (
          <button
            key={s}
            className={`btn-apple ${sortBy === s ? '' : 'secondary'} sm`}
            onClick={() => setSortBy(s)}
            style={{ fontSize: 11, textTransform: 'capitalize' }}
          >{s}</button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-tertiary)' }}>
          {filtered.length} companies
        </span>
      </div>

      {/* Company Table */}
      {loading ? (
        <div className="apple-card" style={{ padding: 60, textAlign: 'center' }}>
          <i className="ti ti-loader-2 spin" style={{ fontSize: 24, color: 'var(--text-tertiary)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="apple-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>
          No companies match the selected filters
        </div>
      ) : (
        <div className="apple-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-primary)' }}>
                {['Company', 'Segment', 'Intent', 'Revenue', 'Orders', 'AOV', 'Engagement', 'Churn Risk', 'Last Active'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(i => (
                <tr key={i.id} style={{ borderBottom: '1px solid var(--border-primary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{i.company.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{i.company.status}</div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                      background: `${SEGMENT_COLORS[i.segment] || '#8e8e93'}18`,
                      color: SEGMENT_COLORS[i.segment] || '#8e8e93',
                      textTransform: 'capitalize',
                    }}>{i.segment.replace('_', ' ')}</span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                      background: `${INTENT_COLORS[i.buyerIntent] || '#8e8e93'}18`,
                      color: INTENT_COLORS[i.buyerIntent] || '#8e8e93',
                      textTransform: 'capitalize',
                    }}>{i.buyerIntent.replace('_', ' ')}</span>
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                    ${Number(i.totalRevenue).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {i.totalOrders}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-secondary)' }}>
                    ${Number(i.avgOrderValue).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Number(i.engagementScore) * 100}%`, height: '100%', borderRadius: 2,
                          background: Number(i.engagementScore) > 0.7 ? '#34c759' : Number(i.engagementScore) > 0.4 ? '#ff9500' : '#8e8e93',
                        }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {(Number(i.engagementScore) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Number(i.churnRisk) * 100}%`, height: '100%', borderRadius: 2,
                          background: Number(i.churnRisk) > 0.7 ? '#ff3b30' : Number(i.churnRisk) > 0.4 ? '#ff9500' : '#34c759',
                        }} />
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        color: Number(i.churnRisk) > 0.7 ? '#ff3b30' : Number(i.churnRisk) > 0.4 ? '#ff9500' : '#34c759',
                      }}>
                        {(Number(i.churnRisk) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {i.daysSinceLastOrder != null ? `${i.daysSinceLastOrder}d ago` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
