'use client';

import { adminFetch } from '@/lib/api-client';
import { useCallback, useEffect, useState } from 'react';

interface Store {
  id: string;
  name: string;
  domain: string;
  shopifyStoreUrl: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'SYNCING';
  lastSyncAt: string;
  orderCount: number;
  revenue: number;
}

interface CrossStoreAnalytics {
  combined: {
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    uniqueCustomers: number;
    avgOrderValue: number;
  };
  stores: any[];
  crossStoreCustomers: number;
}

export default function MultiStorePage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [analytics, setAnalytics] = useState<CrossStoreAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  // Onboarding Wizard State
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardForm, setWizardForm] = useState({
    merchantId: '',
    storeName: '',
    domain: '',
    brandColor: '#2563eb',
    defaultFromEmail: '',
  });
  const [isOnboarding, setIsOnboarding] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [storesRes, analyticsRes] = await Promise.all([
        adminFetch('/api/v1/multi-store/stores'),
        adminFetch('/api/v1/multi-store/analytics')
      ]);

      if (storesRes.ok) setStores(await storesRes.json());
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleOnboard = async () => {
    setIsOnboarding(true);
    try {
      const res = await adminFetch('/api/v1/multi-store/stores/onboard', {
        method: 'POST',
        body: JSON.stringify({
          ...wizardForm,
          features: { pickup: true, gangSheet: true, uvDtf: true, wholesale: true }
        }),
      });
      if (res.ok) {
        alert('Mağaza başarıyla onboard edildi ve Dittofeed kurulumları tamamlandı!');
        setShowWizard(false);
        setWizardStep(1);
        loadData();
      } else {
        alert('Onboarding başarısız oldu.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsOnboarding(false);
    }
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Multi-Store Management</h1>
          <p className="page-subtitle">Centralized control & cross-store intelligence for Eagle Ecosystem</p>
        </div>
        <div className="page-header-actions">
           <button className="btn-apple primary" onClick={() => setShowWizard(true)}>
             <i className="ti ti-plus" /> Connect & Onboard New Store
           </button>
        </div>
      </div>

      {/* Cross-Store Insights Summary */}
      {analytics && (
        <div className="stats-grid cols-5" style={{ marginTop: 24, marginBottom: 32 }}>
           <div className="stat-card">
              <div className="stat-label">Total GMS</div>
              <div className="stat-value">${analytics.combined.totalRevenue.toLocaleString()}</div>
              <div className="stat-meta">{stores.length} connected stores</div>
           </div>
           <div className="stat-card">
              <div className="stat-label">Combined Orders</div>
              <div className="stat-value">{analytics.combined.totalOrders.toLocaleString()}</div>
              <div className="stat-meta">Avg. ${analytics.combined.avgOrderValue} / order</div>
           </div>
           <div className="stat-card">
              <div className="stat-label">Total Customers</div>
              <div className="stat-value">{analytics.combined.totalCustomers.toLocaleString()}</div>
              <div className="stat-meta">{analytics.combined.uniqueCustomers.toLocaleString()} unique</div>
           </div>
           <div className="stat-card" style={{ borderLeft: '3px solid var(--accent-purple)' }}>
              <div className="stat-label">Cross-Store Loyalists</div>
              <div className="stat-value">{analytics.crossStoreCustomers}</div>
              <div className="stat-meta" style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>Bought from 2+ stores</div>
           </div>
           <div className="stat-card">
              <div className="stat-label">Sync Status</div>
              <div className="stat-value" style={{ color: 'var(--accent-green)', fontSize: 18 }}>
                 <i className="ti ti-cloud-check" /> All Systems Nominal
              </div>
           </div>
        </div>
      )}

      {/* Stores Grid */}
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Connected Storefronts</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 24 }}>
        {stores.map(store => (
          <div key={store.id} className="apple-card" style={{ padding: 24, position: 'relative' }}>
            <div className="flex justify-between items-start mb-20">
              <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-indigo))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'white', fontWeight: 700 }}>
                {store.name.charAt(0)}
              </div>
              <span className={`badge-apple ${store.status === 'CONNECTED' ? 'green' : 'red'}`}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                {store.status}
              </span>
            </div>

            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4, letterSpacing: '-0.3px' }}>{store.name}</h3>
            <div className="flex items-center gap-6" style={{ marginBottom: 20 }}>
               <i className="ti ti-world" style={{ fontSize: 14, color: 'var(--text-tertiary)' }} />
               <p style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>{store.domain}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
               <div style={{ background: 'var(--bg-primary)', padding: '14px', borderRadius: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Revenue</div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>${store.revenue.toLocaleString()}</div>
               </div>
               <div style={{ background: 'var(--bg-primary)', padding: '14px', borderRadius: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Orders</div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{store.orderCount}</div>
               </div>
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-quaternary)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
               <i className="ti ti-history" /> Last Data Sync: {new Date(store.lastSyncAt).toLocaleString()}
            </div>

             <div className="flex gap-10">
                <button className="btn-apple secondary" style={{ flex: 1 }}>Settings</button>
                <button className="btn-apple secondary" style={{ flex: 1 }}>View Analytics</button>
             </div>
          </div>
        ))}
        {stores.length === 0 && !loading && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', background: 'var(--bg-secondary)', borderRadius: 20 }}>
             No stores connected. Start by onboarding your first store.
          </div>
        )}
      </div>

      {/* Onboarding Wizard Modal */}
      {showWizard && (
        <div className="apple-modal-overlay" onClick={() => setShowWizard(false)}>
           <div className="apple-modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
              <div className="apple-modal-header">
                 <h3 className="apple-modal-title">Mağaza Onboarding Sihirbazı</h3>
                 <button className="apple-modal-close" onClick={() => setShowWizard(false)}>
                    <i className="ti ti-x" />
                 </button>
              </div>

              <div className="apple-modal-body">
                 {/* Steps Indicator */}
                 <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                    {[1, 2, 3].map(s => (
                      <div key={s} style={{ flex: 1, height: 4, background: wizardStep >= s ? 'var(--accent-blue)' : 'var(--border-primary)', borderRadius: 2 }} />
                    ))}
                 </div>

                 {wizardStep === 1 && (
                    <div className="fade-in">
                       <h4 style={{ fontWeight: 700, marginBottom: 16 }}>Step 1: Store Identity</h4>
                       <div className="form-group">
                          <label className="input-label">Shopify Merchant ID</label>
                          <input className="input-apple-field" placeholder="e.g. merchant_uuid" value={wizardForm.merchantId} onChange={e => setWizardForm({ ...wizardForm, merchantId: e.target.value })} />
                          <p className="input-helper">The internal unique ID for this Shopify store.</p>
                       </div>
                       <div className="form-group">
                          <label className="input-label">Store Brand Name</label>
                          <input className="input-apple-field" placeholder="e.g. Eagle DTF Supply" value={wizardForm.storeName} onChange={e => setWizardForm({ ...wizardForm, storeName: e.target.value })} />
                       </div>
                    </div>
                 )}

                 {wizardStep === 2 && (
                    <div className="fade-in">
                       <h4 style={{ fontWeight: 700, marginBottom: 16 }}>Step 2: Technical Config</h4>
                       <div className="form-group">
                          <label className="input-label">Primary Domain</label>
                          <input className="input-apple-field" placeholder="e.g. eagledtfsupply.com" value={wizardForm.domain} onChange={e => setWizardForm({ ...wizardForm, domain: e.target.value })} />
                       </div>
                       <div className="form-group">
                          <label className="input-label">Brand Primary Color</label>
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                             <input type="color" value={wizardForm.brandColor} onChange={e => setWizardForm({ ...wizardForm, brandColor: e.target.value })} style={{ width: 44, height: 44, border: 'none', borderRadius: 8, overflow: 'hidden', cursor: 'pointer' }} />
                             <input className="input-apple-field" value={wizardForm.brandColor} onChange={e => setWizardForm({ ...wizardForm, brandColor: e.target.value })} style={{ flex: 1 }} />
                          </div>
                       </div>
                    </div>
                 )}

                 {wizardStep === 3 && (
                    <div className="fade-in">
                       <h4 style={{ fontWeight: 700, marginBottom: 16 }}>Step 3: Communication</h4>
                       <div className="form-group">
                          <label className="input-label">Support / From Email</label>
                          <input className="input-apple-field" placeholder="orders@domain.com" value={wizardForm.defaultFromEmail} onChange={e => setWizardForm({ ...wizardForm, defaultFromEmail: e.target.value })} />
                          <p className="input-helper">Emails to customers will be sent from this address.</p>
                       </div>
                       <div style={{ background: 'var(--accent-blue-soft)', padding: 16, borderRadius: 12, marginTop: 16 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-blue)', marginBottom: 4 }}>🚀 Ready for Lunch</div>
                          <p style={{ fontSize: 12, color: 'var(--accent-blue)' }}>Hitting 'Complete' will automatically setup 13 segments, 7 journeys and 7 email templates in Dittofeed for this store.</p>
                       </div>
                    </div>
                 )}
              </div>

              <div className="apple-modal-footer">
                 {wizardStep > 1 && (
                    <button className="btn-apple secondary" onClick={() => setWizardStep(wizardStep - 1)}>Back</button>
                 )}
                 <div style={{ flex: 1 }} />
                 {wizardStep < 3 ? (
                    <button className="btn-apple primary" onClick={() => setWizardStep(wizardStep + 1)} disabled={wizardStep === 1 && !wizardForm.merchantId}>
                       Next Step <i className="ti ti-arrow-right" />
                    </button>
                 ) : (
                    <button className="btn-apple primary" onClick={handleOnboard} disabled={isOnboarding}>
                       {isOnboarding ? <span className="spinner-apple small" /> : 'Complete Onboarding & Sync Data'}
                    </button>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
