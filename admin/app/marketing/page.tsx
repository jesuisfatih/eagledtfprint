'use client';

import { PageHeader, StatsCard } from '@/components/ui';
import { adminFetch } from '@/lib/api-client';
import { useCallback, useEffect, useMemo, useState } from 'react';

// ────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────

interface ChannelBreakdown {
  channel: string;
  sessions: number;
  avgDuration: number;
  avgPages: number;
  addToCarts: number;
  productViews: number;
}

interface CampaignRow {
  campaign: string;
  source: string;
  medium: string;
  channel: string;
  sessions: number;
  avgDuration: number;
  avgPages: number;
  addToCarts: number;
  productViews: number;
}

interface LandingPage {
  page: string;
  sessions: number;
  avgDuration: number;
  avgPages: number;
  addToCarts: number;
}

interface AttributionPath {
  fingerprint_id: string;
  journey: { touchNumber: number; channel: string; utmSource: string; utmCampaign: string; landingPage: string; createdAt: string }[];
  touch_count: number;
  has_conversion: boolean;
}

interface ReferrerDomain {
  domain: string;
  sessions: number;
}

interface Summary {
  totalSessions: number;
  uniqueVisitors: number;
  avgDuration: number;
  avgPagesPerSession: number;
  totalPageViews: number;
  totalProductViews: number;
  totalAddToCarts: number;
}

interface TrafficData {
  summary: Summary;
  channelBreakdown: ChannelBreakdown[];
  campaignPerformance: CampaignRow[];
  funnelByChannel: any[];
  topLandingPages: LandingPage[];
  attributionPaths: AttributionPath[];
  referrerDomains: ReferrerDomain[];
  dailyTrend: any[];
}

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────

const CHANNEL_META: Record<string, { label: string; color: string; icon: string }> = {
  google_ads: { label: 'Google Ads', color: '#4285F4', icon: 'ti-brand-google' },
  google_organic: { label: 'Google Organic', color: '#34A853', icon: 'ti-brand-google' },
  facebook_ads: { label: 'Facebook Ads', color: '#1877F2', icon: 'ti-brand-facebook' },
  facebook_organic: { label: 'Facebook Organic', color: '#1877F2', icon: 'ti-brand-facebook' },
  instagram_ads: { label: 'Instagram Ads', color: '#E4405F', icon: 'ti-brand-instagram' },
  instagram_organic: { label: 'Instagram Organic', color: '#E4405F', icon: 'ti-brand-instagram' },
  tiktok_ads: { label: 'TikTok Ads', color: '#010101', icon: 'ti-brand-tiktok' },
  tiktok_organic: { label: 'TikTok Organic', color: '#010101', icon: 'ti-brand-tiktok' },
  bing_ads: { label: 'Bing Ads', color: '#008373', icon: 'ti-search' },
  bing_organic: { label: 'Bing Organic', color: '#008373', icon: 'ti-search' },
  email: { label: 'Email', color: '#D44638', icon: 'ti-mail' },
  direct: { label: 'Direct', color: '#6B7280', icon: 'ti-world' },
  referral: { label: 'Referral', color: '#8B5CF6', icon: 'ti-link' },
  social_other: { label: 'Social (Other)', color: '#EC4899', icon: 'ti-share' },
  paid_other: { label: 'Paid (Other)', color: '#F59E0B', icon: 'ti-currency-dollar' },
  twitter_organic: { label: 'X / Twitter', color: '#1DA1F2', icon: 'ti-brand-twitter' },
  linkedin_organic: { label: 'LinkedIn', color: '#0A66C2', icon: 'ti-brand-linkedin' },
  youtube_organic: { label: 'YouTube', color: '#FF0000', icon: 'ti-brand-youtube' },
  pinterest_organic: { label: 'Pinterest', color: '#E60023', icon: 'ti-brand-pinterest' },
  reddit: { label: 'Reddit', color: '#FF4500', icon: 'ti-brand-reddit' },
  unknown: { label: 'Unknown', color: '#9CA3AF', icon: 'ti-question-mark' },
  internal: { label: 'Internal', color: '#6B7280', icon: 'ti-arrow-back' },
};

function getChannelMeta(channel: string) {
  return CHANNEL_META[channel] || { label: channel || 'Unknown', color: '#9CA3AF', icon: 'ti-question-mark' };
}

function formatDuration(seconds: number) {
  if (!seconds || seconds < 1) return '0s';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function getDateRange(preset: string): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  switch (preset) {
    case '7d':  start.setDate(end.getDate() - 7); break;
    case '30d': start.setDate(end.getDate() - 30); break;
    case '90d': start.setDate(end.getDate() - 90); break;
    case 'all': start.setFullYear(2020); break;
    default:    start.setDate(end.getDate() - 30); break;
  }
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

// ────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────

export default function MarketingPage() {
  const [data, setData] = useState<TrafficData | null>(null);
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState('30d');
  const [channelFilter, setChannelFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'attribution' | 'landing'>('overview');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange(datePreset);
      const params = new URLSearchParams({ startDate, endDate });
      if (channelFilter) params.set('channel', channelFilter);
      if (sourceFilter) params.set('utmSource', sourceFilter);
      if (campaignFilter) params.set('utmCampaign', campaignFilter);
      const res = await adminFetch(`/api/v1/fingerprint/traffic-analytics?${params}`);
      if (res.ok) setData(await res.json());
    } catch { /* silent */ }
    setLoading(false);
  }, [datePreset, channelFilter, sourceFilter, campaignFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const maxSessions = useMemo(() => {
    if (!data?.channelBreakdown?.length) return 1;
    return Math.max(...data.channelBreakdown.map(c => c.sessions), 1);
  }, [data]);

  const totalSessions = data?.summary?.totalSessions || 1;

  const tabs = [
    { key: 'overview', label: 'Channel Overview', icon: 'ti-chart-pie' },
    { key: 'campaigns', label: 'Campaigns', icon: 'ti-speakerphone' },
    { key: 'attribution', label: 'Attribution Paths', icon: 'ti-route' },
    { key: 'landing', label: 'Landing Pages', icon: 'ti-map-pin' },
  ] as const;

  return (
    <div>
      <PageHeader
        title="Marketing Attribution"
        subtitle="Multi-touch traffic source analytics — understand where your visitors come from and what converts"
        actions={[{ label: 'Refresh', icon: 'refresh', variant: 'secondary', onClick: loadData }]}
      />

      {/* ─── Toolbar ─── */}
      <div className="apple-card" style={{ marginBottom: 20 }}>
        <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { key: '7d', label: 'Last 7 days' },
              { key: '30d', label: 'Last 30 days' },
              { key: '90d', label: 'Last 90 days' },
              { key: 'all', label: 'All Time' },
            ].map(p => (
              <button
                key={p.key}
                className={`btn-apple sm ${datePreset === p.key ? 'primary' : 'secondary'}`}
                onClick={() => setDatePreset(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="input-apple-field" style={{ padding: '5px 10px', fontSize: 12, minWidth: 130 }} value={channelFilter} onChange={e => setChannelFilter(e.target.value)}>
              <option value="">All Channels</option>
              {data?.channelBreakdown?.map(c => (
                <option key={c.channel} value={c.channel}>{getChannelMeta(c.channel).label}</option>
              ))}
            </select>
            <select className="input-apple-field" style={{ padding: '5px 10px', fontSize: 12, minWidth: 120 }} value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
              <option value="">All Sources</option>
              {[...new Set(data?.campaignPerformance?.map(c => c.source).filter(Boolean) || [])].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select className="input-apple-field" style={{ padding: '5px 10px', fontSize: 12, minWidth: 130 }} value={campaignFilter} onChange={e => setCampaignFilter(e.target.value)}>
              <option value="">All Campaigns</option>
              {[...new Set(data?.campaignPerformance?.map(c => c.campaign).filter(Boolean) || [])].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="empty-state" style={{ padding: 60 }}>
          <div className="empty-state-icon"><i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }} /></div>
          <h4 className="empty-state-title">Analyzing traffic data...</h4>
        </div>
      ) : !data ? (
        <div className="empty-state" style={{ padding: 60 }}>
          <div className="empty-state-icon"><i className="ti ti-chart-arrows" /></div>
          <h4 className="empty-state-title">No traffic data yet</h4>
          <p className="empty-state-desc">Traffic attribution data will appear once visitors start arriving with tracking parameters.</p>
        </div>
      ) : (
        <>
          {/* ─── KPI Cards ─── */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            <StatsCard title="Total Sessions" value={data.summary.totalSessions.toLocaleString()} icon="device-desktop" iconColor="primary" />
            <StatsCard title="Unique Visitors" value={data.summary.uniqueVisitors.toLocaleString()} icon="users" iconColor="info" />
            <StatsCard title="Avg Duration" value={formatDuration(data.summary.avgDuration)} icon="clock" iconColor="warning" />
            <StatsCard title="Pages / Session" value={String(data.summary.avgPagesPerSession)} icon="file" iconColor="primary" />
            <StatsCard title="Page Views" value={data.summary.totalPageViews.toLocaleString()} icon="eye" iconColor="info" />
            <StatsCard title="Product Views" value={data.summary.totalProductViews.toLocaleString()} icon="package" iconColor="success" />
            <StatsCard title="Add to Carts" value={data.summary.totalAddToCarts.toLocaleString()} icon="shopping-cart" iconColor="success" />
          </div>

          {/* ─── Tabs ─── */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-primary)', marginBottom: 20 }}>
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 18px', border: 'none', background: 'none',
                  fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 500, fontFamily: 'inherit',
                  color: activeTab === tab.key ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  borderBottom: `2px solid ${activeTab === tab.key ? 'var(--accent-blue)' : 'transparent'}`,
                  cursor: 'pointer', transition: 'all 150ms',
                }}
              >
                <i className={`ti ${tab.icon}`} style={{ fontSize: 16 }} /> {tab.label}
              </button>
            ))}
          </div>

          {/* ═══ OVERVIEW TAB ═══ */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
              {/* Channel Breakdown */}
              <div className="apple-card">
                <div className="apple-card-header">
                  <h3 className="apple-card-title"><i className="ti ti-chart-bar" style={{ color: 'var(--accent-blue)', marginRight: 6 }} />Channel Breakdown</h3>
                </div>
                <div className="apple-card-body">
                  {data.channelBreakdown.length === 0 ? (
                    <div className="empty-state" style={{ padding: 32 }}>
                      <div className="empty-state-icon"><i className="ti ti-chart-bar" /></div>
                      <h4 className="empty-state-title">No channel data</h4>
                    </div>
                  ) : (
                    data.channelBreakdown.map(ch => {
                      const meta = getChannelMeta(ch.channel);
                      const pct = ((ch.sessions / totalSessions) * 100).toFixed(1);
                      return (
                        <div key={ch.channel} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border-secondary)' }}>
                          {/* Icon */}
                          <div style={{
                            width: 38, height: 38, borderRadius: 10,
                            background: `${meta.color}12`, color: meta.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            <i className={`ti ${meta.icon}`} style={{ fontSize: 18 }} />
                          </div>

                          {/* Name + bar */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{meta.label}</span>
                              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{pct}%</span>
                            </div>
                            <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', borderRadius: 3,
                                width: `${(ch.sessions / maxSessions) * 100}%`,
                                background: `linear-gradient(90deg, ${meta.color}, ${meta.color}88)`,
                                transition: 'width 0.6s ease',
                              }} />
                            </div>
                          </div>

                          {/* Metrics */}
                          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>
                            <span><strong style={{ color: 'var(--text-primary)' }}>{ch.sessions}</strong> sessions</span>
                            <span>{formatDuration(ch.avgDuration)}</span>
                            <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{ch.addToCarts} ATC</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Referrer Domains */}
              <div className="apple-card">
                <div className="apple-card-header">
                  <h3 className="apple-card-title"><i className="ti ti-world-www" style={{ color: 'var(--accent-purple)', marginRight: 6 }} />Top Referrer Domains</h3>
                </div>
                <div className="apple-card-body">
                  {data.referrerDomains.length === 0 ? (
                    <div className="empty-state" style={{ padding: 32 }}>
                      <div className="empty-state-icon"><i className="ti ti-world-www" /></div>
                      <h4 className="empty-state-title">No referrer data</h4>
                    </div>
                  ) : (
                    data.referrerDomains.map((r, i) => (
                      <div key={r.domain} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 0', borderBottom: '1px solid var(--border-secondary)',
                      }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 24, height: 24, borderRadius: 6, fontSize: 11, fontWeight: 600,
                          background: i < 3 ? ['#007aff14', '#5856d614', '#af52de14'][i] : 'var(--bg-tertiary)',
                          color: i < 3 ? ['#007aff', '#5856d6', '#af52de'][i] : 'var(--text-tertiary)',
                        }}>{i + 1}</span>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{r.domain}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{r.sessions}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══ CAMPAIGNS TAB ═══ */}
          {activeTab === 'campaigns' && (
            <div className="apple-card">
              <div className="apple-card-header">
                <h3 className="apple-card-title"><i className="ti ti-speakerphone" style={{ color: 'var(--accent-orange)', marginRight: 6 }} />Campaign Performance</h3>
              </div>
              {data.campaignPerformance.length === 0 ? (
                <div className="apple-card-body">
                  <div className="empty-state" style={{ padding: 40 }}>
                    <div className="empty-state-icon"><i className="ti ti-speakerphone" /></div>
                    <h4 className="empty-state-title">No campaigns detected</h4>
                    <p className="empty-state-desc">Add <code style={{ background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>?utm_campaign=...</code> to your campaign URLs to start tracking.</p>
                  </div>
                </div>
              ) : (
                <div style={{ overflow: 'auto' }}>
                  <table className="apple-table">
                    <thead>
                      <tr>
                        <th>Campaign</th>
                        <th>Source</th>
                        <th>Medium</th>
                        <th>Channel</th>
                        <th style={{ textAlign: 'right' }}>Sessions</th>
                        <th style={{ textAlign: 'right' }}>Duration</th>
                        <th style={{ textAlign: 'right' }}>Pages</th>
                        <th style={{ textAlign: 'right' }}>Product Views</th>
                        <th style={{ textAlign: 'right' }}>ATC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.campaignPerformance.map((c, i) => {
                        const meta = getChannelMeta(c.channel);
                        return (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{c.campaign || '—'}</td>
                            <td>{c.source || '—'}</td>
                            <td>{c.medium || '—'}</td>
                            <td>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '3px 10px', borderRadius: 20,
                                background: `${meta.color}10`, color: meta.color,
                                fontSize: 11, fontWeight: 600,
                              }}>
                                <i className={`ti ${meta.icon}`} style={{ fontSize: 13 }} /> {meta.label}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{c.sessions}</td>
                            <td style={{ textAlign: 'right' }}>{formatDuration(c.avgDuration)}</td>
                            <td style={{ textAlign: 'right' }}>{c.avgPages}</td>
                            <td style={{ textAlign: 'right' }}>{c.productViews}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent-green)' }}>{c.addToCarts}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══ ATTRIBUTION PATHS TAB ═══ */}
          {activeTab === 'attribution' && (
            <div className="apple-card">
              <div className="apple-card-header">
                <div>
                  <h3 className="apple-card-title"><i className="ti ti-route" style={{ color: 'var(--accent-indigo)', marginRight: 6 }} />Multi-Touch Attribution Paths</h3>
                  <p className="apple-card-subtitle">Visitor journeys with 2+ touchpoints — showing the path from first visit to last.</p>
                </div>
              </div>
              <div className="apple-card-body">
                {data.attributionPaths.length === 0 ? (
                  <div className="empty-state" style={{ padding: 40 }}>
                    <div className="empty-state-icon"><i className="ti ti-route" /></div>
                    <h4 className="empty-state-title">No multi-touch journeys yet</h4>
                    <p className="empty-state-desc">Attribution paths appear when visitors return through different channels.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {data.attributionPaths.map((path, i) => (
                      <div key={i} style={{
                        border: `1px solid ${path.has_conversion ? 'var(--accent-green)' : 'var(--border-primary)'}`,
                        borderRadius: 12, padding: 16,
                        background: path.has_conversion ? 'rgba(52,199,89,0.03)' : 'var(--bg-tertiary)',
                        transition: 'box-shadow 150ms',
                      }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                          <i className="ti ti-fingerprint" style={{ fontSize: 16, color: 'var(--text-tertiary)' }} />
                          <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-tertiary)' }}>
                            {path.fingerprint_id.slice(0, 8)}...
                          </span>
                          <span className="badge-apple info">{Number(path.touch_count)} touches</span>
                          {path.has_conversion && (
                            <span className="badge-apple success"><i className="ti ti-check" style={{ fontSize: 12 }} /> Converted</span>
                          )}
                        </div>

                        {/* Journey Steps */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, overflowX: 'auto', paddingBottom: 4 }}>
                          {path.journey.map((step, j) => {
                            const meta = getChannelMeta(step.channel);
                            return (
                              <div key={j} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                {j > 0 && (
                                  <i className="ti ti-arrow-right" style={{ margin: '0 8px', color: 'var(--text-quaternary)', fontSize: 16 }} />
                                )}
                                <div style={{
                                  border: `1px solid ${meta.color}30`,
                                  borderRadius: 10, overflow: 'hidden', minWidth: 140,
                                  background: 'var(--bg-secondary)',
                                }}>
                                  <div style={{
                                    display: 'flex', alignItems: 'center', gap: 5,
                                    padding: '6px 10px',
                                    background: `${meta.color}08`,
                                    borderBottom: `1px solid ${meta.color}15`,
                                  }}>
                                    <i className={`ti ${meta.icon}`} style={{ fontSize: 14, color: meta.color }} />
                                    <span style={{ fontSize: 12, fontWeight: 600, color: meta.color }}>{meta.label}</span>
                                  </div>
                                  <div style={{ padding: '6px 10px' }}>
                                    {step.utmCampaign && <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Campaign: {step.utmCampaign}</div>}
                                    {step.utmSource && <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Source: {step.utmSource}</div>}
                                    {step.landingPage && <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-quaternary)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{step.landingPage.split('?')[0]}</div>}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ LANDING PAGES TAB ═══ */}
          {activeTab === 'landing' && (
            <div className="apple-card">
              <div className="apple-card-header">
                <h3 className="apple-card-title"><i className="ti ti-map-pin" style={{ color: 'var(--accent-red)', marginRight: 6 }} />Top Landing Pages</h3>
              </div>
              {data.topLandingPages.length === 0 ? (
                <div className="apple-card-body">
                  <div className="empty-state" style={{ padding: 40 }}>
                    <div className="empty-state-icon"><i className="ti ti-map-pin" /></div>
                    <h4 className="empty-state-title">No landing page data</h4>
                  </div>
                </div>
              ) : (
                <div style={{ overflow: 'auto' }}>
                  <table className="apple-table">
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>#</th>
                        <th>Landing Page</th>
                        <th style={{ textAlign: 'right' }}>Sessions</th>
                        <th style={{ textAlign: 'right' }}>Avg Duration</th>
                        <th style={{ textAlign: 'right' }}>Avg Pages</th>
                        <th style={{ textAlign: 'right' }}>Add to Cart</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topLandingPages.map((l, i) => (
                        <tr key={i}>
                          <td>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: 24, height: 24, borderRadius: 6, fontSize: 11, fontWeight: 600,
                              background: i < 3 ? ['#ffd70020', '#c0c0c020', '#cd7f3220'][i] : 'var(--bg-tertiary)',
                              color: i < 3 ? ['#b8860b', '#808080', '#8b4513'][i] : 'var(--text-tertiary)',
                            }}>{i + 1}</span>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{l.page || '/'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{l.sessions}</td>
                          <td style={{ textAlign: 'right' }}>{formatDuration(l.avgDuration)}</td>
                          <td style={{ textAlign: 'right' }}>{l.avgPages}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent-green)' }}>{l.addToCarts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
