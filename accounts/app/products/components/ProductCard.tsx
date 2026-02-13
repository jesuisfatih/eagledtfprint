'use client';

import { useState } from 'react';
import { formatCurrency, calculateDiscount } from '@/lib/utils';
import { showToast } from '@/components/ui';
import type { ProductVariant, QuantityBreak } from '@/types';

interface ProductForDisplay {
  id: string;
  title: string;
  vendor: string;
  companyPrice?: number;
  listPrice?: number;
  discount?: number;
  variants?: ProductVariant[];
  imageUrl?: string;
  image?: string;
  quantityBreaks?: QuantityBreak[];
}

interface ProductCardProps {
  product: ProductForDisplay;
  onAddToCart: (productId: string) => Promise<boolean | void>;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [adding, setAdding] = useState(false);
  const listPrice = product.listPrice || 0;
  const companyPrice = product.companyPrice || listPrice;
  const hasDiscount = companyPrice < listPrice;
  const discountPercent = hasDiscount ? calculateDiscount(listPrice, companyPrice) : 0;
  const hasQuantityBreaks = product.quantityBreaks && product.quantityBreaks.length > 0;
  const inStock = (product.variants?.[0]?.inventoryQuantity || 0) > 0;
  const imgSrc = product.imageUrl || product.image || '/placeholder.png';

  const handleAdd = async () => {
    setAdding(true);
    try {
      await onAddToCart(product.id);
      showToast('Product added to cart!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add to cart', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleWishlist = () => {
    const wishlist = JSON.parse(localStorage.getItem('eagle_wishlist') || '[]');
    wishlist.push({ id: product.id, title: product.title, vendor: product.vendor, price: companyPrice });
    localStorage.setItem('eagle_wishlist', JSON.stringify(wishlist));
    showToast('Added to wishlist!', 'success');
  };

  return (
    <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Product Image */}
      <a href={`/products/${product.id}`} style={{ display: 'block', position: 'relative' }}>
        <img 
          src={imgSrc} 
          alt={product.title}
          style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
        />
        {/* Discount Badge */}
        {hasDiscount && (
          <span className="badge" style={{ position: 'absolute', top: 10, left: 10, background: 'var(--green)', color: '#fff', fontSize: 12 }}>
            -{discountPercent}% OFF
          </span>
        )}
        {/* Volume Badge */}
        {hasQuantityBreaks && (
          <span className="badge" style={{ position: 'absolute', top: 10, right: 10, background: 'var(--accent)', color: '#fff', fontSize: 12 }}>
            <i className="ti ti-package" style={{ marginRight: 4 }}></i>Volume
          </span>
        )}
      </a>

      <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <a href={`/products/${product.id}`} style={{ textDecoration: 'none', color: 'var(--text-primary)' }}>
          <h4 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px', lineHeight: 1.4 }}>{product.title}</h4>
        </a>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 12px' }}>{product.vendor}</p>

        {/* Price Display */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--green)' }}>{formatCurrency(companyPrice)}</span>
            {hasDiscount && (
              <span style={{ fontSize: 14, color: 'var(--text-tertiary)', textDecoration: 'line-through' }}>{formatCurrency(listPrice)}</span>
            )}
          </div>
          {hasDiscount && (
            <span className="badge" style={{ marginTop: 6, background: 'rgba(52,199,89,0.12)', color: 'var(--green)', fontSize: 11 }}>
              <i className="ti ti-tag" style={{ marginRight: 4 }}></i>B2B Price — Save {discountPercent}%
            </span>
          )}
          {hasQuantityBreaks && (
            <div style={{ marginTop: 8, padding: 8, background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 12 }}>
              <div style={{ color: 'var(--text-secondary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className="ti ti-trending-down"></i>Volume Discounts:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {product.quantityBreaks!.slice(0, 3).map((b) => (
                  <span key={b.qty} className="badge" style={{ background: 'rgba(0,122,255,0.1)', color: 'var(--accent)' }}>
                    {b.qty}+ @ {formatCurrency(b.price)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stock Status */}
        {product.variants?.[0] && (
          <div style={{ marginBottom: 12 }}>
            <span className="badge" style={{ background: inStock ? 'rgba(52,199,89,0.12)' : 'rgba(255,149,0,0.12)', color: inStock ? 'var(--green)' : 'var(--orange)', fontSize: 11 }}>
              {inStock ? `In Stock (${product.variants[0].inventoryQuantity})` : 'Limited Stock — Contact Sales'}
            </span>
          </div>
        )}

        {/* Actions */}
        <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
          <button
            onClick={handleAdd}
            disabled={adding || product.variants?.[0]?.inventoryQuantity === 0}
            className="btn-apple btn-apple-primary"
            style={{ flex: 1, height: 40 }}
          >
            {adding ? (
              <><span className="spinner-apple" style={{ width: 16, height: 16, marginRight: 6 }} />Adding...</>
            ) : product.variants?.[0]?.inventoryQuantity === 0 ? 'Out of Stock' : (
              <><i className="ti ti-shopping-cart-plus" style={{ marginRight: 6 }}></i>Add to Cart</>
            )}
          </button>
          <button
            onClick={handleWishlist}
            className="btn-apple btn-apple-secondary"
            title="Add to Wishlist"
            style={{ width: 40, height: 40, padding: 0 }}
          >
            <i className="ti ti-heart"></i>
          </button>
        </div>
      </div>
    </div>
  );
}

