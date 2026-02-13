'use client';

import { accountsFetch } from '@/lib/api-client';
import { useEffect, useState } from 'react';

interface PickupOrder {
  id: string;
  qrCode: string;
  status: string;
  orderNumber: string;
  customerName: string;
  designFiles: any[];
  notes: string;
  shelf: { code: string; name: string; description: string } | null;
  order: { shopifyOrderNumber: string; totalPrice: number } | null;
  assignedAt: string | null;
  readyAt: string | null;
  notifiedAt: string | null;
  pickedUpAt: string | null;
  createdAt: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: string; bgColor: string; step: number }> = {
  pending:    { label: 'Order Received',      color: '#f59e0b', bgColor: 'rgba(245,158,11,0.1)',  icon: 'ti-clock',          step: 1 },
  processing: { label: 'Preparing',           color: '#3b82f6', bgColor: 'rgba(59,130,246,0.1)',  icon: 'ti-loader',         step: 2 },
  ready:      { label: 'Ready for Pickup',    color: '#10b981', bgColor: 'rgba(16,185,129,0.1)', icon: 'ti-package-export',  step: 3 },
  notified:   { label: 'Notified',            color: '#06b6d4', bgColor: 'rgba(6,182,212,0.1)',  icon: 'ti-bell-ringing',   step: 4 },
  picked_up:  { label: 'Picked Up',           color: '#8b5cf6', bgColor: 'rgba(139,92,246,0.1)', icon: 'ti-circle-check',   step: 5 },
  completed:  { label: 'Completed',           color: '#6b7280', bgColor: 'rgba(107,114,128,0.1)', icon: 'ti-checks',        step: 6 },
};

export default function PickupPage() {
  const [orders, setOrders] = useState<PickupOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<PickupOrder | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await accountsFetch('/api/v1/pickup/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Failed to fetch pickup orders', e);
    }
    setLoading(false);
  };

  const getStatus = (status: string) => STATUS_MAP[status] || STATUS_MAP.pending;

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Separate orders into active and completed
  const activeOrders = orders.filter(o => !['picked_up', 'completed'].includes(o.status));
  const completedOrders = orders.filter(o => ['picked_up', 'completed'].includes(o.status));

  return (
    <>
      <div className="page-header mb-24">
        <div>
          <h1 className="page-title">Pickup Tracking</h1>
          <p className="page-subtitle">Track the preparation and delivery status of your orders</p>
        </div>
        <a href="/qrpickup" target="_blank" className="btn-apple secondary sm" style={{ textDecoration: 'none' }}>
          <i className="ti ti-qrcode" style={{ marginRight: 6 }} /> QR Kiosk
        </a>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-tertiary)' }}>
          <i className="ti ti-loader" style={{ fontSize: 28, animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: 12 }}>Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="apple-card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 18,
            background: 'var(--bg-hover)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <i className="ti ti-package-off" style={{ fontSize: 32, color: 'var(--text-quaternary)' }} />
          </div>
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>No pickup orders yet</h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
            Your store pickup orders will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* Active Orders */}
          {activeOrders.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-clock" style={{ color: 'var(--accent-blue)' }} />
                Active Orders
                <span style={{ background: 'var(--accent-blue)', color: '#fff', borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>
                  {activeOrders.length}
                </span>
              </h2>

              <div style={{ display: 'grid', gap: 12 }}>
                {activeOrders.map(order => {
                  const st = getStatus(order.status);
                  return (
                    <div key={order.id} className="apple-card" style={{
                      padding: 0, overflow: 'hidden', cursor: 'pointer',
                      borderLeft: `4px solid ${st.color}`,
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    }}
                    onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                    >
                      {/* Card Header */}
                      <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: st.bgColor, display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                          }}>
                            <i className={`ti ${st.icon}`} style={{ fontSize: 22, color: st.color }} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                              Order #{order.orderNumber || '—'}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                              {formatDate(order.createdAt)}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {/* Shelf Badge */}
                          {order.shelf && (
                            <div style={{
                              padding: '6px 14px', borderRadius: 10,
                              background: 'rgba(16,185,129,0.1)',
                              border: '1px solid rgba(16,185,129,0.2)',
                            }}>
                              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'block', lineHeight: 1 }}>SHELF</span>
                              <span style={{ fontSize: 18, fontWeight: 800, color: '#10b981', letterSpacing: 1 }}>{order.shelf.code}</span>
                            </div>
                          )}

                          {/* Status Badge */}
                          <div style={{
                            padding: '6px 14px', borderRadius: 20,
                            background: st.bgColor, color: st.color,
                            fontSize: 12, fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: 6,
                          }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: st.color }} />
                            {st.label}
                          </div>

                          <i className={`ti ${selectedOrder?.id === order.id ? 'ti-chevron-up' : 'ti-chevron-down'}`}
                            style={{ color: 'var(--text-quaternary)', fontSize: 16 }} />
                        </div>
                      </div>

                      {/* Progress Steps */}
                      <div style={{
                        padding: '0 20px 16px',
                        display: 'flex', gap: 2, alignItems: 'center',
                      }}>
                        {Object.entries(STATUS_MAP).slice(0, 5).map(([key, val], i) => (
                          <div key={key} style={{
                            flex: 1, height: 4, borderRadius: 2,
                            background: st.step > i ? val.color : 'var(--border-light)',
                            transition: 'background 0.3s ease',
                          }} />
                        ))}
                      </div>

                      {/* Expanded Detail */}
                      {selectedOrder?.id === order.id && (
                        <div style={{
                          padding: '16px 20px',
                          borderTop: '1px solid var(--border-light)',
                          background: 'var(--bg-secondary)',
                        }}>
                          {/* Timeline */}
                          <div style={{ marginBottom: 16 }}>
                            <h4 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                              Progress Tracking
                            </h4>
                            <div style={{ display: 'grid', gap: 8 }}>
                              {[
                                { label: 'Order Created', date: order.createdAt, done: true },
                                { label: 'Assigned to Shelf', date: order.assignedAt, done: !!order.assignedAt },
                                { label: 'Ready for Pickup', date: order.readyAt, done: !!order.readyAt },
                                { label: 'Notification Sent', date: order.notifiedAt, done: !!order.notifiedAt },
                                { label: 'Picked Up', date: order.pickedUpAt, done: !!order.pickedUpAt },
                              ].map((step, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div style={{
                                    width: 22, height: 22, borderRadius: '50%',
                                    border: `2px solid ${step.done ? '#10b981' : 'var(--border-light)'}`,
                                    background: step.done ? 'rgba(16,185,129,0.15)' : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  }}>
                                    {step.done && <i className="ti ti-check" style={{ fontSize: 12, color: '#10b981' }} />}
                                  </div>
                                  <span style={{ fontSize: 13, color: step.done ? 'var(--text-primary)' : 'var(--text-quaternary)', fontWeight: step.done ? 500 : 400 }}>
                                    {step.label}
                                  </span>
                                  <span style={{ fontSize: 11, color: 'var(--text-quaternary)', marginLeft: 'auto' }}>
                                    {step.done ? formatDate(step.date as string) : '—'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Shelf Info */}
                          {order.shelf && (
                            <div style={{
                              padding: 14, borderRadius: 12,
                              background: 'rgba(16,185,129,0.06)',
                              border: '1px solid rgba(16,185,129,0.12)',
                            }}>
                              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                                Pickup Location
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ fontSize: 28, fontWeight: 800, color: '#10b981' }}>{order.shelf.code}</span>
                                <div>
                                  {order.shelf.name && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{order.shelf.name}</div>}
                                  {order.shelf.description && <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{order.shelf.description}</div>}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* QR Code */}
                          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <i className="ti ti-qrcode" style={{ color: 'var(--text-quaternary)' }} />
                            <code style={{ fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: 4 }}>
                              {order.qrCode}
                            </code>
                          </div>

                          {/* Design Files */}
                          {Array.isArray(order.designFiles) && order.designFiles.length > 0 && (
                            <div style={{ marginTop: 12 }}>
                              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6 }}>Design Files</div>
                              {order.designFiles.map((f: any, i: number) => (
                                <div key={i} style={{
                                  padding: '8px 12px', borderRadius: 8,
                                  background: 'var(--bg-hover)', marginBottom: 4,
                                  display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
                                }}>
                                  <i className="ti ti-file" style={{ color: 'var(--accent-blue)' }} />
                                  <span style={{ color: 'var(--text-secondary)' }}>{f.lineItemTitle || f.fileName || `File ${i + 1}`}</span>
                                  {f.previewUrl && (
                                    <a href={f.previewUrl} target="_blank" style={{ marginLeft: 'auto', color: 'var(--accent-blue)', fontSize: 11 }}>
                                      Preview
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Completed Orders */}
          {completedOrders.length > 0 && (
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-circle-check" style={{ color: 'var(--accent-green)' }} />
                Completed Orders
                <span style={{ background: 'var(--bg-hover)', color: 'var(--text-tertiary)', borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 600 }}>
                  {completedOrders.length}
                </span>
              </h2>
              <div className="apple-card" style={{ padding: 0 }}>
                <table className="apple-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Status</th>
                      <th>Shelf</th>
                      <th>Pickup Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedOrders.map(o => {
                      const st = getStatus(o.status);
                      return (
                        <tr key={o.id}>
                          <td style={{ fontWeight: 600 }}>#{o.orderNumber || '—'}</td>
                          <td>
                            <span style={{
                              padding: '3px 10px', borderRadius: 20,
                              background: st.bgColor, color: st.color,
                              fontSize: 11, fontWeight: 600,
                            }}>
                              {st.label}
                            </span>
                          </td>
                          <td>{o.shelf?.code || '—'}</td>
                          <td style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                            {formatDate(o.pickedUpAt)}
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

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
