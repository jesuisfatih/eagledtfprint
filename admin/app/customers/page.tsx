'use client';

import Modal from '@/components/Modal';
import {
    DataTable,
    type DataTableColumn,
    PageContent,
    PageHeader,
    showToast,
    StatsCard
} from '@/components/ui';
import { adminFetch } from '@/lib/api-client';
import { useEffect, useState } from 'react';

// Badge color mapping for segments and tiers
const segmentColors: Record<string, { bg: string; text: string; label: string }> = {
  champions: { bg: '#10b981', text: '#fff', label: '🏆 Champions' },
  loyal: { bg: '#3b82f6', text: '#fff', label: '💎 Loyal' },
  potential_loyalist: { bg: '#6366f1', text: '#fff', label: '🌟 Potential Loyalist' },
  new_customers: { bg: '#8b5cf6', text: '#fff', label: '✨ New' },
  promising: { bg: '#06b6d4', text: '#fff', label: '📈 Promising' },
  need_attention: { bg: '#f59e0b', text: '#000', label: '⚠️ Need Attention' },
  about_to_sleep: { bg: '#f97316', text: '#fff', label: '😴 About to Sleep' },
  at_risk: { bg: '#ef4444', text: '#fff', label: '🚨 At Risk' },
  cant_lose: { bg: '#dc2626', text: '#fff', label: '🔥 Can\'t Lose' },
  hibernating: { bg: '#6b7280', text: '#fff', label: '❄️ Hibernating' },
  lost: { bg: '#374151', text: '#fff', label: '💀 Lost' },
  other: { bg: '#9ca3af', text: '#fff', label: '❓ Other' },
};

const tierColors: Record<string, { bg: string; text: string }> = {
  platinum: { bg: '#e5e7eb', text: '#1f2937' },
  gold: { bg: '#fef3c7', text: '#92400e' },
  silver: { bg: '#f1f5f9', text: '#475569' },
  bronze: { bg: '#fde68a', text: '#78350f' },
};

const riskColors: Record<string, { bg: string; text: string }> = {
  low: { bg: '#d1fae5', text: '#065f46' },
  medium: { bg: '#fef3c7', text: '#92400e' },
  high: { bg: '#fee2e2', text: '#991b1b' },
  critical: { bg: '#ef4444', text: '#fff' },
  new: { bg: '#dbeafe', text: '#1e40af' },
};

function Badge({ label, bg, text }: { label: string; bg: string; text: string }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 12,
      fontSize: 11,
      fontWeight: 600,
      background: bg,
      color: text,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

function HealthBar({ score }: { score: number }) {
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 60, height: 6, borderRadius: 3, background: '#e5e7eb', overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', borderRadius: 3, background: color, transition: 'width 0.5s' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color }}>{score}</span>
    </div>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [convertModal, setConvertModal] = useState<{show: boolean; customerId: string}>({show: false, customerId: ''});
  const [syncing, setSyncing] = useState(false);
  const [converting, setConverting] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'insights'>('insights');

  // Insights summary
  const [insights, setInsights] = useState<any>(null);

  // Filters
  const [segmentFilter, setSegmentFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');

  useEffect(() => { loadCustomers(); loadInsights(); }, []);
  useEffect(() => { loadCustomers(); }, [segmentFilter, riskFilter, tierFilter]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (segmentFilter) params.set('segment', segmentFilter);
      if (riskFilter) params.set('churnRisk', riskFilter);
      if (tierFilter) params.set('clvTier', tierFilter);

      const response = await adminFetch(`/api/v1/shopify-customers?${params.toString()}`);
      const data = await response.json();
      const customerList = Array.isArray(data) ? data : data.customers || [];
      setCustomers(customerList);
    } catch (err) {
      console.error('Load customers error:', err);
      setCustomers([]);
    } finally { setLoading(false); }
  };

  const loadInsights = async () => {
    try {
      const response = await adminFetch('/api/v1/shopify-customers/insights/summary');
      const data = await response.json();
      setInsights(data);
    } catch (err) {
      console.error('Load insights error:', err);
    }
  };

  const syncCustomers = async () => {
    try {
      setSyncing(true);
      await adminFetch('/api/v1/sync/customers', { method: 'POST' });
      showToast('Customers sync started!', 'success');
      setTimeout(loadCustomers, 3000);
    } catch { showToast('Failed to start sync', 'danger'); }
    finally { setSyncing(false); }
  };

  const calculateInsights = async () => {
    try {
      setCalculating(true);
      const response = await adminFetch('/api/v1/shopify-customers/insights/calculate', { method: 'POST' });
      const data = await response.json();
      showToast(`Intelligence calculated for ${data.processed || 0} customers!`, 'success');
      setTimeout(() => { loadCustomers(); loadInsights(); }, 1000);
    } catch { showToast('Failed to calculate insights', 'danger'); }
    finally { setCalculating(false); }
  };

  const convertToCompany = async (customerId: string) => {
    try {
      setConverting(true);
      setConvertModal({show: false, customerId: ''});
      const response = await adminFetch(`/api/v1/shopify-customers/${customerId}/convert-to-company`, { method: 'POST' });
      if (response.ok) {
        showToast('Customer converted to B2B company!', 'success');
        loadCustomers();
      } else {
        const error = await response.json().catch(() => ({}));
        showToast(error.message || 'Failed to convert customer', 'danger');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to convert', 'danger');
    } finally { setConverting(false); }
  };

  const columns: DataTableColumn<any>[] = [
    {
      key: 'name', label: 'Customer', sortable: true,
      render: (c) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontWeight: 600 }}>{c.firstName} {c.lastName}</span>
          <span style={{ fontSize: 11, color: '#6b7280' }}>{c.email}</span>
        </div>
      ),
    },
    {
      key: 'segment', label: 'Segment', sortable: true,
      render: (c) => {
        const seg = c.insight?.rfmSegment || 'other';
        const s = segmentColors[seg] || segmentColors.other;
        return <Badge label={s.label} bg={s.bg} text={s.text} />;
      },
    },
    {
      key: 'health', label: 'Health', sortable: true,
      render: (c) => c.insight?.healthScore != null ? <HealthBar score={c.insight.healthScore} /> : <span style={{ color: '#9ca3af', fontSize: 11 }}>—</span>,
    },
    {
      key: 'clvTier', label: 'CLV Tier', sortable: true,
      render: (c) => {
        const tier = c.insight?.clvTier || '';
        if (!tier) return <span style={{ color: '#9ca3af', fontSize: 11 }}>—</span>;
        const t = tierColors[tier] || tierColors.bronze;
        return <Badge label={tier.charAt(0).toUpperCase() + tier.slice(1)} bg={t.bg} text={t.text} />;
      },
    },
    {
      key: 'churnRisk', label: 'Churn Risk', sortable: true,
      render: (c) => {
        const risk = c.insight?.churnRisk || '';
        if (!risk) return <span style={{ color: '#9ca3af', fontSize: 11 }}>—</span>;
        const r = riskColors[risk] || riskColors.low;
        return <Badge label={risk.charAt(0).toUpperCase() + risk.slice(1)} bg={r.bg} text={r.text} />;
      },
    },
    {
      key: 'ordersCount', label: 'Orders', sortable: true,
      render: (c) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontWeight: 600 }}>{c.ordersCount || 0}</span>
          {c.insight?.purchaseFrequency && c.insight.purchaseFrequency !== 'one_time' && (
            <span style={{ fontSize: 10, color: '#6b7280' }}>{c.insight.purchaseFrequency.replace('_', ' ')}</span>
          )}
        </div>
      ),
    },
    {
      key: 'totalSpent', label: 'Total Spent', sortable: true,
      render: (c) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontWeight: 600 }}>${parseFloat(c.totalSpent || '0').toFixed(2)}</span>
          {c.insight?.projectedClv && (
            <span style={{ fontSize: 10, color: '#3b82f6' }}>proj: ${Number(c.insight.projectedClv).toFixed(0)}</span>
          )}
        </div>
      ),
    },
    {
      key: 'trend', label: 'Trend', sortable: false,
      render: (c) => {
        const trend = c.insight?.orderTrend || '';
        if (!trend || trend === 'insufficient_data') return <span style={{ color: '#9ca3af' }}>—</span>;
        const icons: Record<string, string> = { increasing: '📈', stable: '➡️', declining: '📉' };
        return <span>{icons[trend] || '—'} {trend}</span>;
      },
    },
  ];

  const rowActions = (customer: any) => (
    <div style={{ display: 'flex', gap: 6 }}>
      <a href={`mailto:${customer.email}`} className="btn-apple ghost small" title="Send Email">
        <i className="ti ti-mail" />
      </a>
      <button className="btn-apple primary small" onClick={() => setConvertModal({show: true, customerId: customer.id})} disabled={converting}>
        <i className="ti ti-building" /> Convert
      </button>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Customer Intelligence"
        subtitle={insights ? `${insights.totalCustomers} customers • ${insights.analyzedCustomers} analyzed` : 'Loading...'}
        actions={[
          { label: calculating ? 'Calculating...' : '🧠 Calculate Insights', icon: 'brain', variant: 'secondary', onClick: calculateInsights, disabled: calculating },
          { label: syncing ? 'Syncing...' : 'Sync Customers', icon: 'refresh', variant: 'primary', onClick: syncCustomers, disabled: syncing },
        ]}
      />

      {/* Insights Dashboard */}
      {insights && (
        <div style={{ marginBottom: 20 }}>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            <StatsCard
              title="Total Customers"
              value={insights.totalCustomers}
              icon="users"
              iconColor="primary"
            />
            <StatsCard
              title="Returning Rate"
              value={`${insights.returningCustomerRate}%`}
              icon="repeat"
              iconColor="success"
            />
            <StatsCard
              title="Avg CLV"
              value={`$${Number(insights.averageClv).toFixed(0)}`}
              icon="trending-up"
              iconColor="info"
            />
            <StatsCard
              title="Champions"
              value={insights.topChampions}
              icon="crown"
              iconColor="warning"
            />
            <StatsCard
              title="At Risk"
              value={insights.atRiskCount}
              icon="alert-triangle"
              iconColor="danger"
            />
          </div>

          {/* Segment Distribution */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
            marginTop: 16,
          }}>
            {/* RFM Segments */}
            <div style={{
              background: '#fff',
              borderRadius: 12,
              padding: 20,
              border: '1px solid #e5e7eb',
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#374151' }}>
                📊 Customer Segments
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(insights.segmentDistribution || {}).map(([segment, count]) => {
                  const s = segmentColors[segment] || segmentColors.other;
                  return (
                    <button
                      key={segment}
                      onClick={() => setSegmentFilter(segmentFilter === segment ? '' : segment)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 16,
                        fontSize: 12,
                        fontWeight: 500,
                        background: segmentFilter === segment ? s.bg : '#f3f4f6',
                        color: segmentFilter === segment ? s.text : '#374151',
                        border: segmentFilter === segment ? `2px solid ${s.bg}` : '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {s.label} ({count as number})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Risk / Tier Distribution */}
            <div style={{
              background: '#fff',
              borderRadius: 12,
              padding: 20,
              border: '1px solid #e5e7eb',
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#374151' }}>
                🎯 Churn Risk & CLV Tiers
              </h3>
              <div style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6, display: 'block' }}>Churn Risk:</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {Object.entries(insights.riskDistribution || {}).map(([risk, count]) => {
                    const r = riskColors[risk] || riskColors.low;
                    return (
                      <button
                        key={risk}
                        onClick={() => setRiskFilter(riskFilter === risk ? '' : risk)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 16,
                          fontSize: 12,
                          fontWeight: 500,
                          background: riskFilter === risk ? r.bg : '#f3f4f6',
                          color: riskFilter === risk ? r.text : '#374151',
                          border: riskFilter === risk ? `2px solid ${r.bg}` : '2px solid transparent',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {risk} ({count as number})
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6, display: 'block' }}>CLV Tiers:</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {Object.entries(insights.tierDistribution || {}).map(([tier, count]) => {
                    const t = tierColors[tier] || tierColors.bronze;
                    return (
                      <button
                        key={tier}
                        onClick={() => setTierFilter(tierFilter === tier ? '' : tier)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 16,
                          fontSize: 12,
                          fontWeight: 500,
                          background: tierFilter === tier ? t.bg : '#f3f4f6',
                          color: tierFilter === tier ? t.text : '#374151',
                          border: tierFilter === tier ? `2px solid ${t.bg}` : '2px solid transparent',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {tier} ({count as number})
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters */}
      {(segmentFilter || riskFilter || tierFilter) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
          padding: '8px 12px',
          background: '#f0f9ff',
          borderRadius: 8,
          border: '1px solid #bae6fd',
        }}>
          <span style={{ fontSize: 12, color: '#0369a1', fontWeight: 500 }}>Active Filters:</span>
          {segmentFilter && (
            <Badge label={`Segment: ${segmentFilter}`} bg="#3b82f6" text="#fff" />
          )}
          {riskFilter && (
            <Badge label={`Risk: ${riskFilter}`} bg="#ef4444" text="#fff" />
          )}
          {tierFilter && (
            <Badge label={`Tier: ${tierFilter}`} bg="#f59e0b" text="#000" />
          )}
          <button
            onClick={() => { setSegmentFilter(''); setRiskFilter(''); setTierFilter(''); }}
            style={{
              marginLeft: 'auto',
              padding: '2px 8px',
              borderRadius: 4,
              background: 'none',
              border: '1px solid #93c5fd',
              color: '#2563eb',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Clear All
          </button>
        </div>
      )}

      {/* Customer Table */}
      <div style={{ marginTop: 8 }}>
        <PageContent loading={loading} empty={{ show: !loading && customers.length === 0, icon: 'users', title: 'No customers found', message: segmentFilter || riskFilter || tierFilter ? 'No customers match the selected filters.' : 'Click "Sync Customers" to import from Shopify.' }}>
          <DataTable
            data={customers}
            columns={columns}
            loading={loading}
            searchable
            searchPlaceholder="Search customers..."
            searchFields={['firstName', 'lastName', 'email', 'phone']}
            defaultSortKey="totalSpent"
            defaultSortOrder="desc"
            rowActions={rowActions}
          />
        </PageContent>
      </div>

      {convertModal.show && (
        <Modal show={convertModal.show} onClose={() => setConvertModal({show: false, customerId: ''})} onConfirm={() => convertToCompany(convertModal.customerId)} title="Convert to B2B Company" message="Are you sure you want to convert this customer to a B2B company? An invitation email will be sent." confirmText="Convert" cancelText="Cancel" type="warning" />
      )}
    </div>
  );
}
