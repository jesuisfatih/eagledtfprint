'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Modal from '@/components/Modal';
import { accountsFetch } from '@/lib/api-client';
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils';

interface CartItem {
  id: string;
  productId: string;
  variantId: string;
  sku: string;
  title: string;
  quantity: number;
  unitPrice: number;
  listPrice: number;
  image?: string;
}

interface AbandonedCart {
  id: string;
  items: CartItem[];
  updatedAt: string;
  createdAt: string;
}

type TimeFilter = 'all' | 'week' | 'month' | 'older';

export default function AbandonedCartsPage() {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [selectedCarts, setSelectedCarts] = useState<Set<string>>(new Set());
  const [expandedCart, setExpandedCart] = useState<string | null>(null);
  const [resultModal, setResultModal] = useState<{show: boolean; message: string; type: 'success' | 'error'}>({show: false, message: '', type: 'success'});

  useEffect(() => {
    loadCarts();
  }, []);

  const loadCarts = async () => {
    try {
      setLoading(true);
      const response = await accountsFetch('/api/v1/abandoned-carts/my-carts');
      
      if (response.ok) {
        const data = await response.json();
        setCarts(Array.isArray(data) ? data : data.carts || []);
      } else {
        setCarts([]);
      }
    } catch (err) {
      console.error('Load abandoned carts error:', err);
      setCarts([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = (cart: AbandonedCart) => {
    return cart.items?.reduce((sum: number, item: CartItem) => 
      sum + (parseFloat(String(item.unitPrice || item.listPrice || 0)) * (item.quantity || 0)), 0) || 0;
  };

  const getTimeCategory = (dateStr: string): TimeFilter => {
    const date = new Date(dateStr);
    const now = new Date();
    const daysDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff <= 7) return 'week';
    if (daysDiff <= 30) return 'month';
    return 'older';
  };

  const filteredCarts = useMemo(() => {
    if (timeFilter === 'all') return carts;
    return carts.filter(cart => getTimeCategory(cart.updatedAt) === timeFilter);
  }, [carts, timeFilter]);

  // Stats
  const stats = useMemo(() => {
    const totalValue = carts.reduce((sum, cart) => sum + calculateTotal(cart), 0);
    const totalItems = carts.reduce((sum, cart) => sum + (cart.items?.length || 0), 0);
    const thisWeek = carts.filter(cart => getTimeCategory(cart.updatedAt) === 'week').length;
    const thisMonth = carts.filter(cart => getTimeCategory(cart.updatedAt) === 'month').length;
    
    return { totalCarts: carts.length, totalValue, totalItems, thisWeek, thisMonth };
  }, [carts]);

  const restoreCart = async (cart: AbandonedCart) => {
    try {
      setRestoring(cart.id);
      const merchantId = localStorage.getItem('eagle_merchantId') || '';
      const companyId = localStorage.getItem('eagle_companyId') || '';
      const userId = localStorage.getItem('eagle_userId') || '';
      
      // First get or create active cart
      let cartResponse = await accountsFetch('/api/v1/carts/active');
      let activeCart = null;
      
      if (cartResponse.ok && cartResponse.status !== 204) {
        activeCart = await cartResponse.json().catch(() => null);
      }
      
      if (!activeCart || !activeCart.id) {
        const createResponse = await accountsFetch('/api/v1/carts', {
          method: 'POST',
          body: JSON.stringify({ merchantId, companyId, createdByUserId: userId }),
        });
        if (createResponse.ok) {
          activeCart = await createResponse.json();
        }
      }
      
      if (!activeCart || !activeCart.id) {
        setResultModal({show: true, message: 'Failed to create cart', type: 'error'});
        setRestoring(null);
        return;
      }
      
      let successCount = 0;
      for (const item of cart.items) {
        try {
          const response = await accountsFetch(`/api/v1/carts/${activeCart.id}/items`, {
            method: 'POST',
            body: JSON.stringify({
              variantId: item.variantId || item.productId,
              shopifyVariantId: (item.variantId || item.productId || '').toString(),
              quantity: item.quantity,
            }),
          });
          
          if (response.ok) {
            successCount++;
          }
        } catch (err) {
          console.error('Failed to add item:', item.title);
        }
      }
      
      if (successCount === cart.items.length) {
        setResultModal({
          show: true, 
          message: `All ${successCount} items restored to your cart! Redirecting...`, 
          type: 'success'
        });
        
        try {
          await accountsFetch(`/api/v1/abandoned-carts/${cart.id}/restore`, {
            method: 'POST',
          });
        } catch (err) {
          // Ignore - just for tracking
        }
        
        setTimeout(() => {
          window.location.href = '/cart';
        }, 1500);
      } else if (successCount > 0) {
        setResultModal({
          show: true, 
          message: `${successCount} of ${cart.items.length} items restored. Some items may no longer be available.`, 
          type: 'success'
        });
      } else {
        setResultModal({
          show: true, 
          message: 'Failed to restore cart. Items may no longer be available.', 
          type: 'error'
        });
      }
    } catch (err) {
      console.error('Restore cart error:', err);
      setResultModal({
        show: true, 
        message: 'Failed to restore cart. Please try again.', 
        type: 'error'
      });
    } finally {
      setRestoring(null);
    }
  };

  const deleteCart = async (cartId: string) => {
    try {
      setDeleting(cartId);
      const response = await accountsFetch(`/api/v1/abandoned-carts/${cartId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setCarts(prev => prev.filter(c => c.id !== cartId));
        setSelectedCarts(prev => {
          const next = new Set(prev);
          next.delete(cartId);
          return next;
        });
        setResultModal({show: true, message: 'Cart removed successfully.', type: 'success'});
      } else {
        setResultModal({show: true, message: 'Failed to remove cart.', type: 'error'});
      }
    } catch (err) {
      setResultModal({show: true, message: 'Failed to remove cart.', type: 'error'});
    } finally {
      setDeleting(null);
    }
  };

  const toggleCartSelection = (cartId: string) => {
    setSelectedCarts(prev => {
      const next = new Set(prev);
      if (next.has(cartId)) {
        next.delete(cartId);
      } else {
        next.add(cartId);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedCarts.size === filteredCarts.length) {
      setSelectedCarts(new Set());
    } else {
      setSelectedCarts(new Set(filteredCarts.map(c => c.id)));
    }
  };

  const deleteSelected = async () => {
    for (const cartId of selectedCarts) {
      await deleteCart(cartId);
    }
    setSelectedCarts(new Set());
  };

  const getAgeLabel = (dateStr: string) => {
    const days = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
    return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '0.75rem' }}>
        <div>
          <h4 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>
            <i className="ti ti-shopping-cart-x" style={{ color: 'var(--accent)', marginRight: '0.5rem' }}></i>
            Abandoned Carts
          </h4>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Recover your incomplete shopping sessions</p>
        </div>
        <button onClick={loadCarts} className="btn-apple btn-apple-secondary" disabled={loading}>
          {loading ? (
            <span className="spinner-apple spinner-apple-sm" style={{ marginRight: '0.25rem' }}></span>
          ) : (
            <i className="ti ti-refresh" style={{ marginRight: '0.25rem' }}></i>
          )}
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div>
          <div className="card" style={{ height: '100%' }}>
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="avatar bg-label-warning rounded">
                  <i className="ti ti-shopping-cart ti-md"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 700 }}>{stats.totalCarts}</h3>
                  <small style={{ color: 'var(--text-secondary)' }}>Total Carts</small>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div className="card" style={{ height: '100%' }}>
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="avatar bg-label-success rounded">
                  <i className="ti ti-currency-dollar ti-md"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 700 }}>{formatCurrency(stats.totalValue)}</h3>
                  <small style={{ color: 'var(--text-secondary)' }}>Total Value</small>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div className="card" style={{ height: '100%' }}>
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="avatar bg-label-info rounded">
                  <i className="ti ti-package ti-md"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 700 }}>{stats.totalItems}</h3>
                  <small style={{ color: 'var(--text-secondary)' }}>Total Items</small>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div className="card" style={{ height: '100%' }}>
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="avatar bg-label-primary rounded">
                  <i className="ti ti-clock ti-md"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 700 }}>{stats.thisWeek}</h3>
                  <small style={{ color: 'var(--text-secondary)' }}>This Week</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-body" style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
            {/* Time Filters */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[
                { key: 'all' as TimeFilter, label: 'All', count: carts.length },
                { key: 'week' as TimeFilter, label: 'This Week', count: stats.thisWeek },
                { key: 'month' as TimeFilter, label: 'This Month', count: stats.thisMonth },
                { key: 'older' as TimeFilter, label: 'Older', count: carts.length - stats.thisWeek - stats.thisMonth },
              ].map(filter => (
                <button
                  key={filter.key}
                  onClick={() => setTimeFilter(filter.key)}
                  className={timeFilter === filter.key ? 'btn-apple btn-apple-primary' : 'btn-apple btn-apple-secondary'}
                  style={{ fontSize: '0.8125rem' }}
                >
                  {filter.label}
                  <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--accent)', marginLeft: '0.25rem' }}>{filter.count}</span>
                </button>
              ))}
            </div>

            {/* Bulk Actions */}
            {selectedCarts.size > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', alignSelf: 'center' }}>
                  {selectedCarts.size} selected
                </span>
                <button
                  onClick={deleteSelected}
                  className="btn-apple btn-apple-secondary"
                  style={{ fontSize: '0.8125rem', color: 'var(--red)' }}
                >
                  <i className="ti ti-trash" style={{ marginRight: '0.25rem' }}></i>
                  Delete Selected
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Carts List */}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
              <div className="spinner-apple" style={{ color: 'var(--accent)' }}></div>
              <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)' }}>Loading abandoned carts...</p>
            </div>
          ) : filteredCarts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
              <div className="avatar avatar-xl bg-label-success rounded-circle" style={{ margin: '0 auto 0.75rem' }}>
                <i className="ti ti-shopping-cart-check ti-xl"></i>
              </div>
              <h5>No abandoned carts</h5>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                {timeFilter !== 'all' 
                  ? 'No abandoned carts in this time period.' 
                  : 'Great! You don\'t have any incomplete shopping sessions.'}
              </p>
              <Link href="/products" className="btn-apple btn-apple-primary">
                <i className="ti ti-shopping-bag" style={{ marginRight: '0.25rem' }}></i>
                Browse Products
              </Link>
            </div>
          ) : (
            <>
              {/* Select All */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    className="form-input"
                    checked={selectedCarts.size === filteredCarts.length && filteredCarts.length > 0}
                    onChange={selectAll}
                  />
                  <label style={{ color: 'var(--text-secondary)' }}>
                    Select all ({filteredCarts.length})
                  </label>
                </div>
              </div>

              {/* Cart Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {filteredCarts.map((cart) => (
                  <div 
                    key={cart.id} 
                    className="card"
                    style={{ border: selectedCarts.has(cart.id) ? '1px solid var(--accent)' : '1px solid var(--border)' }}
                  >
                    <div className="card-body">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {/* Checkbox */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <input
                              type="checkbox"
                              className="form-input"
                              checked={selectedCarts.has(cart.id)}
                              onChange={() => toggleCartSelection(cart.id)}
                            />
                          </div>
                        </div>

                        {/* Cart Info */}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                            <div>
                              <h6 style={{ marginBottom: '0.25rem' }}>
                                <i className="ti ti-shopping-cart" style={{ color: 'var(--text-secondary)', marginRight: '0.25rem' }}></i>
                                {cart.items?.length || 0} item{(cart.items?.length || 0) !== 1 ? 's' : ''}
                              </h6>
                              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
                                {cart.items?.slice(0, 3).map((item: CartItem) => item.title || item.sku).join(', ')}
                                {(cart.items?.length || 0) > 3 && ` +${cart.items.length - 3} more`}
                              </p>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                                  <i className="ti ti-clock" style={{ marginRight: '0.25rem' }}></i>
                                  {getAgeLabel(cart.updatedAt)}
                                </span>
                                <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--accent)' }}>
                                  {formatDate(cart.updatedAt)}
                                </span>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <h5 style={{ color: 'var(--accent)', marginBottom: '0.25rem' }}>
                                {formatCurrency(calculateTotal(cart))}
                              </h5>
                              <small style={{ color: 'var(--text-secondary)' }}>Total Value</small>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => setExpandedCart(expandedCart === cart.id ? null : cart.id)}
                              className="btn-apple btn-apple-secondary"
                              style={{ fontSize: '0.8125rem' }}
                              title="View items"
                            >
                              <i className={`ti ti-chevron-${expandedCart === cart.id ? 'up' : 'down'}`}></i>
                            </button>
                            <button
                              onClick={() => restoreCart(cart)}
                              className="btn-apple btn-apple-primary"
                              style={{ fontSize: '0.8125rem' }}
                              disabled={restoring === cart.id}
                            >
                              {restoring === cart.id ? (
                                <>
                                  <span className="spinner-apple spinner-apple-sm" style={{ marginRight: '0.25rem' }}></span>
                                  Restoring...
                                </>
                              ) : (
                                <>
                                  <i className="ti ti-shopping-cart-plus" style={{ marginRight: '0.25rem' }}></i>
                                  Restore
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => deleteCart(cart.id)}
                              className="btn-apple btn-apple-secondary"
                              style={{ fontSize: '0.8125rem', color: 'var(--red)' }}
                              disabled={deleting === cart.id}
                              title="Remove cart"
                            >
                              {deleting === cart.id ? (
                                <span className="spinner-apple spinner-apple-sm"></span>
                              ) : (
                                <i className="ti ti-trash"></i>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Items */}
                      {expandedCart === cart.id && (
                        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                          <h6 style={{ marginBottom: '0.75rem' }}>Cart Items</h6>
                          <div className="table-container">
                            <table className="apple-table">
                              <thead>
                                <tr>
                                  <th>Product</th>
                                  <th style={{ textAlign: 'center' }}>Qty</th>
                                  <th style={{ textAlign: 'right' }}>Unit Price</th>
                                  <th style={{ textAlign: 'right' }}>Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {cart.items.map((item, i) => (
                                  <tr key={i}>
                                    <td>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {item.image && (
                                          <img 
                                            src={item.image} 
                                            alt={item.title}
                                            className="rounded"
                                            style={{ width: 40, height: 40, objectFit: 'cover' }}
                                          />
                                        )}
                                        <div>
                                          <p style={{ margin: 0, fontWeight: 500 }}>{item.title}</p>
                                          {item.sku && (
                                            <small style={{ color: 'var(--text-secondary)' }}>SKU: {item.sku}</small>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{item.quantity}</td>
                                    <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                                      {formatCurrency(item.unitPrice || item.listPrice)}
                                    </td>
                                    <td style={{ textAlign: 'right', verticalAlign: 'middle', fontWeight: 600 }}>
                                      {formatCurrency((item.unitPrice || item.listPrice) * item.quantity)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot style={{ borderTop: '1px solid var(--border)' }}>
                                <tr>
                                  <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700 }}>Cart Total:</td>
                                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>
                                    {formatCurrency(calculateTotal(cart))}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recovery Tips */}
      {carts.length > 0 && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-body">
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div className="avatar bg-label-info rounded" style={{ flexShrink: 0 }}>
                <i className="ti ti-bulb ti-md"></i>
              </div>
              <div>
                <h6 style={{ marginBottom: '0.25rem' }}>Cart Recovery Tips</h6>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: 0 }}>
                  Restore your abandoned carts to complete your purchase. Items are saved for 30 days.
                  Click "Restore" to add all items back to your current cart.
                  {stats.totalValue > 0 && (
                    <> You have <strong>{formatCurrency(stats.totalValue)}</strong> worth of items waiting for you!</>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {resultModal.show && (
        <Modal
          show={resultModal.show}
          onClose={() => setResultModal({show: false, message: '', type: 'success'})}
          onConfirm={() => setResultModal({show: false, message: '', type: 'success'})}
          title={resultModal.type === 'success' ? 'Success' : 'Error'}
          message={resultModal.message}
          confirmText="OK"
          type={resultModal.type === 'success' ? 'success' : 'danger'}
        />
      )}
    </div>
  );
}

