'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';

interface OrderItem {
  id: string;
  productId: string;
  variantId?: string;
  title: string;
  variantTitle?: string;
  quantity: number;
  price: number;
  image?: string;
  sku?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  lineItems: OrderItem[];
  totalPrice: number;
  createdAt: string;
}

// Reorder Button Component
interface ReorderButtonProps {
  order: Order;
  shopDomain: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function ReorderButton({ 
  order, 
  shopDomain,
  variant = 'primary',
  size = 'md',
  showIcon = true,
  className = ''
}: ReorderButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleReorder = async () => {
    try {
      setIsProcessing(true);

      if (!shopDomain) {
        alert('Shop domain not found');
        return;
      }

      // Build cart URL with all items
      const variantIds = order.lineItems
        .filter(item => item.variantId)
        .map(item => `${item.variantId}:${item.quantity}`)
        .join(',');

      if (variantIds) {
        window.location.href = `https://${shopDomain}/cart/${variantIds}`;
      } else {
        alert('No items available for reorder');
      }
    } catch (err) {
      console.error('Reorder error:', err);
      alert('Failed to process reorder');
    } finally {
      setIsProcessing(false);
    }
  };

  const btnClass = variant === 'outline' || variant === 'text'
    ? 'btn-apple btn-apple-secondary'
    : variant === 'secondary'
      ? 'btn-apple btn-apple-secondary'
      : 'btn-apple btn-apple-primary';

  const sizeStyle = size === 'sm' ? { fontSize: '0.875rem', padding: '6px 12px' } : size === 'lg' ? { fontSize: '1.125rem', padding: '12px 24px' } : {};

  return (
    <button
      type="button"
      className={`${btnClass} ${className}`}
      style={sizeStyle}
      onClick={handleReorder}
      disabled={isProcessing || order.lineItems.length === 0}
    >
      {isProcessing ? (
        <span className="spinner-apple" style={{ width: 16, height: 16, marginRight: 8 }}></span>
      ) : showIcon ? (
        <i className="ti ti-refresh" style={{ marginRight: 4 }}></i>
      ) : null}
      Reorder
    </button>
  );
}

// Quick Reorder Panel - Shows recent orders for quick reordering
interface QuickReorderPanelProps {
  orders: Order[];
  shopDomain: string;
  maxItems?: number;
}

export function QuickReorderPanel({ orders, shopDomain, maxItems = 3 }: QuickReorderPanelProps) {
  const recentOrders = orders.slice(0, maxItems);

  if (recentOrders.length === 0) {
    return (
      <div className="card">
        <div className="card-body" style={{ textAlign: 'center', padding: '24px 16px' }}>
          <i className="ti ti-history ti-2x" style={{ color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}></i>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 0 }}>No recent orders to reorder</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h6 style={{ marginBottom: 0 }}>
          <i className="ti ti-refresh" style={{ marginRight: 8 }}></i>
          Quick Reorder
        </h6>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        {recentOrders.map((order, index) => (
          <div 
            key={order.id} 
            style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: index > 0 ? '1px solid var(--border)' : 'none' }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>Order #{order.orderNumber}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {order.lineItems.length} item{order.lineItems.length !== 1 ? 's' : ''} • {formatCurrency(order.totalPrice)}
              </div>
            </div>
            <ReorderButton 
              order={order} 
              shopDomain={shopDomain} 
              variant="outline" 
              size="sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Reorder Modal - Shows items before reordering
interface ReorderModalProps {
  order: Order;
  shopDomain: string;
  show: boolean;
  onClose: () => void;
}

export function ReorderModal({ order, shopDomain, show, onClose }: ReorderModalProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(
    new Set(order.lineItems.map(item => item.id))
  );
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(order.lineItems.map(item => [item.id, item.quantity]))
  );
  const [isProcessing, setIsProcessing] = useState(false);

  if (!show) return null;

  const toggleItem = (itemId: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    setQuantities(prev => ({ ...prev, [itemId]: Math.max(1, quantity) }));
  };

  const handleReorder = async () => {
    try {
      setIsProcessing(true);

      const selectedLineItems = order.lineItems.filter(item => selectedItems.has(item.id));
      
      const variantIds = selectedLineItems
        .filter(item => item.variantId)
        .map(item => `${item.variantId}:${quantities[item.id]}`)
        .join(',');

      if (variantIds) {
        window.location.href = `https://${shopDomain}/cart/${variantIds}`;
      } else {
        alert('No items selected for reorder');
      }
    } catch (err) {
      console.error('Reorder error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedTotal = order.lineItems
    .filter(item => selectedItems.has(item.id))
    .reduce((sum, item) => sum + item.price * quantities[item.id], 0);

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050 }}>
      <div style={{ width: '100%', maxWidth: 800, margin: '0 auto', padding: '0 16px' }}>
        <div className="card" style={{ borderRadius: 12, overflow: 'hidden' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h5 style={{ marginBottom: 0 }}>
              <i className="ti ti-refresh" style={{ marginRight: 8 }}></i>
              Reorder from #{order.orderNumber}
            </h5>
            <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
          </div>
          <div className="card-body">
            <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
              Select items and adjust quantities for your reorder
            </p>

            <div style={{ border: '1px solid var(--border)', borderRadius: 8 }}>
              {order.lineItems.map((item, index) => (
                <div 
                  key={item.id} 
                  style={{ padding: 12, display: 'flex', alignItems: 'center', borderTop: index > 0 ? '1px solid var(--border)' : 'none' }}
                >
                  <div style={{ marginRight: 12 }}>
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => toggleItem(item.id)}
                      id={`item-${item.id}`}
                      style={{ width: 18, height: 18, accentColor: 'var(--accent)' }}
                    />
                  </div>
                  {item.image && (
                    <img 
                      src={item.image} 
                      alt={item.title}
                      style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 8, marginRight: 12 }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <label htmlFor={`item-${item.id}`} style={{ fontWeight: 600, marginBottom: 0, cursor: 'pointer' }}>
                      {item.title}
                    </label>
                    {item.variantTitle && (
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{item.variantTitle}</div>
                    )}
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{formatCurrency(item.price)} each</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      className="btn-apple btn-apple-secondary"
                      style={{ fontSize: '0.875rem', padding: '4px 10px' }}
                      onClick={() => updateQuantity(item.id, quantities[item.id] - 1)}
                      disabled={!selectedItems.has(item.id)}
                    >
                      <i className="ti ti-minus"></i>
                    </button>
                    <span style={{ fontWeight: 600, minWidth: 30, textAlign: 'center' }}>
                      {quantities[item.id]}
                    </span>
                    <button
                      type="button"
                      className="btn-apple btn-apple-secondary"
                      style={{ fontSize: '0.875rem', padding: '4px 10px' }}
                      onClick={() => updateQuantity(item.id, quantities[item.id] + 1)}
                      disabled={!selectedItems.has(item.id)}
                    >
                      <i className="ti ti-plus"></i>
                    </button>
                  </div>
                  <div style={{ marginLeft: 12, textAlign: 'right', minWidth: 80 }}>
                    <strong>
                      {formatCurrency(item.price * quantities[item.id])}
                    </strong>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Selected: </span>
                <strong>{selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''}</strong>
              </div>
              <div style={{ fontSize: '1.125rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total: </span>
                <strong>{formatCurrency(selectedTotal)}</strong>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
            <button type="button" className="btn-apple btn-apple-secondary" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="button" 
              className="btn-apple btn-apple-primary"
              onClick={handleReorder}
              disabled={selectedItems.size === 0 || isProcessing}
            >
              {isProcessing ? (
                <>
                  <span className="spinner-apple" style={{ width: 16, height: 16, marginRight: 8 }}></span>
                  Processing...
                </>
              ) : (
                <>
                  <i className="ti ti-shopping-cart" style={{ marginRight: 4 }}></i>
                  Add to Cart
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Single item reorder button
interface ReorderItemButtonProps {
  item: OrderItem;
  shopDomain: string;
  className?: string;
}

export function ReorderItemButton({ item, shopDomain, className = '' }: ReorderItemButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleReorder = async () => {
    try {
      setIsProcessing(true);
      
      if (!item.variantId) {
        alert('Cannot reorder this item');
        return;
      }

      window.location.href = `https://${shopDomain}/cart/${item.variantId}:${item.quantity}`;
    } catch (err) {
      console.error('Reorder error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <button
      type="button"
      className={`btn-apple btn-apple-secondary ${className}`}
      style={{ fontSize: '0.875rem', padding: '6px 12px' }}
      onClick={handleReorder}
      disabled={isProcessing || !item.variantId}
      title="Reorder this item"
    >
      {isProcessing ? (
        <span className="spinner-apple" style={{ width: 14, height: 14 }}></span>
      ) : (
        <i className="ti ti-refresh"></i>
      )}
    </button>
  );
}

// Frequently ordered products section
interface FrequentlyOrderedProps {
  items: Array<{
    productId: string;
    variantId?: string;
    title: string;
    variantTitle?: string;
    price: number;
    image?: string;
    orderCount: number;
    lastOrderedAt: string;
  }>;
  shopDomain: string;
  maxItems?: number;
}

export function FrequentlyOrdered({ items, shopDomain, maxItems = 4 }: FrequentlyOrderedProps) {
  const topItems = items.slice(0, maxItems);

  if (topItems.length === 0) {
    return null;
  }

  const addToCart = (variantId: string) => {
    window.location.href = `https://${shopDomain}/cart/${variantId}:1`;
  };

  return (
    <div className="card">
      <div className="card-header">
        <h6 style={{ marginBottom: 0 }}>
          <i className="ti ti-star" style={{ marginRight: 8 }}></i>
          Frequently Ordered
        </h6>
      </div>
      <div className="card-body">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {topItems.map((item) => (
            <div key={item.productId}>
              <div style={{ display: 'flex', alignItems: 'center', padding: 8, border: '1px solid var(--border)', borderRadius: 8 }}>
                {item.image && (
                  <img 
                    src={item.image} 
                    alt={item.title}
                    style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, marginRight: 12 }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Ordered {item.orderCount}x • {formatCurrency(item.price)}
                  </div>
                </div>
                {item.variantId && (
                  <button
                    type="button"
                    className="btn-apple btn-apple-primary"
                    style={{ fontSize: '0.875rem', padding: '6px 12px', marginLeft: 8 }}
                    onClick={() => addToCart(item.variantId!)}
                  >
                    <i className="ti ti-plus"></i>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
