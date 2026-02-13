'use client';

import { PageHeader, showToast } from '@/components/ui';
import { adminFetch } from '@/lib/api-client';
import { useCallback, useEffect, useState } from 'react';

interface Offer {
  id: string;
  strategy: string;
  status: string;
  discountType: string;
  discountValue: number;
  discountCode: string | null;
  title: string | null;
  message: string | null;
  channel: string;
  deliveryStatus: string;
  triggerReason: string | null;
  expiresAt: string;
  viewedAt: string | null;
  acceptedAt: string | null;
  redeemedAt: string | null;
  resultRevenue: number | null;
  createdAt: string;
  shopifyCustomer?: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
}

interface Analytics {
  totalSent: number;
  totalAccepted: number;
  totalExpired: number;
  totalRevenue: number;
  conversionRate: string;
  avgRevenuePerAccepted: string;
  activeOffers: number;
  byStrategy: Record<string, { sent: number; accepted: number; expired: number; revenue: number }>;
}

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [strategyFilter, setStrategyFilter] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (strategyFilter) params.set('strategy', strategyFilter);
      params.set('limit', '100');

      const [offersRes, analyticsRes] = await Promise.all([
        adminFetch(`/api/v1/offers?${params}`),
        adminFetch('/api/v1/offers/analytics').catch(() => null),
      ]);

      if (offersRes.ok) {
        const data = await offersRes.json();
        setOffers(Array.isArray(data) ? data : data.offers || data.data || []);
      }
      if (analyticsRes?.ok) {
        try {
          setAnalytics(await analyticsRes.json());
        } catch { /* ignore parse errors */ }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [statusFilter, strategyFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const generateOffers = async () => {
    setGenerating(true);
    try {
      const res = await adminFetch('/api/v1/offers/generate', { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        showToast(`Generated ${result.generated} new offers!`, 'success');
        loadData();
      } else {
        showToast('Generation failed', 'danger');
      }
    } catch { showToast('Generation error', 'danger'); }
    finally { setGenerating(false); }
  };

  const expireOffers = async () => {
    try {
      const res = await adminFetch('/api/v1/offers/expire', { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        showToast(`Expired ${result.expired} offers`, 'success');
        loadData();
      }
    } catch { showToast('Expire failed', 'danger'); }
  };

  const cancelOffer = async (id: string) => {
    try {
      await adminFetch(`/api/v1/offers/${id}/cancel`, { method: 'POST' });
      showToast('Offer cancelled', 'success');
      loadData();
    } catch { showToast('Cancel failed', 'danger'); }
  };

  const fmt = (n: any) => `$${Number(n || 0).toFixed(2)}`;
  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const strategyLabels: Record<string, { label: string; icon: string; color: string }> = {
    win_back: { label: 'Win Back', icon: 'ti-arrow-back-up', color: '#ff3b30' },
    loyalty_reward: { label: 'Loyalty', icon: 'ti-heart', color: '#ff9500' },
    upsell: { label: 'Upsell', icon: 'ti-trending-up', color: '#007aff' },
    reactivation: { label: 'Reactivation', icon: 'ti-refresh', color: '#5856d6' },
    volume_incentive: { label: 'Volume', icon: 'ti-stack-2', color: '#34c759' },
    first_purchase_followup: { label: '1st Follow-up', icon: 'ti-gift', color: '#af52de' },
    declining_trend: { label: 'Declining', icon: 'ti-trending-down', color: '#ff6b6b' },
    high_value_retention: { label: 'High Value', icon: 'ti-diamond', color: '#11998e' },
    free_shipping_nudge: { label: 'Free Ship', icon: 'ti-truck', color: '#667eea' },
    anniversary: { label: 'Anniversary', icon: 'ti-calendar-heart', color: '#e91e63' },
  };

  const statusConfig: Record<string, { bg: string; color: string }> = {
    active: { bg: 'rgba(52,199,89,0.12)', color: '#34c759' },
    accepted: { bg: 'rgba(0,122,255,0.12)', color: '#007aff' },
    redeemed: { bg: 'rgba(88,86,214,0.12)', color: '#5856d6' },
    expired: { bg: 'rgba(142,142,147,0.12)', color: '#8e8e93' },
    cancelled: { bg: 'rgba(255,59,48,0.12)', color: '#ff3b30' },
  };

  const strategies = Object.keys(strategyLabels);

  return (
    <div>
      <PageHeader
        title="Proactive Offers"
        subtitle="AI-driven personalized discount offers"
        actions={[
          { label: generating ? 'Generating...' : 'Generate Offers', icon: 'sparkles', variant: 'primary', onClick: generateOffers, disabled: generating },
          { label: 'Expire Old', icon: 'clock-off', variant: 'secondary', onClick: expireOffers },
          { label: 'Refresh', icon: 'refresh', variant: 'secondary', onClick: loadData },
        ]}
      />

      {/* Analytics */}
      {analytics && (
        <>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 24 }}>
            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #007aff14, #007aff04)' }}>
              <div className="stat-icon" style={{ background: '#007aff20', color: '#007aff' }}><i className="ti ti-mail" /></div>
              <div className="stat-label">Total Sent</div>
              <div className="stat-value">{analytics.totalSent || 0}</div>
            </div>
            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #34c75914, #34c75904)' }}>
              <div className="stat-icon" style={{ background: '#34c75920', color: '#34c759' }}><i className="ti ti-check" /></div>
              <div className="stat-label">Active</div>
              <div className="stat-value">{analytics.activeOffers || 0}</div>
            </div>
            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #ff950014, #ff950004)' }}>
              <div className="stat-icon" style={{ background: '#ff950020', color: '#ff9500' }}><i className="ti ti-thumb-up" /></div>
              <div className="stat-label">Accepted</div>
              <div className="stat-value">{analytics.totalAccepted || 0}</div>
            </div>
            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #5856d614, #5856d604)' }}>
              <div className="stat-icon" style={{ background: '#5856d620', color: '#5856d6' }}><i className="ti ti-chart-bar" /></div>
              <div className="stat-label">Conv. Rate</div>
              <div className="stat-value">{analytics.conversionRate || '0'}%</div>
            </div>
            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #34c75914, #34c75904)' }}>
              <div className="stat-icon" style={{ background: '#34c75920', color: '#34c759' }}><i className="ti ti-currency-dollar" /></div>
              <div className="stat-label">Revenue</div>
              <div className="stat-value">{fmt(analytics.totalRevenue)}</div>
            </div>
          </div>

          {/* Strategy Performance */}
          {analytics.byStrategy && Object.keys(analytics.byStrategy).length > 0 && (
            <div className="apple-card" style={{ marginBottom: 24 }}>
              <div className="apple-card-header">
                <h3 className="apple-card-title"><i className="ti ti-chart-bar" style={{ marginRight: 8 }} />Strategy Performance</h3>
              </div>
              <div className="apple-card-body" style={{ padding: 0 }}>
                <table className="apple-table" style={{ fontSize: 13 }}>
                  <thead>
                    <tr><th>Strategy</th><th>Sent</th><th>Accepted</th><th>Expired</th><th>Revenue</th><th>Conv. Rate</th></tr>
                  </thead>
                  <tbody>
                    {Object.entries(analytics.byStrategy).map(([key, val]) => {
                      const s = strategyLabels[key] || { label: key, icon: 'ti-tag', color: '#8e8e93' };
                      const convRate = (val.sent || 0) > 0 ? (((val.accepted || 0) / val.sent) * 100).toFixed(1) : '0';
                      return (
                        <tr key={key}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <i className={`ti ${s.icon}`} style={{ color: s.color }} />
                              <span style={{ fontWeight: 500 }}>{s.label}</span>
                            </div>
                          </td>
                          <td>{val.sent || 0}</td>
                          <td>{val.accepted || 0}</td>
                          <td>{val.expired || 0}</td>
                          <td style={{ fontWeight: 600, color: '#34c759' }}>{fmt(val.revenue)}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--bg-secondary)' }}>
                                <div style={{ width: `${Math.min(Number(convRate), 100)}%`, height: '100%', borderRadius: 3, background: s.color, transition: 'width 0.3s' }} />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 600 }}>{convRate}%</span>
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
        </>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'var(--bg-primary)', fontSize: 13, minWidth: 140 }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="accepted">Accepted</option>
          <option value="redeemed">Redeemed</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={strategyFilter} onChange={(e) => setStrategyFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'var(--bg-primary)', fontSize: 13, minWidth: 160 }}>
          <option value="">All Strategies</option>
          {strategies.map(s => (
            <option key={s} value={s}>{strategyLabels[s].label}</option>
          ))}
        </select>
        <span style={{ fontSize: 13, color: 'var(--text-tertiary)', alignSelf: 'center' }}>{offers.length} offers</span>
      </div>

      {/* Offers Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div className="spinner-apple" />
          <p style={{ marginTop: 16, color: 'var(--text-secondary)' }}>Loading offers...</p>
        </div>
      ) : offers.length === 0 ? (
        <div className="empty-state" style={{ padding: 64 }}>
          <div className="empty-state-icon"><i className="ti ti-discount-off" /></div>
          <h4 className="empty-state-title">No offers found</h4>
          <p className="empty-state-desc">Generate offers to start engaging customers with personalized discounts.</p>
          <button className="btn-apple primary" onClick={generateOffers} disabled={generating}>
            <i className="ti ti-sparkles" style={{ marginRight: 4 }} />{generating ? 'Generating...' : 'Generate Now'}
          </button>
        </div>
      ) : (
        <div className="apple-card">
          <div className="apple-card-body" style={{ padding: 0 }}>
            <table className="apple-table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Strategy</th>
                  <th>Discount</th>
                  <th>Code</th>
                  <th>Status</th>
                  <th>Channel</th>
                  <th>Expires</th>
                  <th>Revenue</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {offers.map(offer => {
                  const s = strategyLabels[offer.strategy] || { label: offer.strategy, icon: 'ti-tag', color: '#8e8e93' };
                  const sc = statusConfig[offer.status] || statusConfig['expired'];
                  const isExpired = new Date(offer.expiresAt) < new Date();

                  return (
                    <tr key={offer.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>
                          {offer.shopifyCustomer
                            ? `${offer.shopifyCustomer.firstName || ''} ${offer.shopifyCustomer.lastName || ''}`.trim() || offer.shopifyCustomer.email
                            : '—'}
                        </div>
                        {offer.shopifyCustomer?.email && (
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{offer.shopifyCustomer.email}</div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <i className={`ti ${s.icon}`} style={{ color: s.color, fontSize: 14 }} />
                          <span>{s.label}</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {offer.discountType === 'percentage' ? `${offer.discountValue}%` :
                         offer.discountType === 'free_shipping' ? 'Free Ship' : fmt(offer.discountValue)}
                      </td>
                      <td><code style={{ fontSize: 11 }}>{offer.discountCode || '—'}</code></td>
                      <td>
                        <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, ...sc }}>
                          {offer.status}
                        </span>
                      </td>
                      <td><span style={{ fontSize: 12 }}>{offer.channel}</span></td>
                      <td style={{ color: isExpired ? '#ff3b30' : 'var(--text-secondary)', fontSize: 12 }}>
                        {fmtDate(offer.expiresAt)}
                      </td>
                      <td style={{ fontWeight: 600, color: offer.resultRevenue ? '#34c759' : 'var(--text-tertiary)' }}>
                        {offer.resultRevenue ? fmt(offer.resultRevenue) : '—'}
                      </td>
                      <td>
                        {offer.status === 'active' && (
                          <button onClick={() => cancelOffer(offer.id)} className="btn-apple ghost small" title="Cancel">
                            <i className="ti ti-x" style={{ color: '#ff3b30' }} />
                          </button>
                        )}
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
