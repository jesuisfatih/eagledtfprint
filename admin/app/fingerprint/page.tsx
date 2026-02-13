'use client';

import { PageHeader, StatsCard, Tabs } from '@/components/ui';
import { adminFetch } from '@/lib/api-client';
import { useCallback, useEffect, useState } from 'react';

interface FingerprintStats {
  totalVisitors: number;
  returningVisitors: number;
  identifiedVisitors: number;
  botCount: number;
  identificationRate: string | number;
}

interface IntentDistribution {
  intent: string;
  count: number;
}

interface RecentVisitor {
  id: string;
  fingerprintHash: string;
  platform: string;
  visitCount: number;
  lastSeenAt: string;
  firstSeenAt: string;
  isIdentified: boolean;
  identity: {
    email: string;
    name: string;
    company: string;
    buyerIntent: string;
    engagementScore: number;
  } | null;
}

interface EngagedVisitor {
  id: string;
  email: string;
  name: string;
  company: string;
  buyerIntent: string;
  segment: string;
  engagementScore: number;
  totalPageViews: number;
  totalProductViews: number;
  totalAddToCarts: number;
  totalOrders: number;
  totalRevenue: number;
  platform: string;
  visitCount: number;
  lastSeenAt: string;
}

interface HotLead {
  id: string;
  email: string;
  name: string;
  company: string;
  buyerIntent: string;
  engagementScore: number;
  totalProductViews: number;
  totalAddToCarts: number;
  lastProductViewed: string;
  platform: string;
  timezone: string;
  visitCount: number;
  lastSeenAt: string;
}

const INTENT_CONFIG: Record<string, { color: string; emoji: string; bg: string }> = {
  hot:        { color: '#ff3b30', emoji: '🔥', bg: 'var(--accent-red-soft)' },
  warm:       { color: '#ff9500', emoji: '🌡️', bg: 'var(--accent-orange-soft)' },
  cold:       { color: '#007aff', emoji: '❄️', bg: 'var(--accent-blue-soft)' },
  converting: { color: '#34c759', emoji: '💰', bg: 'var(--accent-green-soft)' },
};

const SEGMENT_CONFIG: Record<string, { color: string; bg: string }> = {
  VIP:            { color: 'var(--accent-purple)', bg: 'var(--accent-purple-soft)' },
  customer:       { color: 'var(--accent-green)',  bg: 'var(--accent-green-soft)' },
  abandoned_cart: { color: 'var(--accent-red)',    bg: 'var(--accent-red-soft)' },
  browser:        { color: 'var(--accent-blue)',   bg: 'var(--accent-blue-soft)' },
  new_visitor:    { color: 'var(--text-tertiary)', bg: 'rgba(0,0,0,0.05)' },
};

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function ProgressBar({ value, max = 100, color = 'var(--accent-blue)' }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 60, height: 6, background: 'var(--bg-primary)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color, minWidth: 20 }}>{value.toFixed(0)}</span>
    </div>
  );
}

function IntentBadge({ intent }: { intent: string }) {
  const cfg = INTENT_CONFIG[intent] || { color: 'var(--text-tertiary)', emoji: '👤', bg: 'rgba(0,0,0,0.05)' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 'var(--radius-full)',
      fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.color,
    }}>
      {cfg.emoji} {intent}
    </span>
  );
}

function SegmentBadge({ segment }: { segment: string }) {
  const cfg = SEGMENT_CONFIG[segment] || SEGMENT_CONFIG.new_visitor;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 'var(--radius-full)',
      fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.color,
    }}>
      {segment.replace(/_/g, ' ')}
    </span>
  );
}

function IdDot({ identified }: { identified: boolean }) {
  return (
    <div style={{
      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
      background: identified ? 'var(--accent-green)' : 'var(--text-quaternary)',
      boxShadow: identified ? '0 0 6px rgba(52,199,89,0.4)' : 'none',
    }} />
  );
}

export default function FingerprintPage() {
  const [stats, setStats] = useState<FingerprintStats | null>(null);
  const [intentDistribution, setIntentDistribution] = useState<IntentDistribution[]>([]);
  const [recentVisitors, setRecentVisitors] = useState<RecentVisitor[]>([]);
  const [topEngaged, setTopEngaged] = useState<EngagedVisitor[]>([]);
  const [hotLeads, setHotLeads] = useState<HotLead[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminFetch('/api/v1/fingerprint/dashboard');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setIntentDistribution(data.intentDistribution || []);
        setRecentVisitors(data.recentVisitors || []);
        setTopEngaged(data.topEngaged || []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  const loadHotLeads = useCallback(async () => {
    try {
      const res = await adminFetch('/api/v1/fingerprint/hot-leads');
      if (res.ok) {
        const data = await res.json();
        setHotLeads(data.leads || []);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadDashboard(); loadHotLeads(); }, [loadDashboard, loadHotLeads]);

  return (
    <div>
      <PageHeader
        title="Fingerprint Intelligence"
        subtitle="Real-time visitor identification, behavioral profiling & buyer intent analysis"
        actions={[
          { label: 'Refresh', icon: 'refresh', variant: 'secondary', onClick: () => { loadDashboard(); loadHotLeads(); } },
        ]}
      />

      {/* ── Stats ── */}
      <div className="stats-grid cols-5">
        <StatsCard title="Total Visitors" value={stats?.totalVisitors ?? 0} icon="fingerprint" iconColor="primary" meta="Unique fingerprints" loading={loading} />
        <StatsCard title="Returning" value={stats?.returningVisitors ?? 0} icon="arrow-back-up" iconColor="info" meta="Multi-visit" loading={loading} />
        <StatsCard title="Identified" value={stats?.identifiedVisitors ?? 0} icon="user-check" iconColor="success" meta="Linked to accounts" loading={loading} />
        <StatsCard title="ID Rate" value={stats ? `${stats.identificationRate}%` : '—'} icon="percentage" color="#af52de" meta="Resolution rate" loading={loading} />
        <StatsCard title="Bots Blocked" value={stats?.botCount ?? 0} icon="robot" iconColor="danger" meta="Auto-detected" loading={loading} />
      </div>

      {/* ── Intent Distribution ── */}
      {intentDistribution.length > 0 && (
        <div className="apple-card" style={{ marginBottom: 24 }}>
          <div className="apple-card-header">
            <div className="apple-card-title">Buyer Intent Distribution</div>
          </div>
          <div className="apple-card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {intentDistribution.map((d) => {
              const cfg = INTENT_CONFIG[d.intent] || { color: 'var(--text-tertiary)', emoji: '👤', bg: 'rgba(0,0,0,0.05)' };
              return (
                <div key={d.intent} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 18px', borderRadius: 'var(--radius-md)',
                  border: `1px solid ${cfg.color}22`, background: cfg.bg,
                  minWidth: 140,
                }}>
                  <span style={{ fontSize: 22 }}>{cfg.emoji}</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: cfg.color, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      {d.intent}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                      {d.count}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview', icon: 'chart-dots-3' },
          { id: 'visitors', label: 'Recent Visitors', icon: 'users', count: recentVisitors.length },
          { id: 'leads', label: 'Hot Leads', icon: 'flame', count: hotLeads.length },
          { id: 'engaged', label: 'Top Engaged', icon: 'star', count: topEngaged.length },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {/* ─────── OVERVIEW ─────── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Recent Visitors */}
          <div className="apple-card">
            <div className="apple-card-header">
              <div className="apple-card-title">🕐 Recent Visitors</div>
            </div>
            <div className="apple-card-body" style={{ padding: '8px 0' }}>
              {recentVisitors.length === 0 ? (
                <div className="empty-state" style={{ padding: 40 }}>
                  <div className="empty-state-icon"><i className="ti ti-users" /></div>
                  <h4 className="empty-state-title">No visitors yet</h4>
                </div>
              ) : recentVisitors.slice(0, 8).map((v) => (
                <div key={v.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 22px', transition: 'background var(--transition-fast)', cursor: 'default',
                  borderBottom: '1px solid var(--border-secondary)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <IdDot identified={v.isIdentified} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                        {v.identity?.name || v.identity?.email || v.fingerprintHash.slice(0, 16) + '…'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                        {v.identity?.company ? `${v.identity.company} · ` : ''}{v.platform || '—'} · {v.visitCount} visits
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {v.identity?.buyerIntent && <IntentBadge intent={v.identity.buyerIntent} />}
                    <span style={{ fontSize: 11, color: 'var(--text-quaternary)' }}>{timeAgo(v.lastSeenAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hot Leads Preview */}
          <div className="apple-card">
            <div className="apple-card-header">
              <div className="apple-card-title">🔥 Hot Leads</div>
            </div>
            <div className="apple-card-body" style={{ padding: '8px 0' }}>
              {hotLeads.length === 0 ? (
                <div className="empty-state" style={{ padding: 40 }}>
                  <div className="empty-state-icon"><i className="ti ti-flame" /></div>
                  <h4 className="empty-state-title">No hot leads yet</h4>
                  <p className="empty-state-description">
                    Leads appear when visitors show high purchase intent without converting.
                  </p>
                </div>
              ) : hotLeads.slice(0, 8).map((lead) => (
                <div key={lead.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 22px', borderBottom: '1px solid var(--border-secondary)',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                      {lead.name || lead.email || 'Anonymous'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      {lead.company ? `${lead.company} · ` : ''}{lead.totalProductViews} views · {lead.totalAddToCarts} carts
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ProgressBar value={lead.engagementScore} color={INTENT_CONFIG[lead.buyerIntent]?.color || 'var(--accent-orange)'} />
                    <span style={{ fontSize: 11, color: 'var(--text-quaternary)' }}>{timeAgo(lead.lastSeenAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─────── RECENT VISITORS ─────── */}
      {activeTab === 'visitors' && (
        <div className="apple-card">
          {recentVisitors.length === 0 ? (
            <div className="empty-state" style={{ padding: 60 }}>
              <div className="empty-state-icon"><i className="ti ti-users" /></div>
              <h4 className="empty-state-title">No visitors yet</h4>
              <p className="empty-state-description">Visitor data will appear as people browse your store.</p>
            </div>
          ) : (
            <table className="apple-table">
              <thead>
                <tr>
                  <th>Visitor</th>
                  <th>Platform</th>
                  <th>Visits</th>
                  <th>Intent</th>
                  <th>Engagement</th>
                  <th>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {recentVisitors.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <IdDot identified={v.isIdentified} />
                        <div>
                          <div style={{ fontWeight: 500 }}>
                            {v.identity?.name || v.identity?.email || v.fingerprintHash.slice(0, 16) + '…'}
                          </div>
                          {v.identity?.company && (
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{v.identity.company}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{v.platform || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{v.visitCount}</td>
                    <td>{v.identity?.buyerIntent ? <IntentBadge intent={v.identity.buyerIntent} /> : '—'}</td>
                    <td>
                      {v.identity?.engagementScore != null
                        ? <ProgressBar value={v.identity.engagementScore} color="var(--accent-indigo)" />
                        : '—'}
                    </td>
                    <td style={{ color: 'var(--text-tertiary)' }}>{timeAgo(v.lastSeenAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ─────── HOT LEADS ─────── */}
      {activeTab === 'leads' && (
        <div className="apple-card">
          {hotLeads.length === 0 ? (
            <div className="empty-state" style={{ padding: 60 }}>
              <div className="empty-state-icon"><i className="ti ti-flame" /></div>
              <h4 className="empty-state-title">No hot leads detected</h4>
              <p className="empty-state-description">Visitors with high engagement but no orders will surface here.</p>
            </div>
          ) : (
            <table className="apple-table">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Intent</th>
                  <th>Product Views</th>
                  <th>Cart Actions</th>
                  <th>Score</th>
                  <th>Timezone</th>
                  <th>Last Active</th>
                </tr>
              </thead>
              <tbody>
                {hotLeads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: 500 }}>{lead.name || lead.email || 'Anonymous'}</div>
                        {lead.company && (
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{lead.company}</div>
                        )}
                      </div>
                    </td>
                    <td><IntentBadge intent={lead.buyerIntent} /></td>
                    <td style={{ fontWeight: 600 }}>{lead.totalProductViews}</td>
                    <td style={{ fontWeight: 600 }}>{lead.totalAddToCarts}</td>
                    <td>
                      <ProgressBar
                        value={lead.engagementScore}
                        color={INTENT_CONFIG[lead.buyerIntent]?.color || 'var(--accent-orange)'}
                      />
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{lead.timezone || '—'}</td>
                    <td style={{ color: 'var(--text-tertiary)' }}>{timeAgo(lead.lastSeenAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ─────── TOP ENGAGED ─────── */}
      {activeTab === 'engaged' && (
        <div className="apple-card">
          {topEngaged.length === 0 ? (
            <div className="empty-state" style={{ padding: 60 }}>
              <div className="empty-state-icon"><i className="ti ti-star" /></div>
              <h4 className="empty-state-title">No engaged visitors yet</h4>
              <p className="empty-state-description">Engagement data will populate as visitors interact with your store.</p>
            </div>
          ) : (
            <table className="apple-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Segment</th>
                  <th>Score</th>
                  <th>Pages</th>
                  <th>Products</th>
                  <th>Carts</th>
                  <th>Orders</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topEngaged.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: 500 }}>{e.name || e.email || 'Anonymous'}</div>
                        {e.company && (
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{e.company}</div>
                        )}
                      </div>
                    </td>
                    <td>{e.segment ? <SegmentBadge segment={e.segment} /> : '—'}</td>
                    <td><ProgressBar value={e.engagementScore} color="var(--accent-purple)" /></td>
                    <td>{e.totalPageViews}</td>
                    <td>{e.totalProductViews}</td>
                    <td>{e.totalAddToCarts}</td>
                    <td style={{ fontWeight: 600 }}>{e.totalOrders}</td>
                    <td style={{ fontWeight: 600, color: 'var(--accent-green)' }}>${e.totalRevenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
