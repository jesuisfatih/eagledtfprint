'use client';

import { PageHeader, showToast } from '@/components/ui';
import { adminFetch } from '@/lib/api-client';
import { useCallback, useEffect, useState } from 'react';

interface Product {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  productType: string;
  status: string;
  images: { src?: string; url?: string }[];
  tags: string;
  totalInventory: number;
  reviewsAvgRating: number | null;
  reviewsCount: number | null;
  hasOnlyDefaultVariant: boolean;
  onlineStoreUrl: string | null;
  collections: any[];
  metafields: any;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  variants: {
    id: string;
    title: string;
    price: string;
    compareAtPrice: string | null;
    sku: string;
    barcode: string | null;
    inventoryQuantity: number;
    availableForSale: boolean;
    weight: number | null;
    weightUnit: string | null;
    option1: string | null;
    option2: string | null;
    option3: string | null;
    imageUrl: string | null;
  }[];
  shopifyProductId?: string;
  _count?: { variants: number };
}

interface Filters {
  vendors: { name: string; count: number }[];
  productTypes: { name: string; count: number }[];
  statusCounts: { status: string; count: number }[];
  inventoryStats: { total: number; inStock: number; outOfStock: number };
}

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [filters, setFilters] = useState<Filters | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: '100' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (vendorFilter) params.set('vendor', vendorFilter);

      const [res, filtersRes] = await Promise.all([
        adminFetch(`/api/v1/catalog/products?${params}`),
        adminFetch('/api/v1/catalog/products/filters'),
      ]);

      const data = await res.json();
      setProducts(Array.isArray(data) ? data : data.products || data.data || []);

      if (filtersRes.ok) {
        setFilters(await filtersRes.json());
      }
    } catch { setProducts([]); }
    finally { setLoading(false); }
  }, [search, statusFilter, vendorFilter]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const syncProducts = async () => {
    setSyncing(true);
    try {
      await adminFetch('/api/v1/sync/products', { method: 'POST' });
      showToast('Product sync started!', 'success');
      setTimeout(loadProducts, 3000);
    } catch { showToast('Sync failed', 'danger'); }
    finally { setSyncing(false); }
  };

  const getImgSrc = (p: Product) => p.images?.[0]?.url || p.images?.[0]?.src || null;
  const fmt = (n: any) => `$${Number(n || 0).toFixed(2)}`;

  return (
    <div>
      <PageHeader title="Product Catalog" subtitle={`${products.length} products`}
        actions={[
          { label: syncing ? 'Syncing...' : 'Sync Products', icon: 'refresh', variant: 'primary', onClick: syncProducts, disabled: syncing },
        ]} />

      {/* Inventory Stats Row */}
      {filters && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #af52de14, #af52de04)' }}>
            <div className="stat-icon" style={{ background: '#af52de20', color: '#af52de' }}><i className="ti ti-package" /></div>
            <div className="stat-label">Total</div>
            <div className="stat-value">{filters.inventoryStats.total}</div>
          </div>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #34c75914, #34c75904)' }}>
            <div className="stat-icon" style={{ background: '#34c75920', color: '#34c759' }}><i className="ti ti-check" /></div>
            <div className="stat-label">In Stock</div>
            <div className="stat-value">{filters.inventoryStats.inStock}</div>
          </div>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #ff3b3014, #ff3b3004)' }}>
            <div className="stat-icon" style={{ background: '#ff3b3020', color: '#ff3b30' }}><i className="ti ti-alert-circle" /></div>
            <div className="stat-label">Out of Stock</div>
            <div className="stat-value">{filters.inventoryStats.outOfStock}</div>
          </div>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #007aff14, #007aff04)' }}>
            <div className="stat-icon" style={{ background: '#007aff20', color: '#007aff' }}><i className="ti ti-category" /></div>
            <div className="stat-label">Vendors</div>
            <div className="stat-value">{filters.vendors.length}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="input-apple" style={{ flex: '1 1 280px', maxWidth: 360 }}>
          <i className="ti ti-search input-icon" />
          <input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {filters?.statusCounts && (
          <select className="input-apple-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'var(--bg-primary)', fontSize: 13 }}>
            <option value="">All Status</option>
            {filters.statusCounts.map(s => (
              <option key={s.status} value={s.status}>{s.status} ({s.count})</option>
            ))}
          </select>
        )}
        {filters?.vendors && filters.vendors.length > 0 && (
          <select className="input-apple-select" value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'var(--bg-primary)', fontSize: 13 }}>
            <option value="">All Vendors</option>
            {filters.vendors.map(v => (
              <option key={v.name} value={v.name}>{v.name} ({v.count})</option>
            ))}
          </select>
        )}
        <span style={{ fontSize: 13, color: 'var(--text-tertiary)', alignSelf: 'center' }}>{products.length} products</span>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="apple-card" style={{ padding: 16 }}>
              <div className="skeleton" style={{ height: 160, marginBottom: 12, borderRadius: 8 }} />
              <div className="skeleton" style={{ height: 16, width: '80%', marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 14, width: '50%' }} />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state" style={{ padding: 64 }}>
          <div className="empty-state-icon"><i className="ti ti-package" /></div>
          <h4 className="empty-state-title">No products found</h4>
          <p className="empty-state-desc">Sync products from Shopify to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {products.map(product => (
            <div key={product.id} className="apple-card" style={{ cursor: 'pointer', overflow: 'hidden', transition: 'transform 0.15s, box-shadow 0.15s' }}
              onClick={() => {
                // Load full detail on click
                adminFetch(`/api/v1/catalog/products/${product.id}`).then(r => r.json()).then(full => setSelected(full)).catch(() => setSelected(product));
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
            >
              <div style={{
                height: 160, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderBottom: '1px solid var(--border-light)', position: 'relative',
              }}>
                {getImgSrc(product) ? (
                  <img src={getImgSrc(product)!} alt={product.title} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                ) : (
                  <i className="ti ti-photo-off" style={{ fontSize: 32, color: 'var(--text-quaternary)' }} />
                )}
                {/* Stock indicator */}
                {product.totalInventory !== undefined && (
                  <span style={{
                    position: 'absolute', top: 8, right: 8, padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    background: product.totalInventory > 0 ? 'rgba(52,199,89,0.9)' : 'rgba(255,59,48,0.9)',
                    color: '#fff',
                  }}>
                    {product.totalInventory > 0 ? `${product.totalInventory} in stock` : 'Out of stock'}
                  </span>
                )}
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {product.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6 }}>{product.vendor}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                      {fmt(product.variants?.[0]?.price)}
                    </span>
                    {product.variants?.[0]?.compareAtPrice && Number(product.variants[0].compareAtPrice) > Number(product.variants[0].price) && (
                      <span style={{ textDecoration: 'line-through', color: 'var(--text-tertiary)', fontSize: 12, marginLeft: 6 }}>
                        {fmt(product.variants[0].compareAtPrice)}
                      </span>
                    )}
                  </div>
                  <span className={`badge-apple ${product.status === 'active' ? 'success' : 'secondary'}`}>
                    {product.status}
                  </span>
                </div>
                {/* Reviews */}
                {product.reviewsAvgRating != null && product.reviewsAvgRating > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#ff9500' }}>
                    <i className="ti ti-star-filled" />
                    <span>{Number(product.reviewsAvgRating).toFixed(1)}</span>
                    {product.reviewsCount != null && (
                      <span style={{ color: 'var(--text-tertiary)' }}>({product.reviewsCount})</span>
                    )}
                  </div>
                )}
                {/* Variants count */}
                {(product._count?.variants || 0) > 1 && (
                  <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {product._count?.variants} variants
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product Detail Modal */}
      {selected && (
        <div className="apple-modal-overlay" onClick={() => setSelected(null)}>
          <div className="apple-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640, maxHeight: '85vh', overflow: 'auto' }}>
            <div className="apple-modal-header">
              <h3 className="apple-modal-title">{selected.title}</h3>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-secondary)' }}>
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="apple-modal-body">
              {/* Image gallery */}
              {selected.images?.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' }}>
                  {selected.images.slice(0, 5).map((img, i) => (
                    <img key={i} src={img.url || img.src || ''} alt={`${selected.title} ${i + 1}`}
                      style={{ height: 120, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border-light)' }} />
                  ))}
                </div>
              )}

              {/* Quick stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Inventory</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: (selected.totalInventory || 0) > 0 ? '#34c759' : '#ff3b30' }}>
                    {selected.totalInventory ?? '—'}
                  </div>
                </div>
                <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Variants</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{selected.variants?.length || 0}</div>
                </div>
                <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Rating</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#ff9500' }}>
                    {selected.reviewsAvgRating ? `${Number(selected.reviewsAvgRating).toFixed(1)} ★` : '—'}
                  </div>
                </div>
              </div>

              {/* Details table */}
              <table className="apple-table" style={{ fontSize: 13,  marginBottom: 16 }}>
                <tbody>
                  <tr><td style={{ fontWeight: 500, width: 120 }}>Vendor</td><td>{selected.vendor || '—'}</td></tr>
                  <tr><td style={{ fontWeight: 500 }}>Type</td><td>{selected.productType || '—'}</td></tr>
                  <tr><td style={{ fontWeight: 500 }}>Status</td><td><span className={`badge-apple ${selected.status === 'active' ? 'success' : 'secondary'}`}>{selected.status}</span></td></tr>
                  <tr><td style={{ fontWeight: 500 }}>Handle</td><td><code style={{ fontSize: 12 }}>{selected.handle}</code></td></tr>
                  {selected.tags && <tr><td style={{ fontWeight: 500 }}>Tags</td><td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(typeof selected.tags === 'string' ? selected.tags.split(',') : []).map((t, i) => (
                        <span key={i} style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                          {t.trim()}
                        </span>
                      ))}
                    </div>
                  </td></tr>}
                  {selected.publishedAt && <tr><td style={{ fontWeight: 500 }}>Published</td><td>{new Date(selected.publishedAt).toLocaleDateString()}</td></tr>}
                </tbody>
              </table>

              {/* Variants */}
              {selected.variants && selected.variants.length > 0 && (
                <>
                  <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Variants ({selected.variants.length})</h4>
                  <div style={{ maxHeight: 200, overflow: 'auto', marginBottom: 16 }}>
                    <table className="apple-table" style={{ fontSize: 12 }}>
                      <thead><tr><th>Variant</th><th>SKU</th><th>Price</th><th>Stock</th><th>Available</th></tr></thead>
                      <tbody>
                        {selected.variants.map((v, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 500 }}>{v.title || v.option1 || 'Default'}</td>
                            <td><code>{v.sku || '—'}</code></td>
                            <td>
                              {fmt(v.price)}
                              {v.compareAtPrice && Number(v.compareAtPrice) > Number(v.price) && (
                                <span style={{ textDecoration: 'line-through', color: 'var(--text-tertiary)', marginLeft: 4 }}>{fmt(v.compareAtPrice)}</span>
                              )}
                            </td>
                            <td style={{ color: (v.inventoryQuantity || 0) > 0 ? '#34c759' : '#ff3b30', fontWeight: 600 }}>
                              {v.inventoryQuantity ?? '—'}
                            </td>
                            <td>{v.availableForSale ? <i className="ti ti-check" style={{ color: '#34c759' }} /> : <i className="ti ti-x" style={{ color: '#ff3b30' }} />}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Collections */}
              {selected.collections && Array.isArray(selected.collections) && selected.collections.length > 0 && (
                <>
                  <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Collections</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                    {selected.collections.map((c: any, i: number) => (
                      <span key={i} style={{
                        padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                        background: 'rgba(0,122,255,0.08)', color: '#007aff',
                      }}>{c.title || c.handle}</span>
                    ))}
                  </div>
                </>
              )}

              {/* SEO */}
              {(selected.seoTitle || selected.seoDescription) && (
                <>
                  <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>SEO</h4>
                  <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                    {selected.seoTitle && <div style={{ fontWeight: 600, marginBottom: 4, color: '#1a0dab' }}>{selected.seoTitle}</div>}
                    {selected.onlineStoreUrl && <div style={{ fontSize: 12, color: '#006621', marginBottom: 4 }}>{selected.onlineStoreUrl}</div>}
                    {selected.seoDescription && <div style={{ color: 'var(--text-secondary)' }}>{selected.seoDescription}</div>}
                  </div>
                </>
              )}
            </div>
            <div className="apple-modal-footer">
              {selected.onlineStoreUrl && (
                <a href={selected.onlineStoreUrl} target="_blank" rel="noopener noreferrer" className="btn-apple secondary" style={{ textDecoration: 'none' }}>
                  <i className="ti ti-world" style={{ marginRight: 4 }} />Live Store
                </a>
              )}
              {selected.shopifyProductId && (
                <a href={`https://admin.shopify.com/store/eagledtfsupply/products/${selected.shopifyProductId}`}
                  target="_blank" rel="noopener noreferrer" className="btn-apple secondary" style={{ textDecoration: 'none' }}>
                  <i className="ti ti-external-link" style={{ marginRight: 4 }} />Shopify Admin
                </a>
              )}
              <button className="btn-apple primary" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
