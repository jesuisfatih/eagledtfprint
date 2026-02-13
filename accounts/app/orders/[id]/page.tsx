'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import OrderTracking from '../components/OrderTracking';
import { accountsFetch } from '@/lib/api-client';
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils';
import { OrderStatusBadge, ReorderButton } from '@/components/orders';
import type { Order } from '@eagle/types';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    loadOrder();
  }, [params.id]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await accountsFetch(`/api/v1/orders/${params.id}`);
      if (!response.ok) {
        throw new Error('Failed to load order');
      }
      const data = await response.json();
      setOrder(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = async () => {
    if (!order?.lineItems) return;
    
    setReordering(true);
    try {
      const merchantId = localStorage.getItem('eagle_merchantId') || '';
      const companyId = localStorage.getItem('eagle_companyId') || '';
      const userId = localStorage.getItem('eagle_userId') || '';
      
      // First get or create active cart
      let cartResponse = await accountsFetch('/api/v1/carts/active');
      let cart = null;
      
      if (cartResponse.ok && cartResponse.status !== 204) {
        cart = await cartResponse.json().catch(() => null);
      }
      
      if (!cart || !cart.id) {
        const createResponse = await accountsFetch('/api/v1/carts', {
          method: 'POST',
          body: JSON.stringify({ merchantId, companyId, createdByUserId: userId }),
        });
        if (createResponse.ok) {
          cart = await createResponse.json();
        }
      }
      
      if (!cart || !cart.id) {
        alert('Failed to create cart');
        setReordering(false);
        return;
      }
      
      let addedCount = 0;
      for (const item of order.lineItems) {
        try {
          const response = await accountsFetch(`/api/v1/carts/${cart.id}/items`, {
            method: 'POST',
            body: JSON.stringify({
              variantId: item.variantId || item.shopifyVariantId,
              shopifyVariantId: (item.shopifyVariantId || item.variantId || '').toString(),
              quantity: item.quantity,
            }),
          });
          if (response.ok) addedCount++;
        } catch (err) {
          console.error('Failed to add item:', err);
        }
      }
      
      if (addedCount > 0) {
        router.push('/cart');
      } else {
        alert('Failed to add items to cart');
      }
    } catch (err) {
      console.error('Reorder error:', err);
    } finally {
      setReordering(false);
    }
  };

  const getPaymentStatusConfig = (status: string) => {
    const configs: Record<string, { style: { background: string; color: string }; icon: string; label: string }> = {
      paid: { style: { background: 'rgba(52,199,89,0.12)', color: 'var(--green)' }, icon: 'check', label: 'Paid' },
      pending: { style: { background: 'rgba(255,149,0,0.12)', color: 'var(--orange)' }, icon: 'clock', label: 'Pending' },
      refunded: { style: { background: 'rgba(0,122,255,0.12)', color: 'var(--accent)' }, icon: 'arrow-back', label: 'Refunded' },
      partially_refunded: { style: { background: 'rgba(0,122,255,0.12)', color: 'var(--accent)' }, icon: 'arrow-back', label: 'Partial Refund' },
      voided: { style: { background: 'rgba(142,142,147,0.12)', color: 'var(--text-secondary)' }, icon: 'x', label: 'Voided' },
    };
    return configs[status] || { style: { background: 'rgba(142,142,147,0.12)', color: 'var(--text-secondary)' }, icon: 'question-mark', label: status };
  };

  const getFulfillmentStatusConfig = (status: string) => {
    const configs: Record<string, { style: { background: string; color: string }; icon: string; label: string }> = {
      fulfilled: { style: { background: 'rgba(52,199,89,0.12)', color: 'var(--green)' }, icon: 'package', label: 'Fulfilled' },
      partial: { style: { background: 'rgba(255,149,0,0.12)', color: 'var(--orange)' }, icon: 'package', label: 'Partially Fulfilled' },
      unfulfilled: { style: { background: 'rgba(142,142,147,0.12)', color: 'var(--text-secondary)' }, icon: 'package-off', label: 'Unfulfilled' },
      shipped: { style: { background: 'rgba(0,122,255,0.12)', color: 'var(--accent)' }, icon: 'truck', label: 'Shipped' },
      delivered: { style: { background: 'rgba(52,199,89,0.12)', color: 'var(--green)' }, icon: 'circle-check', label: 'Delivered' },
    };
    return configs[status] || { style: { background: 'rgba(142,142,147,0.12)', color: 'var(--text-secondary)' }, icon: 'package', label: status || 'Processing' };
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <div className="spinner-apple"></div>
        <p style={{ marginTop: 16, color: 'var(--text-secondary)' }}>Loading order details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <i className="ti ti-alert-circle ti-3x" style={{ color: 'var(--red)', marginBottom: 16, display: 'inline-block' }}></i>
        <h5>Error loading order</h5>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>{error}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={loadOrder} className="btn-apple btn-apple-primary">
            <i className="ti ti-refresh" style={{ marginRight: 4 }}></i>Try Again
          </button>
          <Link href="/orders" className="btn-apple btn-apple-secondary">
            <i className="ti ti-arrow-left" style={{ marginRight: 4 }}></i>Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <i className="ti ti-file-off ti-3x" style={{ color: 'var(--text-secondary)', marginBottom: 16, display: 'inline-block' }}></i>
        <h5>Order not found</h5>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>The order you're looking for doesn't exist or you don't have access.</p>
        <Link href="/orders" className="btn-apple btn-apple-primary">
          <i className="ti ti-arrow-left" style={{ marginRight: 4 }}></i>Back to Orders
        </Link>
      </div>
    );
  }

  const paymentConfig = getPaymentStatusConfig(order.financialStatus);
  const fulfillmentConfig = getFulfillmentStatusConfig(order.fulfillmentStatus);

  return (
    <div>
      {/* Breadcrumb */}
      <nav style={{ marginBottom: 24 }}>
        <Link href="/orders" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
          <i className="ti ti-arrow-left" style={{ marginRight: 4 }}></i>Back to Orders
        </Link>
      </nav>

      {/* Order Header */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body">
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <div>
              <h4 style={{ marginBottom: 8 }}>Order #{order.shopifyOrderNumber || order.id}</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                <span className="badge" style={paymentConfig.style}>
                  <i className={`ti ti-${paymentConfig.icon}`} style={{ marginRight: 4 }}></i>
                  {paymentConfig.label}
                </span>
                <span className="badge" style={fulfillmentConfig.style}>
                  <i className={`ti ti-${fulfillmentConfig.icon}`} style={{ marginRight: 4 }}></i>
                  {fulfillmentConfig.label}
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 0 }}>
                Placed on {formatDate(order.createdAt)} ({formatRelativeTime(order.createdAt)})
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleReorder}
                className="btn-apple btn-apple-primary"
                disabled={reordering}
              >
                {reordering ? (
                  <>
                    <div className="spinner-apple" style={{ width: 16, height: 16, marginRight: 4, display: 'inline-block' }}></div>
                    Adding to cart...
                  </>
                ) : (
                  <>
                    <i className="ti ti-refresh" style={{ marginRight: 4 }}></i>
                    Reorder
                  </>
                )}
              </button>
              <button
                onClick={() => window.print()}
                className="btn-apple btn-apple-secondary"
              >
                <i className="ti ti-printer" style={{ marginRight: 4 }}></i>
                Print
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Order Items */}
        <div>
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h5 className="card-title" style={{ marginBottom: 0 }}>
                <i className="ti ti-package" style={{ marginRight: 8 }}></i>
                Items ({order.lineItems?.length || 0})
              </h5>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <div className="table-container">
                <table className="apple-table" style={{ marginBottom: 0 }}>
                  <thead style={{ background: 'var(--bg-secondary)' }}>
                    <tr>
                      <th>Product</th>
                      <th style={{ textAlign: 'center' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Unit Price</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.lineItems?.map((item: any, i: number) => (
                      <tr key={i}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {item.image && (
                              <img 
                                src={item.image} 
                                alt={item.name}
                                style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 8 }}
                              />
                            )}
                            <div>
                              <p style={{ fontWeight: 600, marginBottom: 0 }}>{item.name}</p>
                              {item.sku && <small style={{ color: 'var(--text-secondary)' }}>SKU: {item.sku}</small>}
                              {item.variantTitle && item.variantTitle !== 'Default Title' && (
                                <small style={{ display: 'block', color: 'var(--text-secondary)' }}>{item.variantTitle}</small>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>{formatCurrency(item.price)}</td>
                        <td style={{ textAlign: 'right', verticalAlign: 'middle', fontWeight: 600 }}>
                          {formatCurrency(item.price * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Shipping Info */}
          {order.shippingAddress && (
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header">
                <h5 className="card-title" style={{ marginBottom: 0 }}>
                  <i className="ti ti-truck" style={{ marginRight: 8 }}></i>Shipping Information
                </h5>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div>
                    <h6 style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>Shipping Address</h6>
                    <p style={{ marginBottom: 4, fontWeight: 600 }}>
                      {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                    </p>
                    {order.shippingAddress.company && (
                      <p style={{ marginBottom: 4 }}>{order.shippingAddress.company}</p>
                    )}
                    <p style={{ marginBottom: 4 }}>{order.shippingAddress.address1}</p>
                    {order.shippingAddress.address2 && (
                      <p style={{ marginBottom: 4 }}>{order.shippingAddress.address2}</p>
                    )}
                    <p style={{ marginBottom: 4 }}>
                      {order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.zip}
                    </p>
                    <p style={{ marginBottom: 0 }}>{order.shippingAddress.country}</p>
                  </div>
                  <div>
                    <h6 style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>Shipping Method</h6>
                    <p style={{ marginBottom: 4, fontWeight: 600 }}>
                      {order.shippingLines?.[0]?.title || 'Standard Shipping'}
                    </p>
                    {order.trackingNumber && (
                      <div style={{ marginTop: 16 }}>
                        <h6 style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>Tracking</h6>
                        <p style={{ marginBottom: 0 }}>
                          <a href={order.trackingUrl || '#'} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                            {order.trackingNumber}
                            <i className="ti ti-external-link" style={{ marginLeft: 4 }}></i>
                          </a>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Order Timeline */}
          <OrderTracking order={order} />
        </div>

        {/* Order Summary Sidebar */}
        <div>
          <div className="card" style={{ position: 'sticky', top: 80 }}>
            <div className="card-header">
              <h6 className="card-title" style={{ marginBottom: 0 }}>
                <i className="ti ti-receipt" style={{ marginRight: 8 }}></i>Order Summary
              </h6>
            </div>
            <div className="card-body">
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </li>
                {order.totalShipping > 0 && (
                  <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Shipping</span>
                    <span>{formatCurrency(order.totalShipping)}</span>
                  </li>
                )}
                {order.totalTax > 0 && (
                  <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Tax</span>
                    <span>{formatCurrency(order.totalTax)}</span>
                  </li>
                )}
                {order.totalDiscounts > 0 && (
                  <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Discounts</span>
                    <span style={{ color: 'var(--green)' }}>-{formatCurrency(order.totalDiscounts)}</span>
                  </li>
                )}
                <li style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600 }}>Total</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent)', fontSize: '1.1rem' }}>
                      {formatCurrency(order.totalPrice)}
                    </span>
                  </div>
                </li>
              </ul>

              {/* B2B Savings Info */}
              {order.totalDiscounts > 0 && (
                <div className="alert" style={{ background: 'rgba(52,199,89,0.08)', color: 'var(--green)', marginTop: 16, marginBottom: 0, fontSize: '0.875rem' }}>
                  <i className="ti ti-pig-money" style={{ marginRight: 4 }}></i>
                  You saved <strong>{formatCurrency(order.totalDiscounts)}</strong> with B2B pricing!
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="card-footer" style={{ background: 'transparent' }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <button
                  onClick={handleReorder}
                  className="btn-apple btn-apple-primary"
                  disabled={reordering}
                >
                  {reordering ? (
                    <div className="spinner-apple" style={{ width: 16, height: 16, marginRight: 4, display: 'inline-block' }}></div>
                  ) : (
                    <i className="ti ti-refresh" style={{ marginRight: 4 }}></i>
                  )}
                  Reorder All Items
                </button>
                <button
                  onClick={() => window.print()}
                  className="btn-apple btn-apple-secondary"
                >
                  <i className="ti ti-printer" style={{ marginRight: 4 }}></i>
                  Print Invoice
                </button>
                <Link href="/support" className="btn-apple btn-apple-secondary">
                  <i className="ti ti-headset" style={{ marginRight: 4 }}></i>
                  Need Help?
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

