'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminFetch } from '@/lib/api-client';
import { PageHeader, StatsCard, StatusBadge, showToast, Tabs } from '@/components/ui';
import Modal from '@/components/Modal';

interface Company {
  id: string;
  name: string;
  email: string;
  status: string;
  shopifyCustomerId?: string;
  users?: { id: string; firstName: string; lastName: string; email: string; role: string }[];
  createdAt: string;
}

interface ShopifyCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  ordersCount?: number;
  totalSpent?: string;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [shopifyCustomers, setShopifyCustomers] = useState<ShopifyCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('companies');
  const [search, setSearch] = useState('');
  const [convertModal, setConvertModal] = useState<{show: boolean; customer: ShopifyCustomer | null}>({show: false, customer: null});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [compRes, custRes] = await Promise.all([
        adminFetch('/api/v1/companies'),
        adminFetch('/api/v1/shopify-customers'),
      ]);
      const compData = await compRes.json();
      setCompanies(Array.isArray(compData) ? compData : compData.data || []);
      const custData = await custRes.json();
      setShopifyCustomers(Array.isArray(custData) ? custData : custData.customers || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const convertToB2B = async (customer: ShopifyCustomer) => {
    setConvertModal({show: false, customer: null});
    try {
      const res = await adminFetch(`/api/v1/shopify-customers/${customer.id}/convert-to-company`, { method: 'POST' });
      if (res.ok) { showToast('Converted to B2B company!', 'success'); load(); }
      else { const e = await res.json().catch(() => ({})); showToast(e.message || 'Failed', 'danger'); }
    } catch { showToast('Failed to convert', 'danger'); }
  };

  const filteredCompanies = companies.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()));
  const filteredCustomers = shopifyCustomers.filter(c => !search || `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader title="Companies" subtitle={`${companies.length} B2B companies`}
        actions={[{ label: 'Refresh', icon: 'refresh', variant: 'secondary', onClick: load }]} />

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <StatsCard title="B2B Companies" value={companies.length} icon="building" iconColor="primary" loading={loading} />
        <StatsCard title="Active" value={companies.filter(c => c.status === 'active' || c.status === 'ACTIVE').length} icon="check" iconColor="success" loading={loading} />
        <StatsCard title="Shopify Customers" value={shopifyCustomers.length} icon="users" iconColor="info" loading={loading} />
      </div>

      <div style={{ marginTop: 20 }}>
        <Tabs tabs={[
          { id: 'companies', label: 'B2B Companies', count: companies.length },
          { id: 'shopify', label: 'Shopify Customers', count: shopifyCustomers.length },
        ]} activeTab={tab} onChange={setTab} />

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div className="input-apple" style={{ flex: 1, maxWidth: 360 }}>
            <i className="ti ti-search input-icon" />
            <input placeholder={tab === 'companies' ? 'Search companies...' : 'Search customers...'} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="apple-card" style={{ padding: 48, textAlign: 'center' }}>
            <i className="ti ti-loader-2 spin" style={{ fontSize: 24, color: 'var(--accent-primary)' }} />
          </div>
        ) : tab === 'companies' ? (
          <div className="apple-card">
            {filteredCompanies.length === 0 ? (
              <div className="empty-state" style={{ padding: 48 }}>
                <div className="empty-state-icon"><i className="ti ti-building" /></div>
                <h4 className="empty-state-title">No companies found</h4>
              </div>
            ) : (
              <table className="apple-table">
                <thead><tr><th>Company</th><th>Email</th><th>Users</th><th>Status</th><th>Created</th></tr></thead>
                <tbody>
                  {filteredCompanies.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 500 }}>{c.name}</td>
                      <td>{c.email}</td>
                      <td>{c.users?.length || 0}</td>
                      <td><StatusBadge status={c.status} /></td>
                      <td style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="apple-card">
            {filteredCustomers.length === 0 ? (
              <div className="empty-state" style={{ padding: 48 }}>
                <div className="empty-state-icon"><i className="ti ti-users" /></div>
                <h4 className="empty-state-title">No Shopify customers</h4>
              </div>
            ) : (
              <table className="apple-table">
                <thead><tr><th>Name</th><th>Email</th><th>Orders</th><th>Total Spent</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredCustomers.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 500 }}>{c.firstName} {c.lastName}</td>
                      <td>{c.email}</td>
                      <td>{c.ordersCount || 0}</td>
                      <td>${parseFloat(c.totalSpent || '0').toFixed(2)}</td>
                      <td>
                        <button className="btn-apple primary small" onClick={() => setConvertModal({show: true, customer: c})}>
                          <i className="ti ti-building" /> Convert to B2B
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {convertModal.show && convertModal.customer && (
        <Modal show onClose={() => setConvertModal({show: false, customer: null})}
          onConfirm={() => convertToB2B(convertModal.customer!)}
          title="Convert to B2B" message={`Convert ${convertModal.customer.firstName} ${convertModal.customer.lastName} to a B2B company?`}
          confirmText="Convert" type="warning" />
      )}
    </div>
  );
}
