'use client';

import Modal from '@/components/Modal';
import { PageHeader, showToast, StatsCard, Tabs } from '@/components/ui';
import { adminFetch } from '@/lib/api-client';
import { useCallback, useEffect, useRef, useState } from 'react';

interface CatalogProduct {
  id: string;
  title: string;
  handle: string;
  featuredImageUrl?: string;
  status: string;
  variants?: { id: string; title: string; price: string; sku?: string }[];
}

/* ─── Interfaces ─── */
interface PricingRule {
  id: string;
  name: string;
  description?: string;
  targetType: string;
  targetCompanyId?: string;
  targetCompanyUserId?: string;
  targetCompanyGroup?: string;
  targetCompany?: { id: string; name: string };
  targetCompanyUser?: { id: string; email: string; firstName?: string; lastName?: string };
  scopeType: string;
  scopeProductIds?: string[];
  scopeCollectionIds?: string[];
  scopeTags?: string;
  scopeVariantIds?: string[];
  discountType: string;
  discountValue?: number;
  discountPercentage?: number;
  qtyBreaks?: any[];
  minCartAmount?: number;
  priority: number;
  isActive: boolean;
  validFrom?: string;
  validUntil?: string;
  createdAt: string;
  updatedAt: string;
}

interface Company {
  id: string;
  name: string;
  email?: string;
  status: string;
  users?: CompanyUser[];
}

interface CompanyUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
}

interface CompanyIntel {
  id: string;
  companyId: string;
  company: { name: string; email?: string; status: string };
  engagementScore: number;
  buyerIntent: string;
  segment: string;
  totalVisitors: number;
  totalSessions: number;
  totalPageViews: number;
  totalProductViews: number;
  totalAddToCarts: number;
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  churnRisk: number;
  upsellPotential: number;
  suggestedDiscount?: number;
  daysSinceLastOrder?: number;
  lastActiveAt?: string;
}

/* ─── Badge components ─── */
function TargetBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; color: string; icon: string }> = {
    all: { label: 'All Companies', color: '#8e8e93', icon: 'ti-world' },
    company: { label: 'Company', color: '#007aff', icon: 'ti-building' },
    company_user: { label: 'User', color: '#5856d6', icon: 'ti-user' },
    company_group: { label: 'Group', color: '#ff9500', icon: 'ti-users-group' },
    segment: { label: 'Segment', color: '#34c759', icon: 'ti-chart-pie' },
    buyer_intent: { label: 'Intent', color: '#ff2d55', icon: 'ti-flame' },
  };
  const t = map[type] || map.all;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: `${t.color}18`, color: t.color }}>
      <i className={`ti ${t.icon}`} style={{ fontSize: 12 }} /> {t.label}
    </span>
  );
}

function DiscountBadge({ type, value, percentage }: { type: string; value?: number; percentage?: number }) {
  if (type === 'percentage') return <span className="badge-apple info">{percentage || value}% off</span>;
  if (type === 'fixed_amount') return <span className="badge-apple warning">${value} off</span>;
  if (type === 'fixed_price') return <span className="badge-apple" style={{ background: '#5856d618', color: '#5856d6' }}>${value}</span>;
  if (type === 'qty_break') return <span className="badge-apple success">Qty Breaks</span>;
  return <span className="badge-apple">{type}</span>;
}

function ScopeBadge({ type, tags }: { type: string; tags?: string }) {
  const map: Record<string, string> = { all: '🌐 All products', products: '📦 Products', collections: '📁 Collections', tags: '🏷️ Tags', variants: '🔢 Variants' };
  return <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{map[type] || type}{tags ? `: ${tags}` : ''}</span>;
}

/* ─── Main Page ─── */
export default function PricingPage() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyIntel, setCompanyIntel] = useState<CompanyIntel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTarget, setFilterTarget] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editRule, setEditRule] = useState<PricingRule | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; rule: PricingRule | null }>({ show: false, rule: null });
  const [activeTab, setActiveTab] = useState('rules');
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    name: '', description: '', targetType: 'all', targetCompanyId: '', targetCompanyUserId: '', targetCompanyGroup: '',
    scopeType: 'all', scopeTags: '', scopeProductIds: [] as string[], discountType: 'percentage', discountValue: 0, discountPercentage: 10,
    qtyBreaks: [] as { minQty: number; discountPct: number }[],
    minCartAmount: 0, priority: 0, isActive: true, validFrom: '', validUntil: '',
  };
  const [form, setForm] = useState(emptyForm);

  // Product picker state
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<CatalogProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<CatalogProduct[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const searchTimeout = useRef<any>(null);

  const searchProducts = useCallback(async (q: string) => {
    if (!q || q.length < 2) { setProductResults([]); return; }
    setSearchingProducts(true);
    try {
      const res = await adminFetch(`/api/v1/catalog/products?search=${encodeURIComponent(q)}&limit=10`);
      if (res.ok) { const d = await res.json(); setProductResults(Array.isArray(d) ? d : d.products || d.data || []); }
    } catch { /* silent */ }
    setSearchingProducts(false);
  }, []);

  const handleProductSearch = (val: string) => {
    setProductSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchProducts(val), 300);
  };

  const addProduct = (p: CatalogProduct) => {
    if (!selectedProducts.find(sp => sp.id === p.id)) {
      setSelectedProducts(prev => [...prev, p]);
      setForm(prev => ({ ...prev, scopeProductIds: [...prev.scopeProductIds, p.id] }));
    }
    setProductSearch('');
    setProductResults([]);
  };

  const removeProduct = (id: string) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== id));
    setForm(prev => ({ ...prev, scopeProductIds: prev.scopeProductIds.filter(pid => pid !== id) }));
  };

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/v1/pricing/rules');
      if (res.ok) { const d = await res.json(); setRules(Array.isArray(d) ? d : d.rules || d.data || []); }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  const loadCompanies = useCallback(async () => {
    try {
      const res = await adminFetch('/api/v1/companies');
      if (res.ok) { const d = await res.json(); setCompanies(Array.isArray(d) ? d : d.companies || d.data || []); }
    } catch { /* silent */ }
  }, []);

  const loadIntel = useCallback(async () => {
    try {
      const res = await adminFetch('/api/v1/fingerprint/company-intelligence');
      if (res.ok) { const d = await res.json(); setCompanyIntel(Array.isArray(d) ? d : []); }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadRules(); loadCompanies(); loadIntel(); }, [loadRules, loadCompanies, loadIntel]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload: any = {
      name: form.name,
      description: form.description || undefined,
      targetType: form.targetType,
      scopeType: form.scopeType,
      scopeTags: form.scopeTags || undefined,
      scopeProductIds: form.scopeProductIds.length > 0 ? form.scopeProductIds : undefined,
      qtyBreaks: form.qtyBreaks.length > 0 ? form.qtyBreaks : undefined,
      discountType: form.discountType,
      priority: form.priority,
      isActive: form.isActive,
    };

    if (form.targetCompanyId) payload.targetCompanyId = form.targetCompanyId;
    if (form.targetCompanyUserId) payload.targetCompanyUserId = form.targetCompanyUserId;
    if (form.targetCompanyGroup) payload.targetCompanyGroup = form.targetCompanyGroup;

    if (form.discountType === 'percentage') {
      payload.discountPercentage = form.discountPercentage;
    } else {
      payload.discountValue = form.discountValue;
    }
    if (form.minCartAmount) payload.minCartAmount = form.minCartAmount;
    if (form.validFrom) payload.validFrom = form.validFrom;
    if (form.validUntil) payload.validUntil = form.validUntil;

    try {
      const url = editRule ? `/api/v1/pricing/rules/${editRule.id}` : '/api/v1/pricing/rules';
      const method = editRule ? 'PUT' : 'POST';
      const res = await adminFetch(url, { method, body: JSON.stringify(payload) });
      if (res.ok) { showToast(editRule ? 'Rule updated!' : 'Rule created!', 'success'); setShowCreate(false); setEditRule(null); setForm(emptyForm); loadRules(); }
      else showToast('Failed to save rule', 'danger');
    } catch { showToast('Error', 'danger'); }
    finally { setSaving(false); }
  };

  const deleteRule = async (rule: PricingRule) => {
    setDeleteModal({ show: false, rule: null });
    try {
      const res = await adminFetch(`/api/v1/pricing/rules/${rule.id}`, { method: 'DELETE' });
      if (res.ok) { showToast('Rule deleted', 'success'); loadRules(); }
      else showToast('Failed', 'danger');
    } catch { showToast('Error', 'danger'); }
  };

  const toggleActive = async (rule: PricingRule) => {
    try {
      const res = await adminFetch(`/api/v1/pricing/rules/${rule.id}/toggle`, { method: 'PUT', body: JSON.stringify({ isActive: !rule.isActive }) });
      if (res.ok) loadRules();
    } catch { /* silent */ }
  };

  const openEdit = (rule: PricingRule) => {
    setForm({
      name: rule.name, description: rule.description || '', targetType: rule.targetType,
      targetCompanyId: rule.targetCompanyId || '', targetCompanyUserId: rule.targetCompanyUserId || '',
      targetCompanyGroup: rule.targetCompanyGroup || '', scopeType: rule.scopeType,
      scopeTags: rule.scopeTags || '', scopeProductIds: (rule.scopeProductIds || []).map(String),
      discountType: rule.discountType,
      discountValue: Number(rule.discountValue || 0), discountPercentage: Number(rule.discountPercentage || 0),
      qtyBreaks: Array.isArray(rule.qtyBreaks) ? rule.qtyBreaks : [],
      minCartAmount: Number(rule.minCartAmount || 0), priority: rule.priority,
      isActive: rule.isActive, validFrom: rule.validFrom?.split('T')[0] || '', validUntil: rule.validUntil?.split('T')[0] || '',
    });
    setSelectedProducts([]);
    setEditRule(rule);
    setShowCreate(true);
  };

  const filtered = rules.filter(r => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterTarget && r.targetType !== filterTarget) return false;
    return true;
  });

  // Compute stats
  const activeCount = rules.filter(r => r.isActive).length;
  const companyRules = rules.filter(r => r.targetType === 'company').length;
  const userRules = rules.filter(r => r.targetType === 'company_user').length;
  const intelsWithDiscount = companyIntel.filter(i => i.suggestedDiscount && i.suggestedDiscount > 0);

  const selectedCompanyUsers = form.targetCompanyId
    ? companies.find(c => c.id === form.targetCompanyId)?.users || []
    : [];

  return (
    <div>
      <PageHeader title="Pricing & Marketing Intelligence" subtitle={`${rules.length} rules · ${companyIntel.length} company profiles`}
        actions={[
          { label: 'New Rule', icon: 'plus', variant: 'primary' as const, onClick: () => { setForm(emptyForm); setEditRule(null); setShowCreate(true); } },
          { label: 'Refresh', icon: 'refresh', variant: 'secondary' as const, onClick: () => { loadRules(); loadIntel(); } },
        ]} />

      {/* Stats */}
      <div className="stats-grid cols-5">
        <StatsCard title="TOTAL RULES" value={rules.length} icon="receipt" color="#007aff" meta={`${activeCount} active`} />
        <StatsCard title="COMPANY RULES" value={companyRules} icon="building" color="#5856d6" meta="Targeted pricing" />
        <StatsCard title="USER RULES" value={userRules} icon="user-check" color="#ff9500" meta="Individual pricing" />
        <StatsCard title="AI SUGGESTIONS" value={intelsWithDiscount.length} icon="sparkles" color="#34c759" meta="Auto-discount recommendations" />
        <StatsCard title="COMPANY PROFILES" value={companyIntel.length} icon="brain" color="#ff2d55" meta="Intelligence profiles" />
      </div>

      <Tabs tabs={[
        { id: 'rules', label: 'Pricing Rules', icon: 'receipt' },
        { id: 'intelligence', label: 'Company Intelligence', icon: 'brain' },
        { id: 'marketing', label: 'Marketing Insights', icon: 'sparkles' },
      ]} activeTab={activeTab} onChange={setActiveTab} />

      {/* ─── Tab: Pricing Rules ─── */}
      {activeTab === 'rules' && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, marginTop: 20 }}>
            <div className="input-apple" style={{ flex: 1, maxWidth: 360 }}>
              <i className="ti ti-search input-icon" />
              <input placeholder="Search rules..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="select-apple" style={{ width: 180 }} value={filterTarget} onChange={e => setFilterTarget(e.target.value)}>
              <option value="">All Targets</option>
              <option value="all">Global</option>
              <option value="company">Company</option>
              <option value="company_user">User</option>
              <option value="company_group">Group</option>
            </select>
          </div>

          <div className="apple-card">
            {loading ? (
              <div style={{ padding: 48, textAlign: 'center' }}><i className="ti ti-loader-2 spin" style={{ fontSize: 24, color: 'var(--accent-primary)' }} /></div>
            ) : filtered.length === 0 ? (
              <div className="empty-state" style={{ padding: 48 }}>
                <div className="empty-state-icon"><i className="ti ti-discount" /></div>
                <h4 className="empty-state-title">No pricing rules</h4>
                <p className="empty-state-desc">Create rules to offer custom pricing to companies and users.</p>
              </div>
            ) : (
              <table className="apple-table">
                <thead><tr>
                  <th>Rule Name</th>
                  <th>Target</th>
                  <th>Assigned To</th>
                  <th>Scope</th>
                  <th>Discount</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr></thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.name}</div>
                        {r.description && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{r.description}</div>}
                      </td>
                      <td><TargetBadge type={r.targetType} /></td>
                      <td style={{ fontSize: 12 }}>
                        {r.targetCompany?.name || r.targetCompanyUser?.email || r.targetCompanyGroup || 'Everyone'}
                        {r.targetCompanyUser && <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{r.targetCompanyUser.firstName} {r.targetCompanyUser.lastName}</div>}
                      </td>
                      <td><ScopeBadge type={r.scopeType} tags={r.scopeTags || undefined} /></td>
                      <td><DiscountBadge type={r.discountType} value={Number(r.discountValue)} percentage={Number(r.discountPercentage)} /></td>
                      <td><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.priority}</span></td>
                      <td>
                        <label className="apple-toggle">
                          <input type="checkbox" checked={r.isActive} onChange={() => toggleActive(r)} />
                          <span className="toggle-slider" />
                        </label>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn-apple secondary small" onClick={() => openEdit(r)} title="Edit">
                            <i className="ti ti-pencil" />
                          </button>
                          <button className="btn-apple danger small" onClick={() => setDeleteModal({ show: true, rule: r })} title="Delete">
                            <i className="ti ti-trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ─── Tab: Company Intelligence ─── */}
      {activeTab === 'intelligence' && (
        <div style={{ marginTop: 20 }}>
          {companyIntel.length === 0 ? (
            <div className="apple-card">
              <div className="empty-state" style={{ padding: 48 }}>
                <div className="empty-state-icon"><i className="ti ti-brain" /></div>
                <h4 className="empty-state-title">No Company Intelligence Data</h4>
                <p className="empty-state-desc">Company profiles are built automatically as visitors browse your store.</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
              {companyIntel.map(intel => (
                <CompanyIntCard key={intel.id} intel={intel} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: Marketing Insights ─── */}
      {activeTab === 'marketing' && (
        <div style={{ marginTop: 20 }}>
          {/* Quick Campaign Templates */}
          <div className="apple-card" style={{ marginBottom: 20 }}>
            <div className="apple-card-header">
              <h3 className="apple-card-title"><i className="ti ti-rocket" style={{ color: 'var(--accent-blue)', marginRight: 6 }} />Quick Campaign Templates</h3>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Click to pre-fill a new rule</span>
            </div>
            <div className="apple-card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>
              {[
                {
                  icon: 'ti-gift', color: '#34c759', title: 'First Order Discount',
                  desc: 'Welcome new companies with 10% off their first order',
                  preset: { name: 'New Customer Welcome — 10% Off', description: 'First order discount for new B2B customers', targetType: 'all', discountType: 'percentage', discountPercentage: 10, priority: 5 },
                },
                {
                  icon: 'ti-packages', color: '#007aff', title: 'Volume Discount',
                  desc: 'Quantity-based pricing tiers for bulk buyers',
                  preset: {
                    name: 'Volume Discount — Qty Breaks', description: 'Buy more, save more — quantity-based pricing', targetType: 'all', discountType: 'qty_break', priority: 3,
                    qtyBreaks: [{ minQty: 50, discountPct: 5 }, { minQty: 100, discountPct: 10 }, { minQty: 500, discountPct: 15 }],
                  },
                },
                {
                  icon: 'ti-truck', color: '#ff9500', title: 'Min Cart Reward',
                  desc: '$500+ orders get 5% off — boost average order value',
                  preset: { name: '$500+ Order — 5% Off', description: 'Minimum cart threshold discount', targetType: 'all', discountType: 'percentage', discountPercentage: 5, minCartAmount: 500, priority: 2 },
                },
                {
                  icon: 'ti-heart-handshake', color: '#ff2d55', title: 'Win-Back Campaign',
                  desc: 'Re-engage inactive companies with a limited-time offer',
                  preset: {
                    name: 'Win-Back — 15% Off (30 days)', description: 'Limited-time discount for inactive customers',
                    targetType: 'all', discountType: 'percentage', discountPercentage: 15, priority: 8,
                    validFrom: new Date().toISOString().split('T')[0],
                    validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
                  },
                },
              ].map(t => (
                <div key={t.title}
                  onClick={() => {
                    setForm({ ...emptyForm, ...t.preset } as any);
                    setEditRule(null);
                    setShowCreate(true);
                  }}
                  style={{
                    padding: 16, borderRadius: 12, cursor: 'pointer',
                    border: '1px solid var(--border-primary)', background: 'var(--bg-tertiary)',
                    transition: 'all 150ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: `${t.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className={`ti ${t.icon}`} style={{ fontSize: 17, color: t.color }} />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{t.title}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>{t.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Price List Export */}
          <div className="apple-card" style={{ marginBottom: 20, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#af52de14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="ti ti-file-spreadsheet" style={{ fontSize: 20, color: '#af52de' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Price List Export</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Export company-specific price lists with applied discounts</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select className="select-apple" style={{ fontSize: 12, padding: '5px 10px' }} id="export-company">
                  <option value="">All Companies</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button type="button" className="btn-apple secondary sm" onClick={async () => {
                  const companyId = (document.getElementById('export-company') as HTMLSelectElement)?.value;
                  try {
                    const url = companyId ? `/api/v1/pricing/rules?companyId=${companyId}` : '/api/v1/pricing/rules';
                    const res = await adminFetch(url);
                    if (!res.ok) { showToast('Export failed', 'danger'); return; }
                    const data = await res.json();
                    const rulesList = Array.isArray(data) ? data : data.rules || data.data || [];
                    const csvRows = ['Rule Name,Target,Scope,Discount Type,Discount Value,Min Cart,Priority,Status,Valid From,Valid Until'];
                    rulesList.forEach((r: any) => {
                      csvRows.push([
                        `"${r.name}"`, r.targetType, r.scopeType, r.discountType,
                        r.discountType === 'percentage' ? `${r.discountPercentage}%` : `$${r.discountValue || 0}`,
                        r.minCartAmount || 0, r.priority, r.isActive ? 'Active' : 'Inactive',
                        r.validFrom?.split('T')[0] || '', r.validUntil?.split('T')[0] || '',
                      ].join(','));
                    });
                    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `price-list-${companyId || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                    showToast('Price list exported!', 'success');
                  } catch { showToast('Export failed', 'danger'); }
                }}>
                  <i className="ti ti-download" style={{ fontSize: 14 }} /> Export CSV
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
            {/* At-Risk Companies */}
            <div className="apple-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ff3b3014', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="ti ti-alert-triangle" style={{ fontSize: 18, color: '#ff3b30' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>At-Risk Companies</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>High churn probability</div>
                </div>
              </div>
              {companyIntel.filter(i => i.churnRisk > 0.5).length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-tertiary)', fontSize: 13 }}>No at-risk companies 🎉</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {companyIntel.filter(i => i.churnRisk > 0.5).sort((a, b) => b.churnRisk - a.churnRisk).slice(0, 5).map(i => (
                    <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border-primary)' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{i.company.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                          {i.daysSinceLastOrder ? `${i.daysSinceLastOrder} days since last order` : 'No orders yet'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                          <div style={{ width: `${i.churnRisk * 100}%`, height: '100%', background: i.churnRisk > 0.7 ? '#ff3b30' : '#ff9500', borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: i.churnRisk > 0.7 ? '#ff3b30' : '#ff9500' }}>{(i.churnRisk * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upsell Opportunities */}
            <div className="apple-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#34c75914', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="ti ti-trending-up" style={{ fontSize: 18, color: '#34c759' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Upsell Opportunities</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>High potential for conversion</div>
                </div>
              </div>
              {companyIntel.filter(i => i.upsellPotential > 0.4).length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-tertiary)', fontSize: 13 }}>No upsell opportunities yet</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {companyIntel.filter(i => i.upsellPotential > 0.4).sort((a, b) => b.upsellPotential - a.upsellPotential).slice(0, 5).map(i => (
                    <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border-primary)' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{i.company.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{i.totalProductViews} views · {i.totalAddToCarts} carts · {i.totalOrders} orders</div>
                      </div>
                      <span className="badge-apple success" style={{ fontSize: 11 }}>{(i.upsellPotential * 100).toFixed(0)}% potential</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Discount Suggestions */}
            <div className="apple-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#5856d614', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="ti ti-sparkles" style={{ fontSize: 18, color: '#5856d6' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>AI Discount Suggestions</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Algorithm-recommended offers</div>
                </div>
              </div>
              {intelsWithDiscount.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-tertiary)', fontSize: 13 }}>No discount suggestions yet</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {intelsWithDiscount.slice(0, 5).map(i => (
                    <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border-primary)' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{i.company.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                          Segment: {i.segment} · Intent: {i.buyerIntent}
                        </div>
                      </div>
                      <span className="badge-apple warning" style={{ fontSize: 11, fontWeight: 700 }}>
                        Suggest {i.suggestedDiscount}% off
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Revenue by Segment */}
            <div className="apple-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#007aff14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="ti ti-chart-bar" style={{ fontSize: 18, color: '#007aff' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Segment Breakdown</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Company distribution by segment</div>
                </div>
              </div>
              {(() => {
                const segments: Record<string, number> = {};
                companyIntel.forEach(i => { segments[i.segment] = (segments[i.segment] || 0) + 1; });
                const segColors: Record<string, string> = { new: '#8e8e93', active: '#007aff', loyal: '#34c759', interested: '#ff9500', at_risk: '#ff3b30', churned: '#636366' };
                return Object.entries(segments).map(([seg, count]) => (
                  <div key={seg} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 4, background: segColors[seg] || '#8e8e93' }} />
                      <span style={{ fontSize: 13, fontWeight: 500, textTransform: 'capitalize' }}>{seg.replace('_', ' ')}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{count}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ─── Create/Edit Modal ─── */}
      {showCreate && (
        <div className="apple-modal-overlay" onClick={() => { setShowCreate(false); setEditRule(null); }}>
          <div className="apple-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '90vh', overflow: 'auto' }}>
            <div className="apple-modal-header">
              <h3 className="apple-modal-title">{editRule ? 'Edit Pricing Rule' : 'New Pricing Rule'}</h3>
            </div>
            <form onSubmit={handleSave}>
              <div className="apple-modal-body">
                {/* Name & Description */}
                <div style={{ marginBottom: 16 }}>
                  <label className="input-label">Rule Name *</label>
                  <div className="input-apple"><input placeholder="e.g. VIP 10% discount" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label className="input-label">Description</label>
                  <div className="input-apple"><input placeholder="Optional description..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
                </div>

                {/* Section: Target */}
                <div style={{ marginBottom: 20, padding: '16px', background: 'var(--bg-primary)', borderRadius: 12, border: '1px solid var(--border-primary)' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="ti ti-target" style={{ color: 'var(--accent-primary)' }} /> Who should this rule apply to?
                  </div>
                  <select className="select-apple" style={{ marginBottom: 12 }} value={form.targetType} onChange={e => setForm(p => ({ ...p, targetType: e.target.value, targetCompanyId: '', targetCompanyUserId: '', targetCompanyGroup: '' }))}>
                    <option value="all">🌐 All Companies</option>
                    <option value="company">🏢 Specific Company</option>
                    <option value="company_user">👤 Specific User</option>
                    <option value="company_group">👥 Company Group</option>
                  </select>

                  {form.targetType === 'company' && (
                    <select className="select-apple" value={form.targetCompanyId} onChange={e => setForm(p => ({ ...p, targetCompanyId: e.target.value, targetCompanyUserId: '' }))} required>
                      <option value="">Select a company...</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.status})</option>)}
                    </select>
                  )}

                  {form.targetType === 'company_user' && (
                    <>
                      <select className="select-apple" style={{ marginBottom: 8 }} value={form.targetCompanyId} onChange={e => setForm(p => ({ ...p, targetCompanyId: e.target.value, targetCompanyUserId: '' }))} required>
                        <option value="">Select company first...</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      {selectedCompanyUsers.length > 0 && (
                        <select className="select-apple" value={form.targetCompanyUserId} onChange={e => setForm(p => ({ ...p, targetCompanyUserId: e.target.value }))} required>
                          <option value="">Select user...</option>
                          {selectedCompanyUsers.map(u => <option key={u.id} value={u.id}>{u.email} ({u.firstName} {u.lastName})</option>)}
                        </select>
                      )}
                    </>
                  )}

                  {form.targetType === 'company_group' && (
                    <div className="input-apple">
                      <input placeholder="Enter company group name..." value={form.targetCompanyGroup} onChange={e => setForm(p => ({ ...p, targetCompanyGroup: e.target.value }))} required />
                    </div>
                  )}
                </div>

                {/* Section: Scope */}
                <div style={{ marginBottom: 20, padding: '16px', background: 'var(--bg-primary)', borderRadius: 12, border: '1px solid var(--border-primary)' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="ti ti-package" style={{ color: '#5856d6' }} /> What products does it apply to?
                  </div>
                  <select className="select-apple" style={{ marginBottom: 12 }} value={form.scopeType} onChange={e => setForm(p => ({ ...p, scopeType: e.target.value, scopeProductIds: [], scopeTags: '' }))}>
                    <option value="all">All Products</option>
                    <option value="tags">By Tags</option>
                    <option value="products">Specific Products</option>
                    <option value="collections">Collections</option>
                    <option value="variants">Specific Variants</option>
                  </select>

                  {form.scopeType === 'tags' && (
                    <div className="input-apple"><input placeholder="Comma-separated tags, e.g. DTF,wholesale" value={form.scopeTags} onChange={e => setForm(p => ({ ...p, scopeTags: e.target.value }))} /></div>
                  )}

                  {/* ── Product Picker ── */}
                  {(form.scopeType === 'products' || form.scopeType === 'variants') && (
                    <div>
                      {/* Search */}
                      <div style={{ position: 'relative', marginBottom: 10 }}>
                        <div className="input-apple" style={{ background: 'var(--bg-secondary)' }}>
                          <span className="input-icon"><i className="ti ti-search" /></span>
                          <input
                            placeholder="Search products by name, SKU..."
                            value={productSearch}
                            onChange={e => handleProductSearch(e.target.value)}
                          />
                          {searchingProducts && <span style={{ padding: '0 10px', color: 'var(--text-quaternary)', fontSize: 12 }}>Loading...</span>}
                        </div>
                        {/* Dropdown */}
                        {productResults.length > 0 && (
                          <div style={{
                            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
                            background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)',
                            borderRadius: 10, boxShadow: 'var(--shadow-lg)', maxHeight: 250, overflowY: 'auto', marginTop: 4,
                          }}>
                            {productResults.map(p => {
                              const alreadySelected = selectedProducts.some(sp => sp.id === p.id);
                              return (
                                <div
                                  key={p.id}
                                  onClick={() => !alreadySelected && addProduct(p)}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
                                    cursor: alreadySelected ? 'default' : 'pointer', opacity: alreadySelected ? 0.5 : 1,
                                    borderBottom: '1px solid var(--border-secondary)',
                                    transition: 'background 100ms',
                                  }}
                                  onMouseEnter={e => { if (!alreadySelected) (e.currentTarget.style.background = 'var(--bg-hover)'); }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                >
                                  {p.featuredImageUrl ? (
                                    <img src={p.featuredImageUrl} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />
                                  ) : (
                                    <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <i className="ti ti-package" style={{ fontSize: 14, color: 'var(--text-quaternary)' }} />
                                    </div>
                                  )}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                                    {p.variants?.[0]?.sku && <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>SKU: {p.variants[0].sku}</div>}
                                  </div>
                                  {alreadySelected && <i className="ti ti-check" style={{ color: 'var(--accent-green)', fontSize: 16 }} />}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Selected chips */}
                      {selectedProducts.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {selectedProducts.map(p => (
                            <span key={p.id} style={{
                              display: 'inline-flex', alignItems: 'center', gap: 6,
                              padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                              background: 'var(--accent-blue-soft)', color: 'var(--accent-blue)',
                              border: '1px solid rgba(0,122,255,0.15)',
                            }}>
                              {p.title}
                              <i className="ti ti-x" style={{ fontSize: 12, cursor: 'pointer', opacity: 0.7 }} onClick={() => removeProduct(p.id)} />
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Count hint */}
                      {form.scopeProductIds.length > 0 && selectedProducts.length === 0 && (
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                          <i className="ti ti-info-circle" style={{ fontSize: 12 }} /> {form.scopeProductIds.length} product(s) linked to this rule
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Section: Discount */}
                <div style={{ marginBottom: 20, padding: '16px', background: 'var(--bg-primary)', borderRadius: 12, border: '1px solid var(--border-primary)' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="ti ti-discount" style={{ color: '#ff9500' }} /> Discount configuration
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label className="input-label">Discount Type</label>
                      <select className="select-apple" value={form.discountType} onChange={e => setForm(p => ({ ...p, discountType: e.target.value }))}>
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed_amount">Fixed Amount ($)</option>
                        <option value="fixed_price">Fixed Price</option>
                        <option value="qty_break">Quantity Breaks</option>
                      </select>
                    </div>
                    {form.discountType !== 'qty_break' && (
                      <div>
                        <label className="input-label">{form.discountType === 'percentage' ? 'Percentage' : 'Amount ($)'}</label>
                        <div className="input-apple">
                          <input type="number" min={0} max={form.discountType === 'percentage' ? 100 : undefined} step="0.01"
                            value={form.discountType === 'percentage' ? form.discountPercentage : form.discountValue}
                            onChange={e => {
                              const val = +e.target.value;
                              if (form.discountType === 'percentage') setForm(p => ({ ...p, discountPercentage: val }));
                              else setForm(p => ({ ...p, discountValue: val }));
                            }} required />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quantity Breaks Builder */}
                  {form.discountType === 'qty_break' && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <label className="input-label" style={{ margin: 0 }}>Quantity Tiers</label>
                        <button type="button" className="btn-apple sm primary" onClick={() => setForm(p => ({
                          ...p, qtyBreaks: [...p.qtyBreaks, { minQty: (p.qtyBreaks.length > 0 ? p.qtyBreaks[p.qtyBreaks.length - 1].minQty * 2 : 10), discountPct: (p.qtyBreaks.length + 1) * 5 }]
                        }))}>
                          <i className="ti ti-plus" style={{ fontSize: 13 }} /> Add Tier
                        </button>
                      </div>
                      {form.qtyBreaks.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-tertiary)', fontSize: 12, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px dashed var(--border-primary)' }}>
                          Click "Add Tier" to create quantity-based pricing tiers
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {form.qtyBreaks.map((qb, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-primary)' }}>
                              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, minWidth: 50 }}>Tier {i + 1}</span>
                              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Min qty:</span>
                                <div className="input-apple" style={{ flex: 1 }}>
                                  <input type="number" min={1} value={qb.minQty} style={{ padding: '5px 8px', fontSize: 13 }}
                                    onChange={e => { const breaks = [...form.qtyBreaks]; breaks[i] = { ...breaks[i], minQty: +e.target.value }; setForm(p => ({ ...p, qtyBreaks: breaks })); }} />
                                </div>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Discount:</span>
                                <div className="input-apple" style={{ width: 80 }}>
                                  <input type="number" min={0} max={100} step={0.5} value={qb.discountPct} style={{ padding: '5px 8px', fontSize: 13 }}
                                    onChange={e => { const breaks = [...form.qtyBreaks]; breaks[i] = { ...breaks[i], discountPct: +e.target.value }; setForm(p => ({ ...p, qtyBreaks: breaks })); }} />
                                </div>
                                <span style={{ fontSize: 12, color: 'var(--accent-green)', fontWeight: 600 }}>%</span>
                              </div>
                              <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-red)', fontSize: 16, padding: 4 }}
                                onClick={() => setForm(p => ({ ...p, qtyBreaks: p.qtyBreaks.filter((_, j) => j !== i) }))}>
                                <i className="ti ti-trash" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label className="input-label">Min Cart Amount ($)</label>
                      <div className="input-apple"><input type="number" min={0} step="0.01" value={form.minCartAmount} onChange={e => setForm(p => ({ ...p, minCartAmount: +e.target.value }))} /></div>
                    </div>
                    <div>
                      <label className="input-label">Priority (higher = first)</label>
                      <div className="input-apple"><input type="number" min={0} value={form.priority} onChange={e => setForm(p => ({ ...p, priority: +e.target.value }))} /></div>
                    </div>
                  </div>
                </div>

                {/* Section: Scheduling */}
                <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: 12, border: '1px solid var(--border-primary)' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="ti ti-calendar" style={{ color: '#34c759' }} /> Schedule (optional)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label className="input-label">Valid From</label>
                      <div className="input-apple"><input type="date" value={form.validFrom} onChange={e => setForm(p => ({ ...p, validFrom: e.target.value }))} /></div>
                    </div>
                    <div>
                      <label className="input-label">Valid Until</label>
                      <div className="input-apple"><input type="date" value={form.validUntil} onChange={e => setForm(p => ({ ...p, validUntil: e.target.value }))} /></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="apple-modal-footer">
                <button type="button" className="btn-apple secondary" onClick={() => { setShowCreate(false); setEditRule(null); }}>Cancel</button>
                <button type="submit" className="btn-apple primary" disabled={saving}>{saving ? 'Saving...' : (editRule ? 'Update Rule' : 'Create Rule')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteModal.show && deleteModal.rule && (
        <Modal show onClose={() => setDeleteModal({ show: false, rule: null })} onConfirm={() => deleteRule(deleteModal.rule!)}
          title="Delete Rule" message={`Delete "${deleteModal.rule.name}"? This action cannot be undone.`} confirmText="Delete" type="danger" />
      )}
    </div>
  );
}

/* ─── Company Intelligence Card ─── */
function CompanyIntCard({ intel }: { intel: CompanyIntel }) {
  const segColors: Record<string, string> = { new: '#8e8e93', active: '#007aff', loyal: '#34c759', interested: '#ff9500', at_risk: '#ff3b30', churned: '#636366' };
  const intentEmojis: Record<string, string> = { cold: '❄️', warm: '🌤️', hot: '🔥', converting: '💰' };
  const segColor = segColors[intel.segment] || '#8e8e93';

  return (
    <div className="apple-card" style={{ padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{intel.company.name}</div>
          {intel.company.email && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{intel.company.email}</div>}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: `${segColor}18`, color: segColor, textTransform: 'capitalize' }}>
            {intel.segment.replace('_', ' ')}
          </span>
          <span style={{ fontSize: 16 }}>{intentEmojis[intel.buyerIntent] || '❄️'}</span>
        </div>
      </div>

      {/* Engagement Bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
          <span style={{ color: 'var(--text-tertiary)' }}>Engagement</span>
          <span style={{ fontWeight: 700 }}>{intel.engagementScore.toFixed(0)}/100</span>
        </div>
        <div style={{ height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(100, intel.engagementScore)}%`, height: '100%', background: `linear-gradient(90deg, ${segColor}, ${segColor}cc)`, borderRadius: 3, transition: 'width 0.3s ease' }} />
        </div>
      </div>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Sessions', value: intel.totalSessions, icon: '🔗' },
          { label: 'Page Views', value: intel.totalPageViews, icon: '👁️' },
          { label: 'Product Views', value: intel.totalProductViews, icon: '📦' },
          { label: 'Add to Cart', value: intel.totalAddToCarts, icon: '🛒' },
          { label: 'Orders', value: intel.totalOrders, icon: '📋' },
          { label: 'Revenue', value: `$${Number(intel.totalRevenue).toFixed(0)}`, icon: '💰' },
        ].map(m => (
          <div key={m.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14 }}>{m.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{m.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Risk Indicators */}
      <div style={{ display: 'flex', gap: 8 }}>
        {intel.churnRisk > 0.3 && (
          <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: '#ff3b3014', color: '#ff3b30' }}>
            ⚠️ Churn risk: {(intel.churnRisk * 100).toFixed(0)}%
          </span>
        )}
        {intel.upsellPotential > 0.3 && (
          <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: '#34c75914', color: '#34c759' }}>
            📈 Upsell: {(intel.upsellPotential * 100).toFixed(0)}%
          </span>
        )}
        {intel.suggestedDiscount && intel.suggestedDiscount > 0 && (
          <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: '#5856d614', color: '#5856d6' }}>
            ✨ Suggest {intel.suggestedDiscount}% off
          </span>
        )}
      </div>
    </div>
  );
}
