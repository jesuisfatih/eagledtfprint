'use client';

import { useState, useEffect } from 'react';
import { accountsFetch } from '@/lib/api-client';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';

interface WishlistItem {
  id: string;
  productId: string;
  variantId?: string;
  title?: string;
  productTitle?: string;
  variantTitle?: string;
  vendor?: string;
  price: number;
  compareAtPrice?: number;
  image?: string;
  productImage?: string;
  addedAt: string;
  inStock?: boolean;
  sku?: string;
}

type SortOption = 'newest' | 'oldest' | 'price-low' | 'price-high' | 'name';

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkAdding, setBulkAdding] = useState(false);

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem('eagle_userId') || '';
      
      const response = await accountsFetch(`/api/v1/users/${userId}/wishlist`);
      
      if (response.ok) {
        const data = await response.json();
        const apiWishlist = Array.isArray(data) ? data : data.items || [];
        setWishlist(apiWishlist);
        localStorage.setItem('eagle_wishlist', JSON.stringify(apiWishlist));
      } else {
        const saved = localStorage.getItem('eagle_wishlist');
        if (saved) setWishlist(JSON.parse(saved));
      }
    } catch (err) {
      const saved = localStorage.getItem('eagle_wishlist');
      if (saved) setWishlist(JSON.parse(saved));
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (itemId: string, productId: string) => {
    try {
      setRemoving(itemId);
      const userId = localStorage.getItem('eagle_userId') || '';
      
      await accountsFetch(`/api/v1/users/${userId}/wishlist/${productId}`, { method: 'DELETE' });
      
      const updated = wishlist.filter(item => item.id !== itemId);
      setWishlist(updated);
      setSelectedItems(prev => { prev.delete(itemId); return new Set(prev); });
      localStorage.setItem('eagle_wishlist', JSON.stringify(updated));
    } catch (err) {
      const updated = wishlist.filter(item => item.id !== itemId);
      setWishlist(updated);
      localStorage.setItem('eagle_wishlist', JSON.stringify(updated));
    } finally {
      setRemoving(null);
    }
  };

  const addToCart = async (item: WishlistItem) => {
    try {
      setAddingToCart(item.id);
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
      
      if (cart && cart.id) {
        const response = await accountsFetch(`/api/v1/carts/${cart.id}/items`, {
          method: 'POST',
          body: JSON.stringify({
            variantId: item.variantId || item.productId,
            shopifyVariantId: (item.variantId || item.productId || '').toString(),
            quantity: 1,
          }),
        });
        
        if (response.ok) {
          // Show success feedback
          alert('Added to cart!');
        } else {
          const error = await response.json().catch(() => ({}));
          alert(error.message || 'Failed to add to cart');
        }
      }
    } catch (err) {
      console.error('Failed to add to cart:', err);
      alert('Failed to add to cart');
    } finally {
      setAddingToCart(null);
    }
  };

  const addSelectedToCart = async () => {
    if (selectedItems.size === 0) return;
    
    setBulkAdding(true);
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
      setBulkAdding(false);
      return;
    }
    
    let successCount = 0;
    for (const itemId of selectedItems) {
      const item = wishlist.find(w => w.id === itemId);
      if (item) {
        try {
          const response = await accountsFetch(`/api/v1/carts/${cart.id}/items`, {
            method: 'POST',
            body: JSON.stringify({
              variantId: item.variantId || item.productId,
              shopifyVariantId: (item.variantId || item.productId || '').toString(),
              quantity: 1,
            }),
          });
          if (response.ok) successCount++;
        } catch (err) {
          console.error('Failed to add item:', err);
        }
      }
    }
    
    alert(`Added ${successCount} of ${selectedItems.size} items to cart`);
    setSelectedItems(new Set());
    setBulkAdding(false);
  };

  const toggleSelectItem = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (selectedItems.size === wishlist.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(wishlist.map(w => w.id)));
    }
  };

  // Sort wishlist
  const sortedWishlist = [...wishlist].sort((a, b) => {
    switch (sortBy) {
      case 'newest': return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
      case 'oldest': return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
      case 'price-low': return (a.price || 0) - (b.price || 0);
      case 'price-high': return (b.price || 0) - (a.price || 0);
      case 'name': return (a.title || a.productTitle || '').localeCompare(b.title || b.productTitle || '');
      default: return 0;
    }
  });

  // Calculate totals
  const totalValue = wishlist.reduce((sum, item) => sum + (item.price || 0), 0);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div className="spinner-apple"></div>
        <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>Loading wishlist...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h4 style={{ fontWeight: 600, marginBottom: '4px' }}>Wishlist</h4>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            {wishlist.length} item{wishlist.length !== 1 ? 's' : ''} • Total value: {formatCurrency(totalValue)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {selectedItems.size > 0 && (
            <button 
              className="btn-apple btn-apple-primary"
              onClick={addSelectedToCart}
              disabled={bulkAdding}
            >
              {bulkAdding ? (
                <span className="spinner-apple" style={{ width: 16, height: 16, marginRight: '4px' }}></span>
              ) : (
                <i className="ti ti-shopping-cart" style={{ marginRight: '4px' }}></i>
              )}
              Add {selectedItems.size} to Cart
            </button>
          )}
          <button 
            className="btn-apple btn-apple-secondary"
            onClick={loadWishlist}
            title="Refresh"
            style={{ padding: '8px' }}
          >
            <i className="ti ti-refresh"></i>
          </button>
        </div>
      </div>

      {wishlist.length === 0 ? (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '40px 0' }}>
            <i className="ti ti-heart ti-3x" style={{ color: 'var(--text-secondary)', marginBottom: '12px', display: 'block' }}></i>
            <h5>Your wishlist is empty</h5>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>Save products you're interested in for later</p>
            <a href="/products" className="btn-apple btn-apple-primary">
              <i className="ti ti-package" style={{ marginRight: '4px' }}></i>Browse Products
            </a>
          </div>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="selectAll"
                checked={selectedItems.size === wishlist.length && wishlist.length > 0}
                onChange={selectAll}
                style={{ width: 18, height: 18, accentColor: 'var(--accent)' }}
              />
              <label htmlFor="selectAll">
                Select All
              </label>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginRight: '4px' }}>Sort by:</label>
              <select 
                className="form-input" 
                style={{ width: 'auto' }}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>

          {/* Products Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
            {sortedWishlist.map((item) => {
              const itemTitle = item.title || item.productTitle || 'Product';
              const itemImage = item.image || item.productImage;
              const hasDiscount = item.compareAtPrice && item.compareAtPrice > item.price;
              const isSelected = selectedItems.has(item.id);
              
              return (
                <div key={item.id}>
                  <div className="card" style={{ height: '100%', ...(isSelected ? { border: '2px solid var(--accent)' } : {}) }}>
                    {/* Selection Checkbox */}
                    <div style={{ position: 'absolute', top: 0, left: 0, margin: '8px', zIndex: 1 }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectItem(item.id)}
                        style={{ width: 20, height: 20, accentColor: 'var(--accent)' }}
                      />
                    </div>
                    
                    {/* Discount Badge */}
                    {hasDiscount && (
                      <div style={{ position: 'absolute', top: 0, right: 0, margin: '8px', zIndex: 1 }}>
                        <span className="badge" style={{ background: 'var(--red)', color: '#fff' }}>
                          -{Math.round((1 - item.price / item.compareAtPrice!) * 100)}%
                        </span>
                      </div>
                    )}
                    
                    {/* Image */}
                    <a href={`/products/${item.productId}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '180px', background: 'var(--bg-secondary)', borderRadius: '8px 8px 0 0' }}>
                      {itemImage ? (
                        <img 
                          src={itemImage} 
                          alt={itemTitle}
                          style={{maxHeight: '100%', maxWidth: '100%', objectFit: 'contain'}}
                        />
                      ) : (
                        <i className="ti ti-photo ti-2x" style={{ color: 'var(--text-secondary)' }}></i>
                      )}
                    </a>
                    
                    <div className="card-body" style={{ display: 'flex', flexDirection: 'column' }}>
                      {/* Vendor */}
                      {item.vendor && (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>{item.vendor}</p>
                      )}
                      
                      {/* Title */}
                      <h6 className="card-title" style={{ marginBottom: '4px' }} title={itemTitle}>
                        <a href={`/products/${item.productId}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                          {itemTitle}
                        </a>
                      </h6>
                      
                      {/* SKU */}
                      {item.sku && (
                        <small style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>SKU: {item.sku}</small>
                      )}
                      
                      {/* Price */}
                      <div style={{ marginBottom: '12px', marginTop: 'auto' }}>
                        <span style={{ fontWeight: 600, color: 'var(--accent)', fontSize: '1.1rem' }}>{formatCurrency(item.price)}</span>
                        {hasDiscount && (
                          <small style={{ color: 'var(--text-secondary)', textDecoration: 'line-through', marginLeft: '8px' }}>
                            {formatCurrency(item.compareAtPrice!)}
                          </small>
                        )}
                      </div>
                      
                      {/* Stock Status */}
                      {item.inStock !== undefined && (
                        <div style={{ marginBottom: '8px' }}>
                          <span className="badge" style={item.inStock ? { background: 'color-mix(in srgb, var(--green) 15%, transparent)', color: 'var(--green)' } : { background: 'color-mix(in srgb, var(--red) 15%, transparent)', color: 'var(--red)' }}>
                            {item.inStock ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </div>
                      )}
                      
                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => addToCart(item)}
                          className="btn-apple btn-apple-primary"
                          style={{ flex: 1, fontSize: '0.85rem', padding: '6px 12px' }}
                          disabled={addingToCart === item.id || item.inStock === false}
                        >
                          {addingToCart === item.id ? (
                            <span className="spinner-apple" style={{ width: 14, height: 14 }}></span>
                          ) : (
                            <>
                              <i className="ti ti-shopping-cart" style={{ marginRight: '4px' }}></i>Add to Cart
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => removeFromWishlist(item.id, item.productId)}
                          className="btn-apple btn-apple-secondary"
                          style={{ fontSize: '0.85rem', padding: '6px 10px', color: 'var(--red)' }}
                          disabled={removing === item.id}
                          title="Remove"
                        >
                          {removing === item.id ? (
                            <span className="spinner-apple" style={{ width: 14, height: 14 }}></span>
                          ) : (
                            <i className="ti ti-trash"></i>
                          )}
                        </button>
                      </div>
                      
                      {/* Added Date */}
                      <small style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                        <i className="ti ti-clock" style={{ marginRight: '4px' }}></i>
                        Added {formatRelativeTime(item.addedAt)}
                      </small>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

