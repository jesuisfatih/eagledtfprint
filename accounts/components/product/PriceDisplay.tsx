'use client';

import React from 'react';
import { formatCurrency, formatPercent, calculateDiscount } from '@/lib/utils';
import type { QuantityBreak } from '@/types';

// ============================================
// PRICE DISPLAY - Main Component
// ============================================

interface PriceDisplayProps {
  listPrice: number;
  companyPrice: number;
  quantityBreaks?: QuantityBreak[];
  currentQuantity?: number;
  currency?: string;
  showBreaks?: boolean;
  size?: 'sm' | 'md' | 'lg';
  layout?: 'vertical' | 'horizontal' | 'compact';
}

export function PriceDisplay({
  listPrice,
  companyPrice,
  quantityBreaks = [],
  currentQuantity = 1,
  currency = 'USD',
  showBreaks = true,
  size = 'md',
  layout = 'vertical',
}: PriceDisplayProps) {
  const hasDiscount = companyPrice < listPrice;
  const discountPercentage = hasDiscount ? calculateDiscount(listPrice, companyPrice) : 0;

  // Find applicable price based on quantity
  const applicableBreak = findApplicableBreak(currentQuantity, quantityBreaks);
  const finalPrice = applicableBreak ? applicableBreak.price : companyPrice;
  const finalDiscount = calculateDiscount(listPrice, finalPrice);

  const sizeClasses = {
    sm: { main: 'fs-6', strike: 'small', badge: 'badge-sm' },
    md: { main: 'fs-5', strike: 'fs-6', badge: '' },
    lg: { main: 'fs-3', strike: 'fs-5', badge: 'badge-lg' },
  };

  const sizes = sizeClasses[size];

  if (layout === 'compact') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span className={sizes.main} style={{ fontWeight: 700, color: 'var(--green)' }}>
          {formatCurrency(finalPrice, currency)}
        </span>
        {hasDiscount && (
          <span className={sizes.strike} style={{ color: 'var(--text-secondary)', textDecoration: 'line-through' }}>
            {formatCurrency(listPrice, currency)}
          </span>
        )}
        {finalDiscount > 0 && (
          <span className={`badge ${sizes.badge}`} style={{ background: 'var(--green)', color: '#fff' }}>
            -{formatPercent(finalDiscount)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={layout === 'horizontal' ? { display: 'flex', alignItems: 'center', gap: '0.75rem' } : undefined}>
      {/* List Price (Strikethrough) */}
      {hasDiscount && (
        <div style={layout === 'horizontal' ? undefined : { marginBottom: '0.25rem' }}>
          <span className={sizes.strike} style={{ color: 'var(--text-secondary)', textDecoration: 'line-through' }}>
            List: {formatCurrency(listPrice, currency)}
          </span>
        </div>
      )}

      {/* Company Price */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span className={sizes.main} style={{ fontWeight: 700, color: 'var(--green)' }}>
          {formatCurrency(finalPrice, currency)}
        </span>
        {finalDiscount > 0 && (
          <span className={`badge ${sizes.badge}`} style={{ background: 'var(--green)', color: '#fff' }}>
            -{formatPercent(finalDiscount)}
          </span>
        )}
      </div>

      {/* Discount Label */}
      {hasDiscount && !applicableBreak && (
        <small style={{ color: 'var(--green)' }}>
          <i className="ti ti-tag" style={{ marginRight: '0.25rem' }}></i>
          Your B2B Price
        </small>
      )}

      {/* Volume Discount Applied */}
      {applicableBreak && (
        <small style={{ color: 'var(--green)' }}>
          <i className="ti ti-package" style={{ marginRight: '0.25rem' }}></i>
          Volume Discount ({currentQuantity}+ items)
        </small>
      )}

      {/* Quantity Breaks */}
      {showBreaks && quantityBreaks.length > 0 && (
        <QuantityBreaksDisplay
          breaks={quantityBreaks}
          currentQuantity={currentQuantity}
          listPrice={listPrice}
          currency={currency}
          size={size}
        />
      )}
    </div>
  );
}

// ============================================
// QUANTITY BREAKS DISPLAY
// ============================================

interface QuantityBreaksDisplayProps {
  breaks: QuantityBreak[];
  currentQuantity: number;
  listPrice: number;
  currency?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function QuantityBreaksDisplay({
  breaks,
  currentQuantity,
  listPrice,
  currency = 'USD',
  size = 'md',
}: QuantityBreaksDisplayProps) {
  if (!breaks || breaks.length === 0) return null;

  const sortedBreaks = [...breaks].sort((a, b) => a.qty - b.qty);

  return (
    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
      <small style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
        <i className="ti ti-trending-down" style={{ marginRight: '0.25rem' }}></i>
        Volume Pricing:
      </small>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {sortedBreaks.map((breakItem, index) => {
          const isActive = currentQuantity >= breakItem.qty;
          const isNext = !isActive && 
            (index === 0 || currentQuantity >= sortedBreaks[index - 1].qty);
          const discount = calculateDiscount(listPrice, breakItem.price);

          return (
            <QuantityBreakBadge
              key={breakItem.qty}
              qty={breakItem.qty}
              price={breakItem.price}
              discount={discount}
              isActive={isActive}
              isNext={isNext}
              currency={currency}
              size={size}
            />
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// QUANTITY BREAK BADGE
// ============================================

interface QuantityBreakBadgeProps {
  qty: number;
  price: number;
  discount: number;
  isActive: boolean;
  isNext: boolean;
  currency?: string;
  size?: 'sm' | 'md' | 'lg';
}

function QuantityBreakBadge({
  qty,
  price,
  discount,
  isActive,
  isNext,
  currency = 'USD',
  size = 'md',
}: QuantityBreakBadgeProps) {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    borderRadius: '0.375rem',
    padding: '0.25rem 0.5rem',
  };

  const activeStyle: React.CSSProperties = isActive
    ? { background: 'var(--green)', color: '#fff' }
    : isNext
      ? { background: 'color-mix(in srgb, var(--orange) 25%, transparent)', border: '1px solid var(--orange)' }
      : { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' };

  const sizeStyle: React.CSSProperties = size === 'sm' || size === 'md' ? { fontSize: '0.85rem' } : {};

  return (
    <div style={{ ...baseStyle, ...activeStyle, ...sizeStyle }}>
      <i className="ti ti-package"></i>
      <span>{qty}+</span>
      <span style={{ fontWeight: 700 }}>{formatCurrency(price, currency)}</span>
      {discount > 0 && (
        <span style={isActive ? undefined : { color: 'var(--green)' }}>
          (-{formatPercent(discount)})
        </span>
      )}
      {isActive && <i className="ti ti-check"></i>}
      {isNext && !isActive && (
        <span className="badge" style={{ background: 'var(--orange)', color: '#000', marginLeft: '0.25rem' }}>Best Value</span>
      )}
    </div>
  );
}

// ============================================
// DISCOUNT BADGE
// ============================================

interface DiscountBadgeProps {
  percentage: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning';
}

export function DiscountBadge({ 
  percentage, 
  size = 'md', 
  variant = 'success' 
}: DiscountBadgeProps) {
  if (percentage <= 0) return null;

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { fontSize: '0.75rem', padding: '0 0.25rem' },
    md: { padding: '0.25rem 0.5rem' },
    lg: { padding: '0.5rem 0.75rem', fontSize: '1rem' },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    default: { background: 'var(--accent)', color: '#fff' },
    success: { background: 'var(--green)', color: '#fff' },
    warning: { background: 'var(--orange)', color: '#000' },
  };

  return (
    <span className="badge" style={{ ...variantStyles[variant], ...sizeStyles[size] }}>
      -{formatPercent(percentage)}
    </span>
  );
}

// ============================================
// SAVINGS DISPLAY
// ============================================

interface SavingsDisplayProps {
  originalTotal: number;
  discountedTotal: number;
  currency?: string;
  showPerItem?: boolean;
  quantity?: number;
}

export function SavingsDisplay({
  originalTotal,
  discountedTotal,
  currency = 'USD',
  showPerItem = false,
  quantity = 1,
}: SavingsDisplayProps) {
  const savings = originalTotal - discountedTotal;
  const savingsPercent = calculateDiscount(originalTotal, discountedTotal);
  const savingsPerItem = savings / quantity;

  if (savings <= 0) return null;

  return (
    <div style={{ background: 'color-mix(in srgb, var(--green) 10%, transparent)', border: '1px solid var(--green)', borderRadius: '0.5rem', padding: '0.5rem 1rem', marginBottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--green)' }}>
      <div>
        <i className="ti ti-discount" style={{ marginRight: '0.5rem' }}></i>
        <span>You&apos;re saving </span>
        <strong>{formatCurrency(savings, currency)}</strong>
        <span style={{ marginLeft: '0.25rem' }}>({formatPercent(savingsPercent)})</span>
      </div>
      {showPerItem && quantity > 1 && (
        <small style={{ color: 'var(--text-secondary)' }}>
          {formatCurrency(savingsPerItem, currency)}/item
        </small>
      )}
    </div>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function findApplicableBreak(
  quantity: number,
  breaks: QuantityBreak[]
): QuantityBreak | null {
  if (!breaks || breaks.length === 0) return null;

  const sortedBreaks = [...breaks].sort((a, b) => b.qty - a.qty);

  for (const breakItem of sortedBreaks) {
    if (quantity >= breakItem.qty) {
      return breakItem;
    }
  }

  return null;
}

// ============================================
// PRODUCT PRICE TAG (For Cards)
// ============================================

interface ProductPriceTagProps {
  listPrice: number;
  companyPrice: number;
  hasQuantityBreaks?: boolean;
  currency?: string;
}

export function ProductPriceTag({
  listPrice,
  companyPrice,
  hasQuantityBreaks = false,
  currency = 'USD',
}: ProductPriceTagProps) {
  const hasDiscount = companyPrice < listPrice;
  const discountPercent = hasDiscount ? calculateDiscount(listPrice, companyPrice) : 0;

  return (
    <div>
      {/* Your Price */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <span className="fs-5" style={{ fontWeight: 700, color: 'var(--green)' }}>
          {formatCurrency(companyPrice, currency)}
        </span>
        {hasDiscount && (
          <span style={{ color: 'var(--text-secondary)', textDecoration: 'line-through', fontSize: '0.85rem' }}>
            {formatCurrency(listPrice, currency)}
          </span>
        )}
      </div>

      {/* Badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
        {hasDiscount && (
          <span className="badge" style={{ background: 'var(--green)', color: '#fff' }}>
            Save {formatPercent(discountPercent)}
          </span>
        )}
        {hasQuantityBreaks && (
          <span className="badge" style={{ background: 'var(--blue, #007aff)', color: '#fff' }}>
            <i className="ti ti-package" style={{ marginRight: '0.25rem' }}></i>
            Volume Discounts
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================
// EXPORTS
// ============================================

export default PriceDisplay;
