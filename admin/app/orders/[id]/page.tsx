'use client';

import { adminFetch } from '@/lib/api-client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function OrderDetailPage() {
  const params = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadOrder(); }, []);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const response = await adminFetch(`/api/v1/orders/${params.id}`);
      const data = await response.json();
      setOrder(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fmt = (n: any) => `$${Number(n || 0).toFixed(2)}`;
  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleString() : '—';

  const riskColors: Record<string, { bg: string; color: string }> = {
    low: { bg: 'rgba(52,199,89,0.12)', color: '#34c759' },
    normal: { bg: 'rgba(142,142,147,0.12)', color: '#8e8e93' },
    medium: { bg: 'rgba(255,149,0,0.12)', color: '#ff9500' },
    high: { bg: 'rgba(255,59,48,0.12)', color: '#ff3b30' },
  };

  const statusColors: Record<string, { bg: string; color: string }> = {
    paid: { bg: 'rgba(52,199,89,0.12)', color: '#34c759' },
    pending: { bg: 'rgba(255,149,0,0.12)', color: '#ff9500' },
    refunded: { bg: 'rgba(0,122,255,0.12)', color: '#007aff' },
    partially_refunded: { bg: 'rgba(0,122,255,0.12)', color: '#007aff' },
    voided: { bg: 'rgba(142,142,147,0.12)', color: '#8e8e93' },
    failed: { bg: 'rgba(255,59,48,0.12)', color: '#ff3b30' },
    fulfilled: { bg: 'rgba(52,199,89,0.12)', color: '#34c759' },
    partial: { bg: 'rgba(255,149,0,0.12)', color: '#ff9500' },
    unfulfilled: { bg: 'rgba(142,142,147,0.12)', color: '#8e8e93' },
  };

  const getBadge = (status: string, map: Record<string, { bg: string; color: string }>) => {
    const s = map[status] || map['normal'] || { bg: 'rgba(142,142,147,0.12)', color: '#8e8e93' };
    return (
      <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color }}>
        {status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Unknown'}
      </span>
    );
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <div className="spinner-apple" />
      <p style={{ marginTop: 16, color: 'var(--text-secondary)' }}>Loading order...</p>
    </div>
  );

  if (!order) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <i className="ti ti-file-off" style={{ fontSize: 48, color: 'var(--text-tertiary)' }} />
      <h4 style={{ marginTop: 16 }}>Order not found</h4>
      <Link href="/orders" className="btn-apple primary" style={{ marginTop: 12, textDecoration: 'none' }}>← Back to Orders</Link>
    </div>
  );

  const fulfillments = Array.isArray(order.fulfillments) ? order.fulfillments : [];
  const refunds = Array.isArray(order.refunds) ? order.refunds : [];
  const lineItems = Array.isArray(order.lineItems) ? order.lineItems : [];
  const tags = order.tags ? order.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];

  return (
    <div>
      {/* Breadcrumb */}
      <nav style={{ marginBottom: 20 }}>
        <Link href="/orders" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontSize: 14 }}>
          <i className="ti ti-arrow-left" style={{ marginRight: 4 }} />Back to Orders
        </Link>
      </nav>

      {/* Header */}
      <div className="apple-card" style={{ marginBottom: 20 }}>
        <div className="apple-card-body" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h2 style={{ margin: '0 0 12px', fontSize: 24, fontWeight: 700 }}>
                Order #{order.shopifyOrderNumber || order.orderNumber}
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {getBadge(order.financialStatus || order.paymentStatus, statusColors)}
                {getBadge(order.fulfillmentStatus, statusColors)}
                {order.riskLevel && order.riskLevel !== 'normal' && (
                  <span style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                    ...riskColors[order.riskLevel] || riskColors['normal'],
                  }}>
                    <i className="ti ti-shield-exclamation" style={{ marginRight: 4 }} />
                    Risk: {order.riskLevel}
                  </span>
                )}
              </div>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 14 }}>
                Placed on {fmtDate(order.createdAt)}
                {order.processedAt && ` · Processed ${fmtDate(order.processedAt)}`}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {order.shopifyOrderId && (
                <a href={`https://admin.shopify.com/store/eagledtfsupply/orders/${order.shopifyOrderId}`}
                  target="_blank" rel="noopener noreferrer" className="btn-apple secondary" style={{ textDecoration: 'none' }}>
                  <i className="ti ti-external-link" style={{ marginRight: 4 }} />Shopify
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div>
          {/* Line Items */}
          <div className="apple-card" style={{ marginBottom: 20 }}>
            <div className="apple-card-header">
              <h3 className="apple-card-title"><i className="ti ti-package" style={{ marginRight: 8 }} />Items ({lineItems.length})</h3>
            </div>
            <div className="apple-card-body" style={{ padding: 0 }}>
              <table className="apple-table" style={{ marginBottom: 0 }}>
                <thead><tr><th>Product</th><th style={{ textAlign: 'center' }}>Qty</th><th style={{ textAlign: 'right' }}>Price</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
                <tbody>
                  {lineItems.map((item: any, i: number) => (
                    <tr key={i}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{item.title || item.name}</div>
                        {item.sku && <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>SKU: {item.sku}</div>}
                        {item.variant_title && item.variant_title !== 'Default Title' && (
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.variant_title}</div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(item.price)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt((item.price || 0) * (item.quantity || 1))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fulfillments & Tracking */}
          {fulfillments.length > 0 && (
            <div className="apple-card" style={{ marginBottom: 20 }}>
              <div className="apple-card-header">
                <h3 className="apple-card-title"><i className="ti ti-truck" style={{ marginRight: 8 }} />Fulfillments ({fulfillments.length})</h3>
              </div>
              <div className="apple-card-body">
                {fulfillments.map((f: any, i: number) => (
                  <div key={i} style={{
                    padding: 16, background: 'var(--bg-secondary)', borderRadius: 10, marginBottom: i < fulfillments.length - 1 ? 12 : 0,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontWeight: 600 }}>Shipment #{i + 1}</span>
                      {getBadge(f.status || f.shipmentStatus || 'pending', statusColors)}
                    </div>
                    {f.trackingNumber && (
                      <div style={{ marginBottom: 8, fontSize: 14 }}>
                        <strong>Tracking:</strong>{' '}
                        {f.trackingUrl ? (
                          <a href={f.trackingUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>
                            {f.trackingNumber} <i className="ti ti-external-link" style={{ fontSize: 12 }} />
                          </a>
                        ) : f.trackingNumber}
                      </div>
                    )}
                    {f.trackingCompany && (
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                        <i className="ti ti-building" style={{ marginRight: 4 }} />{f.trackingCompany}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Created: {fmtDate(f.createdAt)}</div>
                    {f.lineItems && f.lineItems.length > 0 && (
                      <div style={{ marginTop: 8, fontSize: 13 }}>
                        <strong>Items:</strong> {f.lineItems.map((li: any) => `${li.title} ×${li.quantity}`).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Refunds */}
          {refunds.length > 0 && (
            <div className="apple-card" style={{ marginBottom: 20 }}>
              <div className="apple-card-header">
                <h3 className="apple-card-title" style={{ color: '#ff3b30' }}>
                  <i className="ti ti-arrow-back" style={{ marginRight: 8 }} />Refunds ({refunds.length})
                </h3>
              </div>
              <div className="apple-card-body">
                {refunds.map((r: any, i: number) => (
                  <div key={i} style={{
                    padding: 16, background: 'rgba(255,59,48,0.04)', borderRadius: 10, border: '1px solid rgba(255,59,48,0.12)',
                    marginBottom: i < refunds.length - 1 ? 12 : 0,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: 600 }}>Refund #{i + 1}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{fmtDate(r.createdAt)}</span>
                    </div>
                    {r.note && <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Note: {r.note}</p>}
                    {r.transactions?.map((t: any, ti: number) => (
                      <div key={ti} style={{ fontSize: 14, fontWeight: 600, color: '#ff3b30' }}>
                        -{fmt(t.amount)} ({t.kind})
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer & Address */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {order.shippingAddress && (
              <div className="apple-card">
                <div className="apple-card-header">
                  <h3 className="apple-card-title"><i className="ti ti-map-pin" style={{ marginRight: 8 }} />Shipping</h3>
                </div>
                <div className="apple-card-body" style={{ fontSize: 14 }}>
                  <p style={{ fontWeight: 600, marginBottom: 4 }}>{order.shippingAddress.first_name || order.shippingAddress.firstName} {order.shippingAddress.last_name || order.shippingAddress.lastName}</p>
                  {order.shippingAddress.company && <p style={{ marginBottom: 4 }}>{order.shippingAddress.company}</p>}
                  <p style={{ marginBottom: 4 }}>{order.shippingAddress.address1}</p>
                  {order.shippingAddress.address2 && <p style={{ marginBottom: 4 }}>{order.shippingAddress.address2}</p>}
                  <p style={{ marginBottom: 4 }}>{order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.zip}</p>
                  <p style={{ marginBottom: 0 }}>{order.shippingAddress.country}</p>
                </div>
              </div>
            )}
            {order.billingAddress && (
              <div className="apple-card">
                <div className="apple-card-header">
                  <h3 className="apple-card-title"><i className="ti ti-credit-card" style={{ marginRight: 8 }} />Billing</h3>
                </div>
                <div className="apple-card-body" style={{ fontSize: 14 }}>
                  <p style={{ fontWeight: 600, marginBottom: 4 }}>{order.billingAddress.first_name || order.billingAddress.firstName} {order.billingAddress.last_name || order.billingAddress.lastName}</p>
                  {order.billingAddress.company && <p style={{ marginBottom: 4 }}>{order.billingAddress.company}</p>}
                  <p style={{ marginBottom: 4 }}>{order.billingAddress.address1}</p>
                  <p style={{ marginBottom: 4 }}>{order.billingAddress.city}, {order.billingAddress.province} {order.billingAddress.zip}</p>
                  <p style={{ marginBottom: 0 }}>{order.billingAddress.country}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div>
          {/* Order Summary */}
          <div className="apple-card" style={{ marginBottom: 20 }}>
            <div className="apple-card-header">
              <h3 className="apple-card-title"><i className="ti ti-receipt" style={{ marginRight: 8 }} />Summary</h3>
            </div>
            <div className="apple-card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                  <span>{fmt(order.subtotal || order.subtotalPrice)}</span>
                </div>
                {Number(order.totalShipping) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Shipping</span>
                    <span>{fmt(order.totalShipping)}</span>
                  </div>
                )}
                {Number(order.totalTax || order.taxTotal) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Tax</span>
                    <span>{fmt(order.totalTax || order.taxTotal)}</span>
                  </div>
                )}
                {Number(order.totalDiscounts || order.discountTotal) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Discounts</span>
                    <span style={{ color: '#34c759' }}>-{fmt(order.totalDiscounts || order.discountTotal)}</span>
                  </div>
                )}
                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 8, marginTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16 }}>
                    <span>Total</span>
                    <span style={{ color: 'var(--accent-primary)' }}>{fmt(order.totalPrice)}</span>
                  </div>
                </div>
                {Number(order.totalRefunded) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ff3b30' }}>
                    <span>Refunded</span>
                    <span>-{fmt(order.totalRefunded)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="apple-card" style={{ marginBottom: 20 }}>
            <div className="apple-card-header">
              <h3 className="apple-card-title"><i className="ti ti-user" style={{ marginRight: 8 }} />Customer</h3>
            </div>
            <div className="apple-card-body" style={{ fontSize: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {order.company && (
                <div><strong>Company:</strong> {order.company.name}</div>
              )}
              {order.companyUser && (
                <div><strong>User:</strong> {order.companyUser.firstName} {order.companyUser.lastName}</div>
              )}
              {order.email && (
                <div><i className="ti ti-mail" style={{ marginRight: 4, fontSize: 14 }} />{order.email}</div>
              )}
              {order.phone && (
                <div><i className="ti ti-phone" style={{ marginRight: 4, fontSize: 14 }} />{order.phone}</div>
              )}
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="apple-card" style={{ marginBottom: 20 }}>
              <div className="apple-card-header">
                <h3 className="apple-card-title"><i className="ti ti-notes" style={{ marginRight: 8 }} />Notes</h3>
              </div>
              <div className="apple-card-body" style={{ fontSize: 14 }}>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{order.notes}</p>
              </div>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="apple-card" style={{ marginBottom: 20 }}>
              <div className="apple-card-header">
                <h3 className="apple-card-title"><i className="ti ti-tags" style={{ marginRight: 8 }} />Tags</h3>
              </div>
              <div className="apple-card-body">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {tags.map((tag: string, i: number) => (
                    <span key={i} style={{
                      padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 500,
                      background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                    }}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Lifecycle */}
          <div className="apple-card">
            <div className="apple-card-header">
              <h3 className="apple-card-title"><i className="ti ti-timeline" style={{ marginRight: 8 }} />Timeline</h3>
            </div>
            <div className="apple-card-body" style={{ fontSize: 13 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div><strong>Created:</strong> {fmtDate(order.createdAt)}</div>
                {order.processedAt && <div><strong>Processed:</strong> {fmtDate(order.processedAt)}</div>}
                {order.closedAt && <div><strong>Closed:</strong> {fmtDate(order.closedAt)}</div>}
                {order.cancelledAt && <div style={{ color: '#ff3b30' }}><strong>Cancelled:</strong> {fmtDate(order.cancelledAt)}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
