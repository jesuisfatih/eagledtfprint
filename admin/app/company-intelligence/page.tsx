'use client';

import { showToast } from '@/components/ui';
import { adminFetch } from '@/lib/api-client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const segmentColors: Record<string, { bg: string; color: string; label: string }> = {
  loyal: { bg: 'rgba(52,199,89,0.12)', color: '#34c759', label: '🏆 Loyal' },
  active: { bg: 'rgba(0,122,255,0.12)', color: '#007aff', label: '📈 Active' },
  new: { bg: 'rgba(90,200,250,0.12)', color: '#5ac8fa', label: '🆕 New' },
  prospect: { bg: 'rgba(88,86,214,0.12)', color: '#5856d6', label: '🎯 Prospect' },
  at_risk: { bg: 'rgba(255,149,0,0.12)', color: '#ff9500', label: '⚠️ At Risk' },
  churned: { bg: 'rgba(255,59,48,0.12)', color: '#ff3b30', label: '💀 Churned' },
};

const intentColors: Record<string, { bg: string; color: string }> = {
  champion: { bg: 'rgba(52,199,89,0.12)', color: '#34c759' },
  hot: { bg: 'rgba(255,59,48,0.12)', color: '#ff3b30' },
  warm: { bg: 'rgba(255,149,0,0.12)', color: '#ff9500' },
  interested: { bg: 'rgba(0,122,255,0.12)', color: '#007aff' },
  cold: { bg: 'rgba(142,142,147,0.12)', color: '#8e8e93' },
};

export default function CompanyIntelligencePage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await adminFetch('/api/v1/companies/intelligence/dashboard');
      if (res.ok) {
        const data = await res.json();
        setDashboard(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculate = async () => {
    try {
      setCalculating(true);
      const res = await adminFetch('/api/v1/companies/intelligence/calculate', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        showToast(`Calculated intelligence for ${data.processed} companies`, 'success');
        await loadDashboard();
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to calculate', 'error');
    } finally {
      setCalculating(false);
    }
  };

  const fmtCurrency = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const tabs = [
    { key: 'overview', label: 'Overview', icon: 'chart-pie' },
    { key: 'top', label: 'Top Companies', icon: 'trophy' },
    { key: 'at_risk', label: 'At Risk', icon: 'alert-triangle' },
    { key: 'growth', label: 'Growth', icon: 'trending-up' },
    { key: 'all', label: 'All Companies', icon: 'list' },
  ];

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <div className="spinner-apple" />
      <p style={{ marginTop: 16, color: 'var(--text-secondary)' }}>Loading company intelligence...</p>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>
            <i className="ti ti-brain" style={{ marginRight: 10, color: '#af52de' }} />
            Company Intelligence
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
            Deep analytics, engagement scoring, and growth insights for B2B accounts
          </p>
        </div>
        <button className="btn-apple primary" onClick={calculate} disabled={calculating}>
          {calculating ? (
            <><div className="spinner-apple" style={{ width: 14, height: 14, marginRight: 6 }} />Calculating...</>
          ) : (
            <><i className="ti ti-calculator" style={{ marginRight: 4 }} />Recalculate</>
          )}
        </button>
      </div>

      {/* Summary Cards */}
      {dashboard?.summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Companies', value: dashboard.summary.totalCompanies, icon: '🏢', color: '#007aff' },
            { label: 'Active', value: dashboard.summary.activeCompanies, icon: '✅', color: '#34c759' },
            { label: 'Total Revenue', value: fmtCurrency(dashboard.summary.totalRevenue), icon: '💰', color: '#ff9500' },
            { label: 'Total Orders', value: dashboard.summary.totalOrders, icon: '📦', color: '#5856d6' },
            { label: 'Avg Rev/Company', value: fmtCurrency(dashboard.summary.avgRevenuePerCompany), icon: '📊', color: '#af52de' },
            { label: 'Avg Orders', value: dashboard.summary.avgOrdersPerCompany, icon: '🛒', color: '#5ac8fa' },
          ].map((card, i) => (
            <div key={i} className="apple-card" style={{ marginBottom: 0 }}>
              <div className="apple-card-body" style={{ padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{card.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: card.color }}>{card.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{card.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 20, padding: '4px',
        background: 'var(--bg-secondary)', borderRadius: 12, width: 'fit-content',
      }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 500,
              background: activeTab === t.key ? 'var(--bg-primary)' : 'transparent',
              color: activeTab === t.key ? 'var(--accent-primary)' : 'var(--text-secondary)',
              boxShadow: activeTab === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <i className={`ti ti-${t.icon}`} style={{ fontSize: 14 }} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && dashboard && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Segment Distribution */}
          <div className="apple-card">
            <div className="apple-card-header">
              <h3 className="apple-card-title"><i className="ti ti-chart-pie" style={{ marginRight: 8 }} />Segment Distribution</h3>
            </div>
            <div className="apple-card-body">
              {Object.entries(dashboard.segmentDistribution || {}).map(([seg, count]: any) => {
                const sc = segmentColors[seg] || segmentColors.prospect;
                const total = Object.values(dashboard.segmentDistribution).reduce((s: number, v: any) => s + v, 0) as number;
                const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
                return (
                  <div key={seg} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, minWidth: 100,
                      background: sc.bg, color: sc.color, textAlign: 'center',
                    }}>
                      {sc.label}
                    </span>
                    <div style={{ flex: 1, height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: sc.color, borderRadius: 4, transition: 'width 0.5s ease' }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, minWidth: 40, textAlign: 'right' }}>{count}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', minWidth: 35 }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Buyer Intent Distribution */}
          <div className="apple-card">
            <div className="apple-card-header">
              <h3 className="apple-card-title"><i className="ti ti-flame" style={{ marginRight: 8 }} />Buyer Intent</h3>
            </div>
            <div className="apple-card-body">
              {Object.entries(dashboard.intentDistribution || {}).map(([intent, count]: any) => {
                const ic = intentColors[intent] || intentColors.cold;
                const total = Object.values(dashboard.intentDistribution).reduce((s: number, v: any) => s + v, 0) as number;
                const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
                return (
                  <div key={intent} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, minWidth: 100,
                      background: ic.bg, color: ic.color, textAlign: 'center', textTransform: 'capitalize',
                    }}>
                      {intent}
                    </span>
                    <div style={{ flex: 1, height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: ic.color, borderRadius: 4, transition: 'width 0.5s ease' }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, minWidth: 40, textAlign: 'right' }}>{count}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', minWidth: 35 }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Top Companies Tab */}
      {activeTab === 'top' && dashboard?.topByRevenue && (
        <div className="apple-card">
          <div className="apple-card-header">
            <h3 className="apple-card-title"><i className="ti ti-trophy" style={{ marginRight: 8, color: '#ff9500' }} />Top Companies by Revenue</h3>
          </div>
          <div className="apple-card-body" style={{ padding: 0 }}>
            <table className="apple-table" style={{ marginBottom: 0 }}>
              <thead><tr>
                <th>#</th><th>Company</th><th style={{ textAlign: 'right' }}>Revenue</th>
                <th style={{ textAlign: 'center' }}>Orders</th><th>Engagement</th><th>Segment</th>
                <th>Intent</th><th style={{ textAlign: 'center' }}>Churn Risk</th>
              </tr></thead>
              <tbody>
                {dashboard.topByRevenue.map((c: any, i: number) => {
                  const sc = segmentColors[c.segment] || segmentColors.prospect;
                  const ic = intentColors[c.buyerIntent] || intentColors.cold;
                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600, color: i < 3 ? '#ff9500' : 'var(--text-secondary)' }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                      </td>
                      <td>
                        <Link href={`/companies/${c.id}`} style={{ fontWeight: 600, color: 'var(--accent-primary)', textDecoration: 'none' }}>
                          {c.name}
                        </Link>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtCurrency(c.revenue)}</td>
                      <td style={{ textAlign: 'center' }}>{c.orders}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{
                              width: `${c.engagementScore}%`, height: '100%', borderRadius: 3,
                              background: c.engagementScore > 60 ? '#34c759' : c.engagementScore > 30 ? '#ff9500' : '#ff3b30',
                            }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600 }}>{c.engagementScore}</span>
                        </div>
                      </td>
                      <td><span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color }}>{sc.label}</span></td>
                      <td><span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: ic.bg, color: ic.color, textTransform: 'capitalize' }}>{c.buyerIntent}</span></td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                          background: c.churnRisk > 0.7 ? 'rgba(255,59,48,0.12)' : c.churnRisk > 0.3 ? 'rgba(255,149,0,0.12)' : 'rgba(52,199,89,0.12)',
                          color: c.churnRisk > 0.7 ? '#ff3b30' : c.churnRisk > 0.3 ? '#ff9500' : '#34c759',
                        }}>
                          {(c.churnRisk * 100).toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* At Risk Tab */}
      {activeTab === 'at_risk' && dashboard?.atRisk && (
        <div className="apple-card">
          <div className="apple-card-header">
            <h3 className="apple-card-title" style={{ color: '#ff3b30' }}>
              <i className="ti ti-alert-triangle" style={{ marginRight: 8 }} />At-Risk Companies
            </h3>
          </div>
          <div className="apple-card-body">
            {dashboard.atRisk.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>
                <i className="ti ti-mood-happy" style={{ fontSize: 40 }} />
                <p>No at-risk companies! 🎉</p>
              </div>
            ) : (
              dashboard.atRisk.map((c: any) => (
                <div key={c.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: 16, background: 'rgba(255,59,48,0.04)', borderRadius: 10,
                  border: '1px solid rgba(255,59,48,0.12)', marginBottom: 12,
                }}>
                  <div>
                    <Link href={`/companies/${c.id}`} style={{ fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none' }}>
                      {c.name}
                    </Link>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                      Revenue: {fmtCurrency(c.totalRevenue)} · Last order: {c.daysSinceLastOrder ? `${c.daysSinceLastOrder} days ago` : 'Never'}
                    </div>
                  </div>
                  <div style={{
                    padding: '6px 14px', borderRadius: 8, fontWeight: 700, fontSize: 16,
                    background: c.churnRisk > 0.7 ? 'rgba(255,59,48,0.12)' : 'rgba(255,149,0,0.12)',
                    color: c.churnRisk > 0.7 ? '#ff3b30' : '#ff9500',
                  }}>
                    {(c.churnRisk * 100).toFixed(0)}% risk
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Growth Tab */}
      {activeTab === 'growth' && dashboard?.growthCompanies && (
        <div className="apple-card">
          <div className="apple-card-header">
            <h3 className="apple-card-title" style={{ color: '#34c759' }}>
              <i className="ti ti-trending-up" style={{ marginRight: 8 }} />Growth Companies
            </h3>
          </div>
          <div className="apple-card-body" style={{ padding: 0 }}>
            <table className="apple-table" style={{ marginBottom: 0 }}>
              <thead><tr>
                <th>Company</th><th>Engagement</th><th>Intent</th>
                <th style={{ textAlign: 'center' }}>Product Views</th>
                <th style={{ textAlign: 'center' }}>Add to Carts</th>
                <th>Upsell Potential</th>
              </tr></thead>
              <tbody>
                {dashboard.growthCompanies.map((c: any) => {
                  const ic = intentColors[c.buyerIntent] || intentColors.cold;
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/companies/${c.id}`} style={{ fontWeight: 600, color: 'var(--accent-primary)', textDecoration: 'none' }}>
                          {c.name}
                        </Link>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden', maxWidth: 100 }}>
                            <div style={{
                              width: `${c.engagementScore}%`, height: '100%', borderRadius: 3,
                              background: 'linear-gradient(90deg, #34c759, #30d158)',
                            }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{c.engagementScore}</span>
                        </div>
                      </td>
                      <td><span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: ic.bg, color: ic.color, textTransform: 'capitalize' }}>{c.buyerIntent}</span></td>
                      <td style={{ textAlign: 'center' }}>{c.totalProductViews}</td>
                      <td style={{ textAlign: 'center' }}>{c.totalAddToCarts}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden', maxWidth: 80 }}>
                            <div style={{
                              width: `${(c.upsellPotential * 100)}%`, height: '100%', borderRadius: 3,
                              background: 'linear-gradient(90deg, #ff9500, #ffcc00)',
                            }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600 }}>{(c.upsellPotential * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All Companies Tab */}
      {activeTab === 'all' && dashboard?.allCompanies && (
        <div className="apple-card">
          <div className="apple-card-header">
            <h3 className="apple-card-title"><i className="ti ti-list" style={{ marginRight: 8 }} />All Companies ({dashboard.allCompanies.length})</h3>
          </div>
          <div className="apple-card-body" style={{ padding: 0 }}>
            <table className="apple-table" style={{ marginBottom: 0, fontSize: 13 }}>
              <thead><tr>
                <th>Company</th><th>Segment</th><th>Intent</th>
                <th style={{ textAlign: 'right' }}>Revenue</th>
                <th style={{ textAlign: 'center' }}>Orders</th>
                <th style={{ textAlign: 'right' }}>AOV</th>
                <th>Engagement</th>
                <th style={{ textAlign: 'center' }}>Churn</th>
                <th>Last Active</th>
              </tr></thead>
              <tbody>
                {dashboard.allCompanies.map((c: any) => {
                  const sc = segmentColors[c.segment] || segmentColors.prospect;
                  const ic = intentColors[c.buyerIntent] || intentColors.cold;
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/companies/${c.id}`} style={{ fontWeight: 500, color: 'var(--accent-primary)', textDecoration: 'none' }}>
                          {c.name}
                        </Link>
                      </td>
                      <td><span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: sc.bg, color: sc.color }}>{sc.label}</span></td>
                      <td><span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: ic.bg, color: ic.color, textTransform: 'capitalize' }}>{c.buyerIntent}</span></td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtCurrency(c.totalRevenue)}</td>
                      <td style={{ textAlign: 'center' }}>{c.totalOrders}</td>
                      <td style={{ textAlign: 'right' }}>{fmtCurrency(c.avgOrderValue)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 40, height: 4, background: 'var(--bg-secondary)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{
                              width: `${c.engagementScore}%`, height: '100%', borderRadius: 2,
                              background: c.engagementScore > 60 ? '#34c759' : c.engagementScore > 30 ? '#ff9500' : '#ff3b30',
                            }} />
                          </div>
                          <span style={{ fontSize: 10 }}>{c.engagementScore}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontSize: 11 }}>
                        <span style={{
                          color: c.churnRisk > 0.7 ? '#ff3b30' : c.churnRisk > 0.3 ? '#ff9500' : '#34c759',
                          fontWeight: 600,
                        }}>{(c.churnRisk * 100).toFixed(0)}%</span>
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                        {c.lastActiveAt ? new Date(c.lastActiveAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
