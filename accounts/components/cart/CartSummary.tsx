'use client';

import React from 'react';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { LoadingButton } from '@/components/ui';
import type { Promotion } from '@/types';

// ============================================
// CART SUMMARY - Enhanced with savings display
// ============================================

interface CartItem {
  id: string;
  title: string;
  quantity: number;
  unitPrice: number;
  listPrice?: number;
}

interface CartSummaryProps {
  items: CartItem[];
  subtotal: number;
  listTotal?: number;
  discount?: number;
  shipping?: number;
  tax?: number;
  total: number;
  savings?: number;
  currency?: string;
  appliedPromotions?: Promotion[];
  onCheckout?: () => void;
  onSaveQuote?: () => void;
  checkoutLoading?: boolean;
  quoteLoading?: boolean;
  needsApproval?: boolean;
  approvalLimit?: number;
  disabled?: boolean;
}

export function CartSummary({
  items,
  subtotal,
  listTotal,
  discount = 0,
  shipping = 0,
  tax = 0,
  total,
  savings = 0,
  currency = 'USD',
  appliedPromotions = [],
  onCheckout,
  onSaveQuote,
  checkoutLoading = false,
  quoteLoading = false,
  needsApproval = false,
  approvalLimit,
  disabled = false,
}: CartSummaryProps) {
  const hasItems = items.length > 0;
  const hasSavings = savings > 0 || discount > 0;
  const totalSavings = savings + discount;
  const savingsPercent = listTotal && listTotal > 0 
    ? ((listTotal - subtotal + discount) / listTotal) * 100 
    : 0;

  return (
    <div className="card">
      <div className="card-header">
        <h5 style={{ margin: 0, fontWeight: 600 }}>Order Summary</h5>
      </div>
      <div className="card-body">
        {/* Item Count */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: 'var(--text-secondary)' }}>Items ({items.length})</span>
          <span>{items.reduce((sum, i) => sum + i.quantity, 0)} units</span>
        </div>

        {/* List Price (if different from subtotal) */}
        {listTotal && listTotal > subtotal && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: 'var(--text-secondary)' }}>List Price</span>
            <span style={{ textDecoration: 'line-through', color: 'var(--text-secondary)' }}>
              {formatCurrency(listTotal, currency)}
            </span>
          </div>
        )}

        {/* Subtotal (Your Price) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
          <span>{formatCurrency(subtotal, currency)}</span>
        </div>

        {/* B2B Discount */}
        {hasSavings && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: 'var(--green)' }}>
            <span>
              <i className="ti ti-tag" style={{ marginRight: 4 }}></i>
              B2B Savings
            </span>
            <span>-{formatCurrency(totalSavings, currency)}</span>
          </div>
        )}

        {/* Applied Promotions */}
        {appliedPromotions.map((promo) => (
          <div key={promo.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: 'var(--green)' }}>
            <span>
              <i className="ti ti-ticket" style={{ marginRight: 4 }}></i>
              {promo.title}
            </span>
            <span>
              -{promo.discountType === 'percentage' 
                ? formatPercent(promo.discountValue) 
                : formatCurrency(promo.discountValue, currency)}
            </span>
          </div>
        ))}

        {/* Discount line (if separate) */}
        {discount > 0 && !hasSavings && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: 'var(--green)' }}>
            <span>Discount</span>
            <span>-{formatCurrency(discount, currency)}</span>
          </div>
        )}

        {/* Shipping */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: 'var(--text-secondary)' }}>Shipping</span>
          <span>
            {shipping > 0 ? formatCurrency(shipping, currency) : 'Calculated at checkout'}
          </span>
        </div>

        {/* Tax */}
        {tax > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Tax</span>
            <span>{formatCurrency(tax, currency)}</span>
          </div>
        )}

        <hr />

        {/* Total */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <strong style={{ fontSize: '1.15rem' }}>Total</strong>
          <strong style={{ fontSize: '1.15rem' }}>{formatCurrency(total, currency)}</strong>
        </div>

        {/* Savings Highlight */}
        {hasSavings && (
          <div className="alert-apple alert-apple-success" style={{ padding: '8px 12px', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <i className="ti ti-discount ti-lg" style={{ marginRight: 8 }}></i>
              <div>
                <strong>You&apos;re saving {formatCurrency(totalSavings, currency)}</strong>
                {savingsPercent > 0 && (
                  <span style={{ marginLeft: 4 }}>({formatPercent(savingsPercent)})</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Approval Warning */}
        {needsApproval && approvalLimit && (
          <div className="alert-apple alert-apple-warning" style={{ padding: '8px 12px', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <i className="ti ti-alert-circle" style={{ marginRight: 8 }}></i>
              <small>
                Orders over {formatCurrency(approvalLimit, currency)} require manager approval.
              </small>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'grid', gap: 8 }}>
          {onCheckout && (
            <LoadingButton
              variant="primary"
              size="lg"
              loading={checkoutLoading}
              disabled={disabled || !hasItems}
              onClick={onCheckout}
              style={{ width: '100%', height: 48 }}
              className="btn-apple btn-apple-primary"
            >
              {needsApproval ? (
                <>
                  <i className="ti ti-send" style={{ marginRight: 8 }}></i>
                  Submit for Approval
                </>
              ) : (
                <>
                  <i className="ti ti-shopping-cart" style={{ marginRight: 8 }}></i>
                  Proceed to Checkout
                </>
              )}
            </LoadingButton>
          )}

          {onSaveQuote && (
            <LoadingButton
              variant="outline-primary"
              loading={quoteLoading}
              disabled={disabled || !hasItems}
              onClick={onSaveQuote}
              className="btn-apple btn-apple-secondary"
            >
              <i className="ti ti-file-text" style={{ marginRight: 8 }}></i>
              Save as Quote
            </LoadingButton>
          )}
        </div>

        {/* Trust Badges */}
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <div>
              <i className="ti ti-shield-check" style={{ display: 'block', marginBottom: 4 }}></i>
              Secure Checkout
            </div>
            <div>
              <i className="ti ti-truck" style={{ display: 'block', marginBottom: 4 }}></i>
              Fast Shipping
            </div>
            <div>
              <i className="ti ti-headset" style={{ display: 'block', marginBottom: 4 }}></i>
              24/7 Support
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MINI CART SUMMARY (For sidebar/header)
// ============================================

interface MiniCartSummaryProps {
  itemCount: number;
  total: number;
  savings?: number;
  currency?: string;
  onViewCart?: () => void;
  onCheckout?: () => void;
}

export function MiniCartSummary({
  itemCount,
  total,
  savings = 0,
  currency = 'USD',
  onViewCart,
  onCheckout,
}: MiniCartSummaryProps) {
  return (
    <div className="card">
      <div className="card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span>{itemCount} items</span>
          <strong>{formatCurrency(total, currency)}</strong>
        </div>
        {savings > 0 && (
          <div style={{ fontSize: '0.85rem', color: 'var(--green)', marginBottom: 8 }}>
            <i className="ti ti-discount" style={{ marginRight: 4 }}></i>
            Saving {formatCurrency(savings, currency)}
          </div>
        )}
        <div style={{ display: 'grid', gap: 8 }}>
          {onViewCart && (
            <button className="btn-apple btn-apple-secondary" style={{ fontSize: '0.85rem' }} onClick={onViewCart}>
              View Cart
            </button>
          )}
          {onCheckout && (
            <button className="btn-apple btn-apple-primary" style={{ fontSize: '0.85rem' }} onClick={onCheckout}>
              Checkout
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// CART ITEM ROW (For cart page)
// ============================================

interface CartItemRowProps {
  item: {
    id: string;
    title: string;
    variantTitle?: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    listPrice?: number;
    imageUrl?: string;
  };
  quantityBreaks?: { qty: number; price: number }[];
  onUpdateQuantity?: (quantity: number) => void;
  onRemove?: () => void;
  loading?: boolean;
  currency?: string;
}

export function CartItemRow({
  item,
  quantityBreaks = [],
  onUpdateQuantity,
  onRemove,
  loading = false,
  currency = 'USD',
}: CartItemRowProps) {
  const hasDiscount = item.listPrice && item.listPrice > item.unitPrice;
  const itemTotal = item.quantity * item.unitPrice;
  const listTotal = item.listPrice ? item.quantity * item.listPrice : itemTotal;
  const itemSavings = listTotal - itemTotal;

  return (
    <div className="card" style={{ marginBottom: 12, opacity: loading ? 0.5 : 1 }}>
      <div className="card-body">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Image */}
          <div>
            <img
              src={item.imageUrl || '/placeholder.png'}
              alt={item.title}
              style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10 }}
            />
          </div>

          {/* Details */}
          <div style={{ flex: 1 }}>
            <h6 style={{ margin: '0 0 4px' }}>{item.title}</h6>
            {item.variantTitle && (
              <small style={{ color: 'var(--text-secondary)', display: 'block' }}>{item.variantTitle}</small>
            )}
            {item.sku && (
              <small style={{ color: 'var(--text-secondary)', display: 'block' }}>SKU: {item.sku}</small>
            )}
            
            {/* Price Display */}
            <div style={{ marginTop: 8 }}>
              <span style={{ fontWeight: 700, color: 'var(--green)' }}>
                {formatCurrency(item.unitPrice, currency)}
              </span>
              {hasDiscount && (
                <span style={{ color: 'var(--text-secondary)', textDecoration: 'line-through', marginLeft: 8, fontSize: '0.85rem' }}>
                  {formatCurrency(item.listPrice!, currency)}
                </span>
              )}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', width: 120 }}>
              <button
                className="btn-apple btn-apple-secondary"
                style={{ borderRadius: 0, minWidth: 36, height: 36, padding: 0, border: 'none' }}
                type="button"
                onClick={() => onUpdateQuantity?.(item.quantity - 1)}
                disabled={loading || item.quantity <= 1}
              >
                -
              </button>
              <input
                type="text"
                style={{ width: 48, textAlign: 'center', border: 'none', outline: 'none', background: 'transparent', fontSize: '0.9rem' }}
                value={item.quantity}
                readOnly
              />
              <button
                className="btn-apple btn-apple-secondary"
                style={{ borderRadius: 0, minWidth: 36, height: 36, padding: 0, border: 'none' }}
                type="button"
                onClick={() => onUpdateQuantity?.(item.quantity + 1)}
                disabled={loading}
              >
                +
              </button>
            </div>

            {/* Quantity Break Hint */}
            {quantityBreaks.length > 0 && (
              <QuantityBreakMiniHint
                currentQty={item.quantity}
                breaks={quantityBreaks}
                currentPrice={item.unitPrice}
              />
            )}
          </div>

          {/* Total */}
          <div style={{ textAlign: 'right', minWidth: 80 }}>
            <div style={{ fontWeight: 700 }}>{formatCurrency(itemTotal, currency)}</div>
            {itemSavings > 0 && (
              <small style={{ color: 'var(--green)' }}>
                Save {formatCurrency(itemSavings, currency)}
              </small>
            )}
            {onRemove && (
              <button
                className="btn-apple"
                style={{ color: 'var(--red)', padding: 0, display: 'block', marginTop: 4, background: 'none', border: 'none', cursor: 'pointer' }}
                onClick={onRemove}
                disabled={loading}
              >
                <i className="ti ti-trash"></i> Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// QUANTITY BREAK MINI HINT
// ============================================

interface QuantityBreakMiniHintProps {
  currentQty: number;
  breaks: { qty: number; price: number }[];
  currentPrice: number;
}

function QuantityBreakMiniHint({ currentQty, breaks, currentPrice }: QuantityBreakMiniHintProps) {
  const sortedBreaks = [...breaks].sort((a, b) => a.qty - b.qty);
  const nextBreak = sortedBreaks.find(b => b.qty > currentQty);

  if (!nextBreak) return null;

  const additionalNeeded = nextBreak.qty - currentQty;

  return (
    <small style={{ color: 'var(--orange)', display: 'block', textAlign: 'center', marginTop: 4 }}>
      +{additionalNeeded} for better price
    </small>
  );
}

// ============================================
// EXPORTS
// ============================================

export default CartSummary;
