'use client';

import { adminFetch } from '@/lib/api-client';
import { useEffect, useState } from 'react';

const stageIcons: Record<string, string> = {
  first_visit: '👁️',
  browse_session: '🔍',
  product_view: '📦',
  add_to_cart: '🛒',
  cart_created: '📝',
  cart_converted: '✅',
  logged_in: '🔐',
  order_placed: '🎉',
  order_processed: '⚡',
  order_cancelled: '❌',
};

const stageColors: Record<string, { bg: string; border: string; text: string }> = {
  first_visit: { bg: 'rgba(0,122,255,0.08)', border: '#007aff', text: '#007aff' },
  browse_session: { bg: 'rgba(142,142,147,0.08)', border: '#8e8e93', text: '#8e8e93' },
  product_view: { bg: 'rgba(88,86,214,0.08)', border: '#5856d6', text: '#5856d6' },
  add_to_cart: { bg: 'rgba(255,149,0,0.08)', border: '#ff9500', text: '#ff9500' },
  cart_created: { bg: 'rgba(255,204,0,0.08)', border: '#ffcc00', text: '#b89700' },
  cart_converted: { bg: 'rgba(52,199,89,0.08)', border: '#34c759', text: '#34c759' },
  logged_in: { bg: 'rgba(90,200,250,0.08)', border: '#5ac8fa', text: '#5ac8fa' },
  order_placed: { bg: 'rgba(52,199,89,0.08)', border: '#34c759', text: '#34c759' },
  order_processed: { bg: 'rgba(52,199,89,0.08)', border: '#34c759', text: '#34c759' },
  order_cancelled: { bg: 'rgba(255,59,48,0.08)', border: '#ff3b30', text: '#ff3b30' },
};

export default function CustomerJourneyPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [journey, setJourney] = useState<any>(null);
  const [funnel, setFunnel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [custRes, funnelRes] = await Promise.all([
        adminFetch('/api/v1/shopify-customers'),
        adminFetch('/api/v1/orders/journey-funnel'),
      ]);
      const custData = await custRes.json();
      setCustomers(Array.isArray(custData) ? custData : []);

      if (funnelRes.ok) {
        const funnelData = await funnelRes.json();
        setFunnel(funnelData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadJourney = async (shopifyCustomerId: string) => {
    try {
      setJourneyLoading(true);
      setSelectedCustomer(shopifyCustomerId);
      const res = await adminFetch(`/api/v1/orders/journey/${shopifyCustomerId}`);
      if (res.ok) {
        const data = await res.json();
        setJourney(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setJourneyLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  const fmtDate = (d: string) => new Date(d).toLocaleString();
  const fmtDay = (d: string) => new Date(d).toLocaleDateString();

  const filteredCustomers = customers.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (c.email || '').toLowerCase().includes(s) ||
           (c.firstName || '').toLowerCase().includes(s) ||
           (c.lastName || '').toLowerCase().includes(s);
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>
            <i className="ti ti-route" style={{ marginRight: 10, color: 'var(--accent-primary)' }} />
            Customer Journey
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
            Track the full lifecycle: Visit → Browse → Cart → Order → Repeat
          </p>
        </div>
        <button className="btn-apple secondary" onClick={loadData}>
          <i className="ti ti-refresh" style={{ marginRight: 4 }} />Refresh
        </button>
      </div>

      {/* Conversion Funnel */}
      {funnel && (
        <div className="apple-card" style={{ marginBottom: 24 }}>
          <div className="apple-card-header">
            <h3 className="apple-card-title">
              <i className="ti ti-chart-infographic" style={{ marginRight: 8, color: 'var(--accent-primary)' }} />
              Conversion Funnel
            </h3>
          </div>
          <div className="apple-card-body">
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0, height: 200 }}>
              {funnel.funnel.map((stage: any, i: number) => {
                const maxCount = funnel.funnel[0]?.count || 1;
                const height = Math.max(30, (stage.count / maxCount) * 180);
                const colors = [
                  { bg: 'linear-gradient(135deg, #007aff, #5ac8fa)', text: '#007aff' },
                  { bg: 'linear-gradient(135deg, #5856d6, #af52de)', text: '#5856d6' },
                  { bg: 'linear-gradient(135deg, #ff9500, #ffcc00)', text: '#ff9500' },
                  { bg: 'linear-gradient(135deg, #34c759, #30d158)', text: '#34c759' },
                  { bg: 'linear-gradient(135deg, #ff2d55, #ff375f)', text: '#ff2d55' },
                ];
                const c = colors[i] || colors[0];

                return (
                  <div key={stage.stage} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 18, color: c.text }}>{stage.count.toLocaleString()}</div>
                    <div style={{
                      width: '80%', height, borderRadius: '8px 8px 4px 4px',
                      background: c.bg, position: 'relative', transition: 'height 0.5s ease',
                    }}>
                      {i > 0 && (
                        <div style={{
                          position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)',
                          fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', whiteSpace: 'nowrap',
                        }}>
                          {Object.values(funnel.conversionRates)[i - 1]}%
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>
                      <i className={`ti ti-${stage.icon}`} style={{ display: 'block', fontSize: 16, marginBottom: 2 }} />
                      {stage.label}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{
              display: 'flex', justifyContent: 'center', gap: 24, marginTop: 16, paddingTop: 16,
              borderTop: '1px solid var(--border-light)', fontSize: 13,
            }}>
              <span>
                <strong style={{ color: 'var(--accent-primary)' }}>{funnel.conversionRates.overallConversion}%</strong>
                <span style={{ color: 'var(--text-tertiary)', marginLeft: 4 }}>Overall Conversion</span>
              </span>
              <span>
                <strong>{funnel.totalOrders}</strong>
                <span style={{ color: 'var(--text-tertiary)', marginLeft: 4 }}>Total Orders</span>
              </span>
              <span>
                <strong>{funnel.pickupOrders}</strong>
                <span style={{ color: 'var(--text-tertiary)', marginLeft: 4 }}>Pickup Orders</span>
              </span>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }}>
        {/* Customer List */}
        <div className="apple-card" style={{ maxHeight: 'calc(100vh - 300px)', display: 'flex', flexDirection: 'column' }}>
          <div className="apple-card-header" style={{ flexShrink: 0 }}>
            <h3 className="apple-card-title">
              <i className="ti ti-users" style={{ marginRight: 8 }} />Customers ({customers.length})
            </h3>
          </div>
          <div style={{ padding: '0 16px 8px', flexShrink: 0 }}>
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-light)',
                background: 'var(--bg-secondary)', fontSize: 13, color: 'var(--text-primary)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '0 8px 8px' }}>
            {filteredCustomers.slice(0, 100).map((c: any) => (
              <button
                key={c.shopifyCustomerId || c.id}
                onClick={() => loadJourney(c.shopifyCustomerId || c.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: selectedCustomer === (c.shopifyCustomerId || c.id) ? 'var(--accent-primary)' : 'transparent',
                  color: selectedCustomer === (c.shopifyCustomerId || c.id) ? '#fff' : 'var(--text-primary)',
                  textAlign: 'left', marginBottom: 2, transition: 'all 0.15s ease',
                  fontSize: 13,
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: selectedCustomer === (c.shopifyCustomerId || c.id)
                    ? 'rgba(255,255,255,0.2)' : 'var(--bg-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 14,
                  color: selectedCustomer === (c.shopifyCustomerId || c.id) ? '#fff' : 'var(--accent-primary)',
                }}>
                  {(c.firstName || c.email || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.firstName || ''} {c.lastName || ''}
                  </div>
                  <div style={{
                    fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    opacity: 0.7,
                  }}>
                    {c.email}
                  </div>
                </div>
                {c.ordersCount > 0 && (
                  <span style={{
                    padding: '2px 6px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                    background: selectedCustomer === (c.shopifyCustomerId || c.id) ? 'rgba(255,255,255,0.25)' : 'rgba(52,199,89,0.12)',
                    color: selectedCustomer === (c.shopifyCustomerId || c.id) ? '#fff' : '#34c759',
                  }}>
                    {c.ordersCount} orders
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Journey Detail */}
        <div>
          {!selectedCustomer && (
            <div style={{
              textAlign: 'center', padding: 60, background: 'var(--bg-secondary)', borderRadius: 16,
            }}>
              <i className="ti ti-route" style={{ fontSize: 48, color: 'var(--text-tertiary)' }} />
              <h4 style={{ marginTop: 16, color: 'var(--text-secondary)' }}>Select a customer to view their journey</h4>
              <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
                Click on a customer from the list to see their full lifecycle timeline
              </p>
            </div>
          )}

          {journeyLoading && (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <div className="spinner-apple" />
              <p style={{ marginTop: 16, color: 'var(--text-secondary)' }}>Loading journey...</p>
            </div>
          )}

          {journey && !journeyLoading && (
            <div>
              {/* Customer Header */}
              {journey.customer && (
                <div className="apple-card" style={{ marginBottom: 16 }}>
                  <div className="apple-card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{
                        width: 52, height: 52, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--accent-primary), #5856d6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 700, fontSize: 20,
                      }}>
                        {(journey.customer.firstName || journey.customer.email || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 18 }}>
                          {journey.customer.firstName} {journey.customer.lastName}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{journey.customer.email}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {journey.customer.insight?.rfmSegment && (
                        <span style={{
                          padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                          background: 'rgba(88,86,214,0.12)', color: '#5856d6',
                        }}>
                          {journey.customer.insight.rfmSegment.replace(/_/g, ' ')}
                        </span>
                      )}
                      {journey.customer.insight?.clvTier && (
                        <span style={{
                          padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                          background: journey.customer.insight.clvTier === 'platinum' ? 'rgba(229,231,235,1)' :
                                     journey.customer.insight.clvTier === 'gold' ? 'rgba(254,243,199,1)' : 'rgba(241,245,249,1)',
                          color: journey.customer.insight.clvTier === 'platinum' ? '#1f2937' :
                                 journey.customer.insight.clvTier === 'gold' ? '#92400e' : '#475569',
                        }}>
                          {journey.customer.insight.clvTier} tier
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Journey Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Sessions', value: journey.journey.metrics.totalSessions, icon: '🔍', color: '#007aff' },
                  { label: 'Page Views', value: journey.journey.metrics.totalPageViews, icon: '👁️', color: '#5856d6' },
                  { label: 'Orders', value: journey.journey.metrics.totalOrders, icon: '📦', color: '#34c759' },
                  { label: 'Revenue', value: `$${journey.journey.metrics.totalRevenue.toFixed(2)}`, icon: '💰', color: '#ff9500' },
                  { label: 'Time to 1st Order', value: journey.journey.metrics.timeToFirstOrderDays != null ? `${journey.journey.metrics.timeToFirstOrderDays}d` : '—', icon: '⏱️', color: '#5ac8fa' },
                  { label: 'Conversion', value: `${journey.journey.metrics.conversionRate}%`, icon: '📊', color: '#af52de' },
                  { label: 'Design Files', value: journey.journey.metrics.designFileOrderCount, icon: '🎨', color: '#ff2d55' },
                  { label: 'Avg Session', value: formatDuration(journey.journey.metrics.avgSessionDuration), icon: '⌛', color: '#8e8e93' },
                ].map((metric, i) => (
                  <div key={i} className="apple-card" style={{ marginBottom: 0 }}>
                    <div className="apple-card-body" style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{metric.icon}</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: metric.color }}>{metric.value}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{metric.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Timeline */}
              <div className="apple-card">
                <div className="apple-card-header">
                  <h3 className="apple-card-title">
                    <i className="ti ti-timeline" style={{ marginRight: 8 }} />
                    Journey Timeline ({journey.journey.timeline.length} events)
                  </h3>
                </div>
                <div className="apple-card-body" style={{ padding: '8px 16px 16px' }}>
                  {journey.journey.timeline.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>
                      No journey events recorded yet
                    </div>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      {/* Vertical line */}
                      <div style={{
                        position: 'absolute', left: 19, top: 0, bottom: 0, width: 2,
                        background: 'var(--border-light)',
                      }} />

                      {journey.journey.timeline.map((event: any, i: number) => {
                        const sc = stageColors[event.type] || stageColors.browse_session;
                        const icon = stageIcons[event.type] || '•';

                        return (
                          <div key={i} style={{
                            display: 'flex', gap: 14, marginBottom: 12, position: 'relative',
                          }}>
                            {/* Dot */}
                            <div style={{
                              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                              background: sc.bg, border: `2px solid ${sc.border}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 16, zIndex: 1,
                            }}>
                              {icon}
                            </div>

                            {/* Content */}
                            <div style={{
                              flex: 1, padding: '8px 14px', borderRadius: 10,
                              background: sc.bg, border: `1px solid ${sc.border}20`,
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                <span style={{ fontWeight: 600, fontSize: 13, color: sc.text }}>
                                  {event.type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                </span>
                                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                                  {fmtDate(event.timestamp)}
                                </span>
                              </div>

                              {/* Event-specific data */}
                              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                {event.type === 'first_visit' && (
                                  <>
                                    {event.data.landingPage && <div>Landing: {event.data.landingPage}</div>}
                                    {event.data.trafficChannel && <div>Channel: {event.data.trafficChannel}</div>}
                                    {event.data.utmSource && <div>Source: {event.data.utmSource}</div>}
                                  </>
                                )}
                                {event.type === 'browse_session' && (
                                  <div style={{ display: 'flex', gap: 12 }}>
                                    <span>👁️ {event.data.pageViews} pages</span>
                                    <span>📦 {event.data.productViews} products</span>
                                    {event.data.addToCarts > 0 && <span>🛒 {event.data.addToCarts} add-to-cart</span>}
                                    <span>⏱️ {formatDuration(event.data.duration)}</span>
                                  </div>
                                )}
                                {event.type === 'product_view' && (
                                  <div>{event.data.productTitle} — ${Number(event.data.productPrice || 0).toFixed(2)}</div>
                                )}
                                {event.type === 'add_to_cart' && (
                                  <div>{event.data.productTitle} ×{event.data.quantity} (Cart: ${Number(event.data.cartValue || 0).toFixed(2)})</div>
                                )}
                                {event.type === 'cart_created' && (
                                  <div>Status: {event.data.status} · ${Number(event.data.total || 0).toFixed(2)} · {event.data.itemCount} items</div>
                                )}
                                {event.type === 'order_placed' && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    <span>#{event.data.orderNumber}</span>
                                    <span style={{ fontWeight: 600 }}>${Number(event.data.totalPrice || 0).toFixed(2)}</span>
                                    <span>{event.data.lineItemCount} items</span>
                                    {event.data.hasDesignFiles && (
                                      <span style={{ color: '#5856d6' }}>🎨 {event.data.designFileCount} files</span>
                                    )}
                                    {event.data.isPickup && (
                                      <span style={{ color: '#ff9500' }}>📍 Pickup</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
