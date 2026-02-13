'use client';

import React from 'react';
import { formatCurrency, formatPercent } from '@/lib/utils';
import type { QuantityBreak } from '@/types';

// ============================================
// QUANTITY BREAK ALERT
// Shows "Add X more items for better pricing" message
// ============================================

interface QuantityBreakAlertProps {
  currentQuantity: number;
  currentPrice: number;
  nextBreak: {
    qty: number;
    price: number;
  };
  onAddMore?: () => void;
  onDismiss?: () => void;
  currency?: string;
}

export function QuantityBreakAlert({
  currentQuantity,
  currentPrice,
  nextBreak,
  onAddMore,
  onDismiss,
  currency = 'USD',
}: QuantityBreakAlertProps) {
  const additionalNeeded = nextBreak.qty - currentQuantity;
  const currentTotal = currentQuantity * currentPrice;
  const newTotal = nextBreak.qty * nextBreak.price;
  
  // Calculate potential savings
  // If user adds X more items at the new price, what do they save vs buying at current price?
  const totalAtCurrentPrice = nextBreak.qty * currentPrice;
  const potentialSavings = totalAtCurrentPrice - newTotal;
  const savingsPercent = ((currentPrice - nextBreak.price) / currentPrice) * 100;

  return (
    <div className="alert-apple alert-apple-warning" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <div style={{ marginRight: 12 }}>
          <span className="badge" style={{ background: 'var(--orange)', color: '#fff', borderRadius: '50%', padding: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-bolt ti-lg"></i>
          </span>
        </div>
        <div style={{ flex: 1 }}>
          <h6 style={{ fontWeight: 600, margin: '0 0 4px' }}>
            Add {additionalNeeded} more for extra {formatPercent(savingsPercent)} off!
          </h6>
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Current:</span>
                <div>{currentQuantity} × {formatCurrency(currentPrice, currency)} = <strong>{formatCurrency(currentTotal, currency)}</strong></div>
              </div>
              <div>
                <span style={{ color: 'var(--green)' }}>With {nextBreak.qty}+ items:</span>
                <div>{nextBreak.qty} × {formatCurrency(nextBreak.price, currency)} = <strong style={{ color: 'var(--green)' }}>{formatCurrency(newTotal, currency)}</strong></div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="badge" style={{ background: 'var(--green)', color: '#fff', padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem' }}>
              <i className="ti ti-discount" style={{ marginRight: 4 }}></i>
              Save {formatCurrency(potentialSavings, currency)}
            </span>
            {onAddMore && (
              <button 
                className="btn-apple btn-apple-primary"
                style={{ fontSize: '0.85rem', padding: '4px 12px' }}
                onClick={onAddMore}
              >
                <i className="ti ti-plus" style={{ marginRight: 4 }}></i>
                Add {additionalNeeded} More
              </button>
            )}
            {onDismiss && (
              <button 
                className="btn-apple btn-apple-secondary"
                style={{ fontSize: '0.85rem', padding: '4px 12px' }}
                onClick={onDismiss}
              >
                No thanks
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// CART QUANTITY OPTIMIZER
// Shows all potential savings opportunities in cart
// ============================================

interface CartItemForOptimization {
  id: string;
  title: string;
  quantity: number;
  unitPrice: number;
  quantityBreaks?: QuantityBreak[];
}

interface CartOptimizerProps {
  items: CartItemForOptimization[];
  onUpdateQuantity?: (itemId: string, newQty: number) => void;
  currency?: string;
}

export function CartOptimizer({
  items,
  onUpdateQuantity,
  currency = 'USD',
}: CartOptimizerProps) {
  // Find items that can benefit from quantity breaks
  const opportunities = items.map(item => {
    if (!item.quantityBreaks || item.quantityBreaks.length === 0) {
      return null;
    }

    const sortedBreaks = [...item.quantityBreaks].sort((a, b) => a.qty - b.qty);
    const nextBreak = sortedBreaks.find(b => b.qty > item.quantity);

    if (!nextBreak) return null;

    const additionalNeeded = nextBreak.qty - item.quantity;
    const currentTotal = item.quantity * item.unitPrice;
    const newTotal = nextBreak.qty * nextBreak.price;
    const totalAtCurrentPrice = nextBreak.qty * item.unitPrice;
    const potentialSavings = totalAtCurrentPrice - newTotal;

    // Only show if savings are significant (> $5 or > 5%)
    const savingsPercent = (potentialSavings / totalAtCurrentPrice) * 100;
    if (potentialSavings < 5 && savingsPercent < 5) return null;

    return {
      item,
      nextBreak,
      additionalNeeded,
      currentTotal,
      newTotal,
      potentialSavings,
      savingsPercent,
    };
  }).filter(Boolean);

  if (opportunities.length === 0) return null;

  const totalPotentialSavings = opportunities.reduce(
    (sum, opp) => sum + (opp?.potentialSavings || 0), 
    0
  );

  return (
    <div className="card" style={{ border: '1px solid var(--orange)', marginBottom: 16 }}>
      <div className="card-header" style={{ background: 'color-mix(in srgb, var(--orange) 10%, transparent)', borderBottom: '1px solid var(--orange)' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <i className="ti ti-bulb ti-lg" style={{ color: 'var(--orange)', marginRight: 8 }}></i>
          <div>
            <h6 style={{ margin: 0, fontWeight: 600 }}>Savings Opportunities</h6>
            <small style={{ color: 'var(--text-secondary)' }}>
              You could save up to <strong style={{ color: 'var(--green)' }}>{formatCurrency(totalPotentialSavings, currency)}</strong>
            </small>
          </div>
        </div>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {opportunities.map((opp) => opp && (
            <li key={opp.item.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{opp.item.title}</strong>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Add {opp.additionalNeeded} more to get {formatCurrency(opp.nextBreak.price, currency)}/each
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="badge" style={{ background: 'var(--green)', color: '#fff', padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem', marginBottom: 4, display: 'inline-block' }}>
                    Save {formatCurrency(opp.potentialSavings, currency)}
                  </span>
                  {onUpdateQuantity && (
                    <button 
                      className="btn-apple btn-apple-secondary"
                      style={{ display: 'block', fontSize: '0.85rem', padding: '4px 12px', border: '1px solid var(--orange)', color: 'var(--orange)' }}
                      onClick={() => onUpdateQuantity(opp.item.id, opp.nextBreak.qty)}
                    >
                      Add {opp.additionalNeeded}
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ============================================
// INLINE QUANTITY BREAK HINT
// Small hint shown next to quantity input
// ============================================

interface QuantityBreakHintProps {
  currentQuantity: number;
  breaks: QuantityBreak[];
  currentPrice: number;
  currency?: string;
}

export function QuantityBreakHint({
  currentQuantity,
  breaks,
  currentPrice,
  currency = 'USD',
}: QuantityBreakHintProps) {
  if (!breaks || breaks.length === 0) return null;

  const sortedBreaks = [...breaks].sort((a, b) => a.qty - b.qty);
  const nextBreak = sortedBreaks.find(b => b.qty > currentQuantity);

  if (!nextBreak) {
    // User is at highest break - show current tier
    const currentBreak = sortedBreaks.filter(b => b.qty <= currentQuantity).pop();
    if (currentBreak) {
      return (
        <small style={{ color: 'var(--green)', display: 'block', marginTop: 4 }}>
          <i className="ti ti-check" style={{ marginRight: 4 }}></i>
          Volume discount applied!
        </small>
      );
    }
    return null;
  }

  const additionalNeeded = nextBreak.qty - currentQuantity;
  const savingsPerItem = currentPrice - nextBreak.price;

  return (
    <small style={{ color: 'var(--orange)', display: 'block', marginTop: 4 }}>
      <i className="ti ti-trending-down" style={{ marginRight: 4 }}></i>
      Add {additionalNeeded} more for {formatCurrency(savingsPerItem, currency)} off each
    </small>
  );
}

// ============================================
// EXPORTS
// ============================================

export default QuantityBreakAlert;
