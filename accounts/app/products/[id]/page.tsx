'use client';

import { accountsFetch } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [activeInfoTab, setActiveInfoTab] = useState<'description' | 'details' | 'collections'>('description');

  useEffect(() => {
    loadProduct();
  }, [params.id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await accountsFetch(`/api/v1/catalog/products/${params.id}`);
      if (!response.ok) {
        throw new Error('Failed to load product');
      }
      const data = await response.json();
      setProduct(data);
      if (data?.variants?.length > 0) {
        setSelectedVariant(data.variants[0]);
      }
      // Set initial image
      if (data?.images?.length > 0) {
        setSelectedImage(data.images[0]?.url || data.images[0]?.src || data.images[0]);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async () => {
    if (!product || !selectedVariant) return;

    setAdding(true);
    try {
      const companyId = localStorage.getItem('eagle_companyId') || '';

      let cartResponse = await accountsFetch('/api/v1/carts/active');
      let cart = null;

      if (cartResponse.ok && cartResponse.status !== 204) {
        cart = await cartResponse.json();
      }

      if (!cart || !cart.id) {
        const merchantId = localStorage.getItem('eagle_merchantId') || '';
        const userId = localStorage.getItem('eagle_userId') || '';

        const createResponse = await accountsFetch('/api/v1/carts', {
          method: 'POST',
          body: JSON.stringify({ merchantId, companyId, createdByUserId: userId }),
        });

        if (createResponse.ok) {
          cart = await createResponse.json();
        }
      }

      if (cart && cart.id) {
        const addResponse = await accountsFetch(`/api/v1/carts/${cart.id}/items`, {
          method: 'POST',
          body: JSON.stringify({
            variantId: selectedVariant.id,
            shopifyVariantId: (selectedVariant.shopifyVariantId || selectedVariant.shopifyId || '').toString(),
            quantity: quantity,
          }),
        });

        if (addResponse.ok) {
          setAddedToCart(true);
          setTimeout(() => setAddedToCart(false), 3000);
        } else {
          const error = await addResponse.json().catch(() => ({}));
          console.error('Add to cart failed:', error);
          alert(error.message || 'Failed to add to cart');
        }
      }
    } catch (err) {
      console.error('Add to cart error:', err);
    } finally {
      setAdding(false);
    }
  };

  const calculateSavings = () => {
    if (!selectedVariant) return 0;
    const listPrice = selectedVariant.compareAtPrice || selectedVariant.listPrice || selectedVariant.price;
    const unitPrice = selectedVariant.price;
    return Math.max(0, (listPrice - unitPrice) * quantity);
  };

  // Update image when variant changes
  useEffect(() => {
    if (selectedVariant?.imageUrl) {
      setSelectedImage(selectedVariant.imageUrl);
    }
  }, [selectedVariant]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div className="spinner-apple"></div>
        <p style={{ marginTop: 12, color: 'var(--text-secondary)' }}>Loading product...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <i className="ti ti-alert-circle ti-3x" style={{ color: 'var(--red)', marginBottom: 12, display: 'block' }}></i>
        <h5>Error loading product</h5>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>{error}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={loadProduct} className="btn-apple btn-apple-primary">
            <i className="ti ti-refresh" style={{ marginRight: 4 }}></i>Try Again
          </button>
          <Link href="/products" className="btn-apple btn-apple-secondary">
            <i className="ti ti-arrow-left" style={{ marginRight: 4 }}></i>Browse Products
          </Link>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <i className="ti ti-package-off ti-3x" style={{ color: 'var(--text-secondary)', marginBottom: 12, display: 'block' }}></i>
        <h5>Product not found</h5>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>The product you're looking for doesn't exist or is no longer available.</p>
        <Link href="/products" className="btn-apple btn-apple-primary">
          <i className="ti ti-arrow-left" style={{ marginRight: 4 }}></i>Browse Products
        </Link>
      </div>
    );
  }

  const listPrice = selectedVariant?.compareAtPrice || selectedVariant?.listPrice || selectedVariant?.price || 0;
  const unitPrice = selectedVariant?.price || 0;
  const hasDiscount = listPrice > unitPrice;
  const discountPercent = hasDiscount ? Math.round((1 - unitPrice / listPrice) * 100) : 0;
  const savings = calculateSavings();

  // Parse product data
  const images = Array.isArray(product.images) ? product.images : [];
  const collections = Array.isArray(product.collections) ? product.collections : [];
  const options = Array.isArray(product.options) ? product.options : [];
  const metafields = Array.isArray(product.metafields) ? product.metafields : [];
  const stockCount = selectedVariant?.inventoryQuantity || product.totalInventory || 0;
  const isInStock = selectedVariant?.availableForSale !== false && stockCount > 0;

  return (
    <div>
      {/* Breadcrumb */}
      <nav style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
        <Link href="/products" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
          <i className="ti ti-arrow-left" style={{ marginRight: 4 }}></i>Products
        </Link>
        {product.vendor && (
          <>
            <span style={{ color: 'var(--text-secondary)' }}>/</span>
            <span style={{ color: 'var(--text-secondary)' }}>{product.vendor}</span>
          </>
        )}
        {product.productType && (
          <>
            <span style={{ color: 'var(--text-secondary)' }}>/</span>
            <span style={{ color: 'var(--text-secondary)' }}>{product.productType}</span>
          </>
        )}
        <span style={{ color: 'var(--text-secondary)' }}>/</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{product.title}</span>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Product Images — Enhanced Gallery */}
        <div>
          <div className="card">
            <div className="card-body" style={{ padding: 0 }}>
              {selectedImage || (images.length > 0) ? (
                <img
                  src={selectedImage || images[0]?.url || images[0]?.src || images[0]}
                  alt={product.title}
                  style={{ width: '100%', maxHeight: 500, objectFit: 'contain', borderRadius: 10 }}
                />
              ) : (
                <div style={{ background: 'var(--bg-secondary)', padding: 40, textAlign: 'center', borderRadius: 10, minHeight: 400 }}>
                  <i className="ti ti-photo-off ti-5x" style={{ color: 'var(--text-secondary)' }}></i>
                  <p style={{ color: 'var(--text-secondary)', marginTop: 12 }}>No image available</p>
                </div>
              )}
            </div>
          </div>

          {/* Thumbnail Gallery */}
          {images.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {images.map((img: any, i: number) => {
                const imgUrl = img.url || img.src || img;
                const isActive = selectedImage === imgUrl;
                return (
                  <div
                    key={i}
                    onClick={() => setSelectedImage(imgUrl)}
                    style={{
                      border: isActive ? '2px solid var(--accent)' : '1px solid var(--border)',
                      borderRadius: 8,
                      overflow: 'hidden',
                      width: 60,
                      height: 60,
                      cursor: 'pointer',
                      transition: 'border-color 0.15s',
                      opacity: isActive ? 1 : 0.7,
                    }}
                  >
                    <img
                      src={imgUrl}
                      alt={`${product.title} ${i + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Reviews Summary */}
          {product.reviewsCount > 0 && (
            <div className="card" style={{ marginTop: 12 }}>
              <div className="card-body" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', gap: 2 }}>
                  {[1,2,3,4,5].map(star => (
                    <i key={star} className={`ti ti-star${Number(product.reviewsAvgRating) >= star ? '-filled' : ''}`}
                      style={{ color: Number(product.reviewsAvgRating) >= star ? '#f59e0b' : '#d1d5db', fontSize: 18 }} />
                  ))}
                </div>
                <span style={{ fontWeight: 600 }}>{Number(product.reviewsAvgRating).toFixed(1)}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>({product.reviewsCount} reviews)</span>
              </div>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          <div className="card">
            <div className="card-body">
              {/* Vendor & Type Badges */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                {product.vendor && (
                  <span className="badge" style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}>{product.vendor}</span>
                )}
                {product.productType && (
                  <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>{product.productType}</span>
                )}
                {product.status && product.status !== 'ACTIVE' && (
                  <span className="badge" style={{ background: '#fee2e2', color: '#991b1b' }}>{product.status}</span>
                )}
              </div>

              {/* Title */}
              <h3 style={{ fontWeight: 700, marginBottom: 8 }}>{product.title}</h3>

              {/* SKU + Barcode */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                {selectedVariant?.sku && (
                  <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                    <i className="ti ti-barcode" style={{ marginRight: 4 }}></i>SKU: {selectedVariant.sku}
                  </span>
                )}
                {selectedVariant?.barcode && (
                  <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                    <i className="ti ti-scan" style={{ marginRight: 4 }}></i>Barcode: {selectedVariant.barcode}
                  </span>
                )}
              </div>

              {/* Pricing */}
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <h2 style={{ color: 'var(--accent)', marginBottom: 0 }}>{formatCurrency(unitPrice)}</h2>
                  {hasDiscount && (
                    <>
                      <span style={{ color: 'var(--text-secondary)', textDecoration: 'line-through', fontSize: '1.1rem' }}>
                        {formatCurrency(listPrice)}
                      </span>
                      <span className="badge" style={{ background: 'var(--green)', color: '#fff', fontSize: '0.9rem' }}>-{discountPercent}%</span>
                    </>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="badge" style={{ background: 'var(--green)', color: '#fff' }}>
                    <i className="ti ti-building-store" style={{ marginRight: 4 }}></i>B2B Price
                  </span>
                  {hasDiscount && (
                    <span style={{ color: 'var(--green)', fontSize: 13 }}>
                      You save {formatCurrency(listPrice - unitPrice)} per unit
                    </span>
                  )}
                </div>
              </div>

              {/* Options / Variant Selector — Enhanced */}
              {product.variants && product.variants.length > 1 && (
                <div style={{ marginBottom: 20 }}>
                  {options.length > 0 ? (
                    options.map((option: any, oi: number) => (
                      <div key={oi} style={{ marginBottom: 12 }}>
                        <label style={{ fontWeight: 600, display: 'block', marginBottom: 6, fontSize: 13 }}>{option.name}</label>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {option.values?.map((val: string, vi: number) => {
                            const optionKey = `option${oi + 1}` as 'option1' | 'option2' | 'option3';
                            const isSelected = selectedVariant?.[optionKey] === val;
                            return (
                              <button
                                key={vi}
                                onClick={() => {
                                  // Find variant with this option value
                                  const variant = product.variants.find((v: any) => v[optionKey] === val);
                                  if (variant) setSelectedVariant(variant);
                                }}
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: 8,
                                  border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                                  background: isSelected ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : '#fff',
                                  color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                                  fontWeight: isSelected ? 600 : 400,
                                  fontSize: 13,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s',
                                }}
                              >
                                {val}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div>
                      <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Select Variant</label>
                      <select
                        className="form-input"
                        value={selectedVariant?.id || ''}
                        onChange={(e) => {
                          const variant = product.variants?.find((v: any) => v.id === e.target.value);
                          if (variant) setSelectedVariant(variant);
                        }}
                      >
                        {product.variants.map((variant: any) => (
                          <option key={variant.id} value={variant.id}>
                            {variant.title} - {formatCurrency(variant.price)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Quantity */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Quantity</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', maxWidth: 150 }}>
                    <button
                      className="btn-apple btn-apple-secondary"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      style={{ borderRadius: '8px 0 0 8px' }}
                    >
                      <i className="ti ti-minus"></i>
                    </button>
                    <input
                      type="number"
                      className="form-input"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      min="1"
                      style={{ textAlign: 'center', borderRadius: 0 }}
                    />
                    <button
                      className="btn-apple btn-apple-secondary"
                      onClick={() => setQuantity(quantity + 1)}
                      style={{ borderRadius: '0 8px 8px 0' }}
                    >
                      <i className="ti ti-plus"></i>
                    </button>
                  </div>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Total: <strong style={{ color: 'var(--accent)' }}>{formatCurrency(unitPrice * quantity)}</strong>
                  </span>
                </div>
                {savings > 0 && (
                  <p style={{ color: 'var(--green)', fontSize: 13, marginTop: 8, marginBottom: 0 }}>
                    <i className="ti ti-pig-money" style={{ marginRight: 4 }}></i>
                    You save {formatCurrency(savings)} with B2B pricing!
                  </p>
                )}
              </div>

              {/* Add to Cart */}
              <div style={{ display: 'grid', gap: 8 }}>
                <button
                  onClick={addToCart}
                  className="btn-apple btn-apple-primary"
                  style={addedToCart ? { background: 'var(--green)', fontSize: '1.1rem', padding: '12px 24px' } : { fontSize: '1.1rem', padding: '12px 24px' }}
                  disabled={adding || !isInStock}
                >
                  {adding ? (
                    <>
                      <span className="spinner-apple" style={{ width: 16, height: 16, marginRight: 8 }}></span>
                      Adding...
                    </>
                  ) : addedToCart ? (
                    <>
                      <i className="ti ti-check" style={{ marginRight: 8 }}></i>
                      Added to Cart!
                    </>
                  ) : !isInStock ? (
                    <>
                      <i className="ti ti-alert-circle" style={{ marginRight: 8 }}></i>
                      Out of Stock
                    </>
                  ) : (
                    <>
                      <i className="ti ti-shopping-cart-plus" style={{ marginRight: 8 }}></i>
                      Add to Cart
                    </>
                  )}
                </button>
                {addedToCart && (
                  <Link href="/cart" className="btn-apple btn-apple-secondary" style={{ textAlign: 'center' }}>
                    <i className="ti ti-shopping-cart" style={{ marginRight: 8 }}></i>
                    View Cart
                  </Link>
                )}
              </div>

              {/* Stock Status — Enhanced */}
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className={`ti ti-circle-${isInStock ? 'check' : 'x'}`} style={{ color: isInStock ? 'var(--green)' : 'var(--red)' }}></i>
                  <span style={{ color: isInStock ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>
                    {isInStock ? `In Stock (${stockCount} available)` : 'Out of Stock'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
                  {selectedVariant?.requiresShipping !== false && (
                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                      <i className="ti ti-truck" style={{ marginRight: 4 }}></i>Requires shipping
                    </span>
                  )}
                  {selectedVariant?.weight && (
                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                      <i className="ti ti-weight" style={{ marginRight: 4 }}></i>{selectedVariant.weight} {selectedVariant.weightUnit?.toLowerCase() || 'kg'}
                    </span>
                  )}
                  {selectedVariant?.taxable !== false && (
                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                      <i className="ti ti-receipt-tax" style={{ marginRight: 4 }}></i>Tax included
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Info Tabs — Description / Details / Collections */}
          <div className="card" style={{ marginTop: 20 }}>
            <div style={{ borderBottom: '1px solid var(--border)', display: 'flex' }}>
              {[
                { key: 'description', label: 'Description', icon: 'info-circle' },
                { key: 'details', label: 'Details', icon: 'list-details' },
                ...(collections.length > 0 ? [{ key: 'collections', label: 'Collections', icon: 'folders' }] : []),
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveInfoTab(tab.key as any)}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeInfoTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
                    color: activeInfoTab === tab.key ? 'var(--accent)' : 'var(--text-secondary)',
                    fontWeight: activeInfoTab === tab.key ? 600 : 400,
                    cursor: 'pointer',
                    fontSize: 13,
                    transition: 'all 0.15s',
                  }}
                >
                  <i className={`ti ti-${tab.icon}`} style={{ marginRight: 6 }}></i>{tab.label}
                </button>
              ))}
            </div>
            <div className="card-body">
              {activeInfoTab === 'description' && (
                <div>
                  {product.descriptionHtml ? (
                    <div
                      style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}
                      dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
                    />
                  ) : product.description ? (
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{product.description}</p>
                  ) : (
                    <p style={{ color: 'var(--text-secondary)' }}>No description available.</p>
                  )}
                </div>
              )}

              {activeInfoTab === 'details' && (
                <div style={{ display: 'grid', gap: 8 }}>
                  {product.vendor && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Vendor</span>
                      <span style={{ fontWeight: 500 }}>{product.vendor}</span>
                    </div>
                  )}
                  {product.productType && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Product Type</span>
                      <span style={{ fontWeight: 500 }}>{product.productType}</span>
                    </div>
                  )}
                  {selectedVariant?.weight && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Weight</span>
                      <span style={{ fontWeight: 500 }}>{selectedVariant.weight} {selectedVariant.weightUnit?.toLowerCase() || 'kg'}</span>
                    </div>
                  )}
                  {selectedVariant?.sku && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>SKU</span>
                      <span style={{ fontWeight: 500 }}>{selectedVariant.sku}</span>
                    </div>
                  )}
                  {selectedVariant?.barcode && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Barcode</span>
                      <span style={{ fontWeight: 500 }}>{selectedVariant.barcode}</span>
                    </div>
                  )}
                  {product.totalInventory != null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Total Inventory</span>
                      <span style={{ fontWeight: 500 }}>{product.totalInventory} units</span>
                    </div>
                  )}
                  {/* Metafields */}
                  {metafields.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <h6 style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>
                        <i className="ti ti-database" style={{ marginRight: 6 }}></i>Additional Info
                      </h6>
                      {metafields.filter((mf: any) => mf.value && mf.value !== '[]' && mf.value !== '{}').slice(0, 10).map((mf: any, i: number) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{mf.namespace}.{mf.key}</span>
                          <span style={{ fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {typeof mf.value === 'string' && mf.value.length > 50 ? mf.value.slice(0, 50) + '...' : mf.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeInfoTab === 'collections' && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {collections.map((col: any, i: number) => (
                    <span
                      key={i}
                      className="badge"
                      style={{
                        background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                        color: 'var(--accent)',
                        padding: '6px 12px',
                        borderRadius: 8,
                        fontSize: 13,
                      }}
                    >
                      <i className="ti ti-folder" style={{ marginRight: 6 }}></i>{col.title || col.handle}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="card" style={{ marginTop: 12 }}>
              <div className="card-body" style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                  <i className="ti ti-tags" style={{ color: 'var(--text-secondary)', marginRight: 4 }}></i>
                  {(typeof product.tags === 'string' ? product.tags.split(',') : product.tags).map((tag: string, i: number) => (
                    <span key={i} className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontSize: 11 }}>{tag.trim()}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SEO Info (visible to admins or for debugging) */}
          {(product.seoTitle || product.seoDescription) && (
            <div className="card" style={{ marginTop: 12, opacity: 0.7 }}>
              <div className="card-body" style={{ padding: '12px 16px' }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>SEO</span>
                {product.seoTitle && <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{product.seoTitle}</p>}
                {product.seoDescription && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 0 }}>{product.seoDescription}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
