'use client';

import { accountsFetch } from '@/lib/api-client';
import { config } from '@/lib/config';
import { formatCurrency } from '@/lib/utils';
import type { B2BPricing, Product, ProductVariant } from '@/types';
import { useEffect, useMemo, useState } from 'react';
import ProductCard from './components/ProductCard';

// Extended product with pricing info
interface ProductWithPricing extends Product {
  companyPrice: number;
  listPrice: number;
  discount: number;
  image: string;
  inStock?: boolean;
}

type SortOption = 'name' | 'price-low' | 'price-high' | 'discount' | 'newest';
type ViewMode = 'grid' | 'list';

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductWithPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [pricingError, setPricingError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [showOnlyDiscounted, setShowOnlyDiscounted] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setPricingError(false);
      const productsResponse = await accountsFetch('/api/v1/catalog/products?limit=100');
      const productsData = await productsResponse.json();

      // Handle both array and paginated response formats
      const productsList: Product[] = Array.isArray(productsData)
        ? productsData
        : (productsData.data || productsData.products || []);

      // Get variant IDs for pricing calculation
      const allVariantIds = productsList
        .flatMap(p => p.variants?.map((v: ProductVariant) => v.shopifyVariantId?.toString()) || [])
        .filter(Boolean);

      // Get actual B2B pricing from API
      let pricingMap: Record<string, B2BPricing> = {};
      if (allVariantIds.length > 0) {
        try {
          const pricingResponse = await accountsFetch('/api/v1/pricing/calculate', {
            method: 'POST',
            body: JSON.stringify({ variantIds: allVariantIds }),
          });
          if (pricingResponse.ok) {
            const pricingData = await pricingResponse.json();
            pricingMap = (pricingData.prices || []).reduce((acc: Record<string, B2BPricing>, p: B2BPricing) => {
              acc[p.variantId] = p;
              return acc;
            }, {});
          } else {
            setPricingError(true);
          }
        } catch (e) {
          console.error('Pricing fetch error:', e);
          setPricingError(true);
        }
      }

      const productsWithPricing: ProductWithPricing[] = productsList.map((product: Product) => {
        const variant = product.variants?.[0];
        const basePrice = parseFloat(String(variant?.price)) || 0;
        const pricing = pricingMap[variant?.shopifyVariantId?.toString()] || {} as B2BPricing;

        const companyPrice = pricing.discountedPrice || basePrice;
        const discount = pricing.discountPercentage || 0;

        return {
          ...product,
          companyPrice,
          listPrice: basePrice,
          discount,
          image: product.images?.[0]?.url || product.images?.[0]?.src || '/placeholder.png',
          vendor: product.vendor || config.brandName,
          inStock: variant?.inventoryQuantity === undefined || variant.inventoryQuantity > 0,
        };
      });

      setProducts(productsWithPricing);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Get unique vendors for filter
  const vendors = useMemo(() => {
    const vendorSet = new Set(products.map(p => p.vendor).filter(Boolean));
    return Array.from(vendorSet).sort();
  }, [products]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.title?.toLowerCase().includes(query) ||
        p.vendor?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }

    // Vendor filter
    if (selectedVendor) {
      result = result.filter(p => p.vendor === selectedVendor);
    }

    // Discount filter
    if (showOnlyDiscounted) {
      result = result.filter(p => p.discount > 0);
    }

    // Sort
    switch (sortBy) {
      case 'name':
        result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'price-low':
        result.sort((a, b) => a.companyPrice - b.companyPrice);
        break;
      case 'price-high':
        result.sort((a, b) => b.companyPrice - a.companyPrice);
        break;
      case 'discount':
        result.sort((a, b) => b.discount - a.discount);
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        break;
    }

    return result;
  }, [products, searchQuery, selectedVendor, showOnlyDiscounted, sortBy]);

  // Stats
  const stats = {
    total: products.length,
    discounted: products.filter(p => p.discount > 0).length,
    avgDiscount: products.length > 0
      ? Math.round(products.reduce((sum, p) => sum + p.discount, 0) / products.length)
      : 0,
    totalSavings: products.reduce((sum, p) => sum + (p.listPrice - p.companyPrice), 0),
  };

  const handleAddToCart = async (productId: string) => {
    const product = products.find(p => p.id === productId);

    if (!product || !product.variants?.[0]) {
      throw new Error('Product or variant not found');
    }

    const variant = product.variants[0];
    const companyId = localStorage.getItem('eagle_companyId') || '';
    const userId = localStorage.getItem('eagle_userId') || '';
    const merchantId = localStorage.getItem('eagle_merchantId') || '';

    if (!merchantId) {
      throw new Error('Merchant not found. Please login again.');
    }

    try {
      // Step 1: Get or create cart
      const cartResponse = await accountsFetch('/api/v1/carts/active');
      let cart = null;

      if (cartResponse.ok) {
        cart = await cartResponse.json().catch(() => null);
      }

      if (!cart || !cart.id) {
        // Create new cart
        const cartData = {
          merchantId,
          companyId,
          createdByUserId: userId
        };

        const createResponse = await accountsFetch('/api/v1/carts', {
          method: 'POST',
          body: JSON.stringify(cartData),
        });

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          console.error('Cart create error:', errorText);
          throw new Error(`Cart creation failed: ${createResponse.status}`);
        }

        cart = await createResponse.json();

        if (!cart || !cart.id) {
          throw new Error('Cart ID not received');
        }
      }

      // Step 2: Add item to cart
      // Use shopifyVariantId if available, otherwise use variant.id or product's shopifyProductId
      const shopifyVarId = variant.shopifyVariantId || variant.id || '';
      const addItemResponse = await accountsFetch(`/api/v1/carts/${cart.id}/items`, {
        method: 'POST',
        body: JSON.stringify({
          variantId: variant.id,
          shopifyVariantId: shopifyVarId.toString(),
          quantity: 1,
        }),
      });

      if (!addItemResponse.ok) {
        const error = await addItemResponse.json();
        throw new Error(`Add item failed: ${error.message || addItemResponse.status}`);
      }

      return true;
    } catch (err) {
      console.error('Add to cart error:', err);
      throw new Error(err instanceof Error ? err.message : 'Failed to add to cart');
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontWeight: 700, fontSize: 22, margin: '0 0 4px' }}>Product Catalog</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>Browse with exclusive B2B pricing</p>
        </div>
        <button
          className="btn-apple btn-apple-secondary"
          onClick={loadProducts}
          disabled={loading}
          title="Refresh"
          style={{ width: 38, height: 38, padding: 0 }}
        >
          <i className="ti ti-refresh"></i>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            <i className="ti ti-package"></i>
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Products</span>
            <span className="stat-value">{stats.total}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(52,199,89,0.1)', color: 'var(--green)' }}>
            <i className="ti ti-discount"></i>
          </div>
          <div className="stat-info">
            <span className="stat-label">On Sale</span>
            <span className="stat-value">{stats.discounted}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(255,149,0,0.1)', color: 'var(--orange)' }}>
            <i className="ti ti-percentage"></i>
          </div>
          <div className="stat-info">
            <span className="stat-label">Avg. Discount</span>
            <span className="stat-value">{stats.avgDiscount}%</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(0,122,255,0.1)', color: 'var(--accent)' }}>
            <i className="ti ti-pig-money"></i>
          </div>
          <div className="stat-info">
            <span className="stat-label">Your Savings</span>
            <span className="stat-value">{formatCurrency(stats.totalSavings)}</span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ flex: '1 1 280px', position: 'relative' }}>
              <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}></i>
              <input
                type="text"
                placeholder="Search products..."
                className="form-input"
                style={{ paddingLeft: 36 }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
                >
                  <i className="ti ti-x"></i>
                </button>
              )}
            </div>

            {/* Vendor Filter */}
            <select
              className="form-input"
              style={{ flex: '0 0 160px' }}
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
            >
              <option value="">All Vendors</option>
              {vendors.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>

            {/* Sort */}
            <select
              className="form-input"
              style={{ flex: '0 0 180px' }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <option value="name">Name A-Z</option>
              <option value="price-low">Price: Low → High</option>
              <option value="price-high">Price: High → Low</option>
              <option value="discount">Best Discount</option>
              <option value="newest">Newest</option>
            </select>

            {/* Discount Filter */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={showOnlyDiscounted}
                onChange={(e) => setShowOnlyDiscounted(e.target.checked)}
                style={{ accentColor: 'var(--accent)' }}
              />
              On Sale Only
            </label>

            {/* View Toggle */}
            <div style={{ display: 'flex', gap: 4, background: 'var(--bg-secondary)', borderRadius: 8, padding: 3 }}>
              <button
                className={viewMode === 'grid' ? 'btn-apple btn-apple-primary' : 'btn-apple'}
                onClick={() => setViewMode('grid')}
                style={{ width: 34, height: 30, padding: 0, fontSize: 16 }}
              >
                <i className="ti ti-grid-dots"></i>
              </button>
              <button
                className={viewMode === 'list' ? 'btn-apple btn-apple-primary' : 'btn-apple'}
                onClick={() => setViewMode('list')}
                style={{ width: 34, height: 30, padding: 0, fontSize: 16 }}
              >
                <i className="ti ti-list"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Error Alert */}
      {pricingError && (
        <div className="alert alert-warning" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-alert-triangle"></i>
          <span style={{ flex: 1 }}><strong>B2B Pricing Unavailable:</strong> Showing standard prices. Your discounts may not be reflected.</span>
          <button onClick={() => setPricingError(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <i className="ti ti-x"></i>
          </button>
        </div>
      )}

      {/* Results Info */}
      {(searchQuery || selectedVendor || showOnlyDiscounted) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Showing {filteredProducts.length} of {products.length} products
          </span>
          <button
            className="btn-apple btn-apple-secondary"
            style={{ height: 32, fontSize: 13 }}
            onClick={() => {
              setSearchQuery('');
              setSelectedVendor('');
              setShowOnlyDiscounted(false);
            }}
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Products */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="spinner-apple" />
          <p style={{ marginTop: 16, color: 'var(--text-secondary)' }}>Loading products with B2B pricing...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <i className="ti ti-package-off" style={{ fontSize: 48, color: 'var(--text-tertiary)', display: 'block', marginBottom: 16 }}></i>
            <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px' }}>No products found</h3>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 16px' }}>
              {searchQuery || selectedVendor || showOnlyDiscounted
                ? 'Try adjusting your filters'
                : 'Products will appear here after sync'
              }
            </p>
            {(searchQuery || selectedVendor || showOnlyDiscounted) && (
              <button
                className="btn-apple btn-apple-primary"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedVendor('');
                  setShowOnlyDiscounted(false);
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
      ) : (
        /* List View */
        <div className="card">
          <div className="table-container">
            <table className="apple-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Vendor</th>
                  <th>List Price</th>
                  <th>Your Price</th>
                  <th>Discount</th>
                  <th>Status</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <img
                          src={product.image}
                          alt={product.title}
                          style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8 }}
                        />
                        <div>
                          <a href={`/products/${product.id}`} style={{ fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none' }}>
                            {product.title}
                          </a>
                          {product.variants?.[0]?.sku && (
                            <span style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)' }}>SKU: {product.variants[0].sku}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td><span className="badge">{product.vendor}</span></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{formatCurrency(product.listPrice)}</td>
                    <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{formatCurrency(product.companyPrice)}</td>
                    <td>
                      {product.discount > 0 ? (
                        <span className="badge" style={{ background: 'rgba(52,199,89,0.12)', color: 'var(--green)' }}>{product.discount}% OFF</span>
                      ) : (
                        <span style={{ color: 'var(--text-tertiary)' }}>-</span>
                      )}
                    </td>
                    <td>
                      <span className="badge" style={{ background: product.inStock ? 'rgba(52,199,89,0.12)' : 'rgba(255,59,48,0.12)', color: product.inStock ? 'var(--green)' : 'var(--red)' }}>
                        {product.inStock ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-apple btn-apple-primary"
                        style={{ width: 36, height: 36, padding: 0 }}
                        onClick={() => handleAddToCart(product.id)}
                        disabled={!product.inStock}
                      >
                        <i className="ti ti-shopping-cart"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
