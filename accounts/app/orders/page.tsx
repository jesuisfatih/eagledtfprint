'use client';

import { useState, useEffect } from 'react';
import { accountsFetch } from '@/lib/api-client';
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils';
import { OrderStatusBadge } from '@/components/orders/OrderTimeline';
import { ReorderButton, QuickReorderPanel } from '@/components/orders/ReorderComponents';
import type { Order } from '@eagle/types';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopDomain, setShopDomain] = useState('');
  const [shopDomainLoading, setShopDomainLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'fulfilled'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'total'>('date');

  useEffect(() => {
    loadOrders();
    loadShopDomain();
  }, []);

  const loadShopDomain = async () => {
    try {
      const companyId = localStorage.getItem('eagle_companyId') || '';
      const response = await accountsFetch(`/api/v1/companies/${companyId}`);
      if (response.ok) {
        const company = await response.json();
        setShopDomain(company.merchant?.shopDomain || '');
      }
    } catch (err) {}
    finally {
      setShopDomainLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const response = await accountsFetch('/api/v1/orders');
      const data = await response.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Load orders error:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort orders
  const filteredOrders = orders
    .filter(order => {
      if (filter === 'all') return true;
      const status = (order.financialStatus || order.fulfillmentStatus || '').toLowerCase();
      return status.includes(filter);
    })
    .sort((a, b) => {
      if (sortBy === 'total') {
        return (parseFloat(String(b.totalPrice)) || 0) - (parseFloat(String(a.totalPrice)) || 0);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  // Calculate stats
  const totalSpent = orders.reduce((sum, o) => sum + (parseFloat(String(o.totalPrice)) || 0), 0);
  const avgOrderValue = orders.length > 0 ? totalSpent / orders.length : 0;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h4 style={{ fontWeight: 600, marginBottom: 4 }}>Order History</h4>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>View and track all your orders</p>
        </div>
        <a href="/products" className="btn-apple btn-apple-primary">
          <i className="ti ti-shopping-cart" style={{ marginRight: 6 }}></i>
          New Order
        </a>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card" style={{ background: 'var(--accent)', color: '#fff' }}>
          <div className="stat-icon">
            <i className="ti ti-package" style={{ opacity: 0.7 }}></i>
          </div>
          <div className="stat-info">
            <span className="stat-label" style={{ opacity: 0.85 }}>Total Orders</span>
            <span className="stat-value">{orders.length}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ color: 'var(--green)' }}>
            <i className="ti ti-wallet"></i>
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Spent</span>
            <span className="stat-value" style={{ color: 'var(--green)' }}>{formatCurrency(totalSpent)}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ color: 'var(--accent)' }}>
            <i className="ti ti-chart-line"></i>
          </div>
          <div className="stat-info">
            <span className="stat-label">Avg Order Value</span>
            <span className="stat-value">{formatCurrency(avgOrderValue)}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ color: 'var(--orange)' }}>
            <i className="ti ti-clock"></i>
          </div>
          <div className="stat-info">
            <span className="stat-label">Pending</span>
            <span className="stat-value" style={{ color: 'var(--orange)' }}>
              {orders.filter(o => (o.fulfillmentStatus || '').toLowerCase() === 'unfulfilled').length}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24 }}>
        {/* Main Content */}
        <div style={{ flex: '1 1 0%', minWidth: 0 }}>
          {/* Filters */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['all', 'pending', 'paid', 'fulfilled'] as const).map(f => (
                <button
                  key={f}
                  className={filter === f ? 'btn-apple btn-apple-primary' : 'btn-apple btn-apple-secondary'}
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <select 
              className="form-input" 
              style={{ width: 'auto' }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'total')}
            >
              <option value="date">Sort by Date</option>
              <option value="total">Sort by Total</option>
            </select>
          </div>

          {/* Orders List */}
          <div className="card">
            <div className="card-body">
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div className="spinner-apple"></div>
                  <p style={{ marginTop: 16, color: 'var(--text-secondary)' }}>Loading orders...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <i className="ti ti-package ti-3x" style={{ color: 'var(--text-tertiary)', marginBottom: 16, display: 'block' }}></i>
                  <h5>{filter === 'all' ? 'No orders yet' : `No ${filter} orders`}</h5>
                  <p style={{ color: 'var(--text-secondary)' }}>Your order history will appear here</p>
                  <a href="/products" className="btn-apple btn-apple-primary" style={{ marginTop: 8 }}>Start Shopping</a>
                </div>
              ) : (
                <div>
                  {filteredOrders.map((order) => (
                    <div key={order.id} style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <h6 style={{ margin: 0, fontWeight: 600 }}>
                              #{order.orderNumber || order.shopifyOrderNumber}
                            </h6>
                            <OrderStatusBadge 
                              status={order.financialStatus || 'pending'} 
                              fulfillmentStatus={order.fulfillmentStatus}
                              size="sm" 
                            />
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, color: 'var(--text-secondary)', fontSize: 13 }}>
                            <span>
                              <i className="ti ti-calendar" style={{ marginRight: 4 }}></i>
                              {formatDate(order.createdAt)}
                            </span>
                            <span>
                              <i className="ti ti-package" style={{ marginRight: 4 }}></i>
                              {order.lineItems?.length || 0} item{(order.lineItems?.length || 0) !== 1 ? 's' : ''}
                            </span>
                            <span style={{ color: 'var(--text-tertiary)' }}>
                              {formatRelativeTime(order.createdAt)}
                            </span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>
                            {formatCurrency(parseFloat(String(order.totalPrice)) || 0)}
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <a href={`/orders/${order.id}`} className="btn-apple btn-apple-primary">
                              <i className="ti ti-eye" style={{ marginRight: 4 }}></i>View
                            </a>
                            {shopDomainLoading ? (
                              <div className="btn-apple btn-apple-secondary" style={{ width: 80, opacity: 0.5 }}>
                                <span style={{ display: 'inline-block', width: '100%', height: 14, background: 'var(--bg-secondary)', borderRadius: 4 }}></span>
                              </div>
                            ) : shopDomain && (
                              <ReorderButton
                                order={{
                                  id: order.id,
                                  orderNumber: String(order.orderNumber || order.shopifyOrderNumber),
                                  lineItems: (order.lineItems || []).map((item: { variant_id?: string; variantId?: string; title?: string; name?: string; quantity: number; price: number; sku?: string }) => ({
                                    id: item.variant_id || item.variantId || '',
                                    productId: item.variant_id || item.variantId || '',
                                    variantId: item.variant_id || item.variantId,
                                    title: item.title || item.name || '',
                                    quantity: item.quantity,
                                    price: item.price,
                                    sku: item.sku,
                                  })),
                                  totalPrice: parseFloat(String(order.totalPrice)) || 0,
                                  createdAt: order.createdAt,
                                }}
                                shopDomain={shopDomain}
                                variant="outline"
                                size="sm"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Line Items Preview */}
                      {order.lineItems && order.lineItems.length > 0 && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {order.lineItems.slice(0, 3).map((item: { variant_id?: string; variantId?: string; title?: string; name?: string; quantity: number; price: number }, idx: number) => (
                              <span key={idx} className="badge" style={{ background: 'rgba(0,0,0,0.06)', color: 'var(--text-primary)' }}>
                                {item.title || item.name} × {item.quantity}
                              </span>
                            ))}
                            {order.lineItems.length > 3 && (
                              <span className="badge" style={{ background: 'rgba(0,0,0,0.12)', color: 'var(--text-secondary)' }}>
                                +{order.lineItems.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ width: 340, flexShrink: 0 }}>
          {/* Quick Reorder */}
          {shopDomainLoading ? (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><h5 style={{ margin: 0 }}>Quick Reorder</h5></div>
              <div className="card-body">
                <span style={{ display: 'block', width: '100%', height: 40, background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 8 }}></span>
                <span style={{ display: 'block', width: '100%', height: 40, background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 8 }}></span>
                <span style={{ display: 'block', width: '100%', height: 40, background: 'var(--bg-secondary)', borderRadius: 8 }}></span>
              </div>
            </div>
          ) : shopDomain && orders.length > 0 && (
            <QuickReorderPanel
              orders={orders.slice(0, 3).map(o => ({
                id: o.id,
                orderNumber: String(o.orderNumber || o.shopifyOrderNumber),
                lineItems: (o.lineItems || []).map((item: { variant_id?: string; variantId?: string; title?: string; name?: string; quantity: number; price: number }) => ({
                  id: item.variant_id || item.variantId || '',
                  productId: item.variant_id || item.variantId || '',
                  variantId: item.variant_id || item.variantId,
                  title: item.title || item.name || '',
                  quantity: item.quantity,
                  price: item.price,
                })),
                totalPrice: parseFloat(String(o.totalPrice)) || 0,
                createdAt: o.createdAt,
              }))}
              shopDomain={shopDomain}
              maxItems={3}
            />
          )}

          {/* Order Summary */}
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">
              <h6 style={{ margin: 0 }}>
                <i className="ti ti-chart-pie" style={{ marginRight: 8 }}></i>
                Order Summary
              </h6>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>This Month</span>
                <span style={{ fontWeight: 600 }}>
                  {orders.filter(o => {
                    const orderDate = new Date(o.createdAt);
                    const now = new Date();
                    return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
                  }).length} orders
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Last 30 Days</span>
                <span style={{ fontWeight: 600 }}>
                  {formatCurrency(
                    orders
                      .filter(o => new Date(o.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
                      .reduce((sum, o) => sum + (parseFloat(String(o.totalPrice)) || 0), 0)
                  )}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Lifetime Orders</span>
                <span style={{ fontWeight: 600 }}>{orders.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
