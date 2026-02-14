'use client';

import CustomerListsPanel from '@/components/CustomerListsPanel';
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
  platinum: { bg: '#e5e7eb', text: '#1f2937' }, gold: { bg: '#fef3c7', text: '#92400e' },
  silver: { bg: '#f1f5f9', text: '#475569' }, bronze: { bg: '#fde68a', text: '#78350f' },
};
const riskColors: Record<string, { bg: string; text: string }> = {
  low: { bg: '#d1fae5', text: '#065f46' }, medium: { bg: '#fef3c7', text: '#92400e' },
  high: { bg: '#fee2e2', text: '#991b1b' }, critical: { bg: '#ef4444', text: '#fff' },
  new: { bg: '#dbeafe', text: '#1e40af' },
};

function Badge({ label, bg, text }: { label: string; bg: string; text: string }) {
  return <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: bg, color: text, whiteSpace: 'nowrap' }}>{label}</span>;
}
function HealthBar({ score, max = 100 }: { score: number; max?: number }) {
  const pct = Math.min(Math.round((score / max) * 100), 100);
  const color = pct > 70 ? '#10b981' : pct > 40 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
      <div style={{ flex: 1, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color }}>{score}</span>
    </div>
  );
}
function MetricCard({ label, value, icon, color, subtext }: { label: string; value: string | number; icon?: string; color?: string; subtext?: string }) {
  return (
    <div style={{ padding: 12, background: '#f9fafb', borderRadius: 10, border: '1px solid #f3f4f6' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        {icon && <i className={`ti ti-${icon}`} style={{ fontSize: 13, color: color || '#6b7280' }} />}
        <span style={{ fontSize: 11, color: '#6b7280' }}>{label}</span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color || '#1f2937' }}>{value}</div>
      {subtext && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{subtext}</div>}
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
  const [inteliModal, setInteliModal] = useState<{show: boolean; customer: any | null}>({show: false, customer: null});
  const [insights, setInsights] = useState<any>(null);
  const [segmentFilter, setSegmentFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  // Multi-select
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // List view
  const [listViewModal, setListViewModal] = useState<{show: boolean; listId: string; listName: string}>({show: false, listId: '', listName: ''});
  const [listCustomers, setListCustomers] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listRefresh, setListRefresh] = useState(0);

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
      setCustomers(Array.isArray(data) ? data : data.customers || []);
    } catch { setCustomers([]); }
    finally { setLoading(false); }
  };

  const loadInsights = async () => {
    try { const r = await adminFetch('/api/v1/shopify-customers/insights/summary'); setInsights(await r.json()); } catch {}
  };

  const syncCustomers = async () => {
    try { setSyncing(true); await adminFetch('/api/v1/sync/customers', { method: 'POST' }); showToast('Customers sync started!', 'success'); setTimeout(loadCustomers, 3000); }
    catch { showToast('Failed to start sync', 'danger'); } finally { setSyncing(false); }
  };

  const calculateInsights = async () => {
    try {
      setCalculating(true);
      const r = await adminFetch('/api/v1/shopify-customers/insights/calculate', { method: 'POST' });
      const d = await r.json();
      showToast(`Intelligence calculated for ${d.processed || 0} customers!`, 'success');
      setTimeout(() => { loadCustomers(); loadInsights(); setListRefresh(p => p + 1); }, 1000);
    } catch { showToast('Failed to calculate insights', 'danger'); }
    finally { setCalculating(false); }
  };

  const convertToCompany = async (customerId: string) => {
    try {
      setConverting(true); setConvertModal({show: false, customerId: ''});
      const r = await adminFetch(`/api/v1/shopify-customers/${customerId}/convert-to-company`, { method: 'POST' });
      if (r.ok) { showToast('Customer converted to B2B company!', 'success'); loadCustomers(); }
      else { const e = await r.json().catch(() => ({})); showToast(e.message || 'Failed', 'danger'); }
    } catch (err) { showToast(err instanceof Error ? err.message : 'Failed', 'danger'); }
    finally { setConverting(false); }
  };

  const viewListCustomers = async (listId: string, listName: string) => {
    setListViewModal({ show: true, listId, listName });
    setListLoading(true);
    try {
      const r = await adminFetch(`/api/v1/customer-lists/${listId}`);
      const data = await r.json();
      setListCustomers(data.items?.map((i: any) => ({ ...i.shopifyCustomer, listItemId: i.id, listNotes: i.notes })) || []);
    } catch { showToast('Failed to load list', 'danger'); }
    finally { setListLoading(false); }
  };

  const removeFromList = async (customerId: string) => {
    try {
      await adminFetch(`/api/v1/customer-lists/${listViewModal.listId}/customers`, {
        method: 'DELETE', body: JSON.stringify({ customerIds: [customerId] }),
      });
      setListCustomers(prev => prev.filter(c => c.id !== customerId));
      showToast('Removed from list', 'success');
      setListRefresh(p => p + 1);
    } catch { showToast('Failed to remove', 'danger'); }
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleSelectAll = () => {
    if (selectedIds.length === customers.length) setSelectedIds([]);
    else setSelectedIds(customers.map(c => c.id));
  };

  const getDayName = (d: number) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d] || '—';
  const getMonthName = (m: number) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m] || '—';

  const columns: DataTableColumn<any>[] = [
    {
      key: 'select', label: '', sortable: false,
      render: (c) => (
        <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelect(c.id)}
          style={{ width: 16, height: 16, cursor: 'pointer' }} />
      ),
    },
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
      render: (c) => { const seg = c.insight?.rfmSegment || 'other'; const s = segmentColors[seg] || segmentColors.other; return <Badge label={s.label} bg={s.bg} text={s.text} />; },
    },
    {
      key: 'health', label: 'Health', sortable: true,
      render: (c) => c.insight?.healthScore != null ? <HealthBar score={c.insight.healthScore} /> : <span style={{ color: '#9ca3af', fontSize: 11 }}>—</span>,
    },
    {
      key: 'clvTier', label: 'CLV', sortable: true,
      render: (c) => { const t = c.insight?.clvTier; if (!t) return <span style={{ color: '#9ca3af', fontSize: 11 }}>—</span>; const tc = tierColors[t] || tierColors.bronze; return <Badge label={t.charAt(0).toUpperCase() + t.slice(1)} bg={tc.bg} text={tc.text} />; },
    },
    {
      key: 'churnRisk', label: 'Risk', sortable: true,
      render: (c) => { const r = c.insight?.churnRisk; if (!r) return <span style={{ color: '#9ca3af', fontSize: 11 }}>—</span>; const rc = riskColors[r] || riskColors.low; return <Badge label={r.charAt(0).toUpperCase() + r.slice(1)} bg={rc.bg} text={rc.text} />; },
    },
    {
      key: 'ordersCount', label: 'Orders', sortable: true,
      render: (c) => <span style={{ fontWeight: 600 }}>{c.ordersCount || 0}</span>,
    },
    {
      key: 'totalSpent', label: 'Spent', sortable: true,
      render: (c) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontWeight: 600 }}>${parseFloat(c.totalSpent || '0').toFixed(2)}</span>
          {c.insight?.projectedClv && <span style={{ fontSize: 10, color: '#3b82f6' }}>proj: ${Number(c.insight.projectedClv).toFixed(0)}</span>}
        </div>
      ),
    },
    {
      key: 'trend', label: 'Trend', sortable: false,
      render: (c) => {
        const t = c.insight?.orderTrend || '';
        if (!t || t === 'insufficient_data') return <span style={{ color: '#9ca3af' }}>—</span>;
        return <span>{t === 'increasing' ? '📈' : t === 'stable' ? '➡️' : '📉'} {t}</span>;
      },
    },
  ];

  const rowActions = (customer: any) => (
    <div style={{ display: 'flex', gap: 6 }}>
      <button className="btn-apple secondary small" onClick={() => setInteliModal({show: true, customer})} title="View Intelligence">
        <i className="ti ti-brain" /> Details
      </button>
      <button className="btn-apple primary small" onClick={() => setConvertModal({show: true, customerId: customer.id})} disabled={converting}>
        <i className="ti ti-building" />
      </button>
    </div>
  );

  const dm = inteliModal.customer?.insight?.deepMetrics;

  return (
    <div>
      <PageHeader
        title="Customer Intelligence & Analytics"
        subtitle={insights ? `${insights.totalCustomers} customers analyzed • Up to 1,000 shown` : 'Loading...'}
        actions={[
          { label: calculating ? 'Calculating...' : '🧠 Recalculate', icon: 'brain', variant: 'secondary', onClick: calculateInsights, disabled: calculating },
          { label: syncing ? 'Syncing...' : 'Sync from Shopify', icon: 'refresh', variant: 'primary', onClick: syncCustomers, disabled: syncing },
        ]}
      />

      {/* Stats */}
      {insights && (
        <div style={{ marginBottom: 20 }}>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            <StatsCard title="Total Customers" value={insights.totalCustomers} icon="users" iconColor="primary" />
            <StatsCard title="Returning Rate" value={`${insights.returningCustomerRate}%`} icon="repeat" iconColor="success" />
            <StatsCard title="Avg CLV" value={`$${Number(insights.averageClv).toFixed(0)}`} icon="trending-up" iconColor="info" />
            <StatsCard title="Champions" value={insights.topChampions} icon="crown" iconColor="warning" />
            <StatsCard title="At Risk" value={insights.atRiskCount} icon="alert-triangle" iconColor="danger" />
          </div>

          {/* Segments & Risks */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#374151' }}>📊 Customer Segments</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(insights.segmentDistribution || {}).map(([seg, cnt]) => {
                  const s = segmentColors[seg] || segmentColors.other;
                  return <button key={seg} onClick={() => setSegmentFilter(segmentFilter === seg ? '' : seg)} style={{
                    padding: '4px 10px', borderRadius: 16, fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                    background: segmentFilter === seg ? s.bg : '#f3f4f6', color: segmentFilter === seg ? s.text : '#374151',
                    border: segmentFilter === seg ? `2px solid ${s.bg}` : '2px solid transparent',
                  }}>{s.label} ({cnt as number})</button>;
                })}
              </div>
            </div>
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#374151' }}>🎯 Churn Risk & CLV Tiers</h3>
              <div style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6, display: 'block' }}>Churn Risk:</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {Object.entries(insights.riskDistribution || {}).map(([risk, cnt]) => {
                    const r = riskColors[risk] || riskColors.low;
                    return <button key={risk} onClick={() => setRiskFilter(riskFilter === risk ? '' : risk)} style={{
                      padding: '4px 10px', borderRadius: 16, fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                      background: riskFilter === risk ? r.bg : '#f3f4f6', color: riskFilter === risk ? r.text : '#374151',
                      border: riskFilter === risk ? `2px solid ${r.bg}` : '2px solid transparent',
                    }}>{risk} ({cnt as number})</button>;
                  })}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6, display: 'block' }}>CLV Tiers:</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {Object.entries(insights.tierDistribution || {}).map(([tier, cnt]) => {
                    const t = tierColors[tier] || tierColors.bronze;
                    return <button key={tier} onClick={() => setTierFilter(tierFilter === tier ? '' : tier)} style={{
                      padding: '4px 10px', borderRadius: 16, fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                      background: tierFilter === tier ? t.bg : '#f3f4f6', color: tierFilter === tier ? t.text : '#374151',
                      border: tierFilter === tier ? `2px solid ${t.bg}` : '2px solid transparent',
                    }}>{tier} ({cnt as number})</button>;
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SMART ALARMS & CUSTOM LISTS */}
      <CustomerListsPanel
        onViewList={viewListCustomers}
        onAddToList={() => {}}
        selectedCustomerIds={selectedIds}
        refreshTrigger={listRefresh}
      />

      {/* Active Filters */}
      {(segmentFilter || riskFilter || tierFilter) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '8px 12px', background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd' }}>
          <span style={{ fontSize: 12, color: '#0369a1', fontWeight: 500 }}>Active Filters:</span>
          {segmentFilter && <Badge label={`Segment: ${segmentFilter}`} bg="#3b82f6" text="#fff" />}
          {riskFilter && <Badge label={`Risk: ${riskFilter}`} bg="#ef4444" text="#fff" />}
          {tierFilter && <Badge label={`Tier: ${tierFilter}`} bg="#f59e0b" text="#000" />}
          <button onClick={() => { setSegmentFilter(''); setRiskFilter(''); setTierFilter(''); }} style={{
            marginLeft: 'auto', padding: '2px 8px', borderRadius: 4, background: 'none', border: '1px solid #93c5fd', color: '#2563eb', fontSize: 11, cursor: 'pointer',
          }}>Clear All</button>
        </div>
      )}

      {/* Selection Bar */}
      {selectedIds.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '8px 12px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#1d4ed8' }}>✓ {selectedIds.length} customer(s) selected</span>
          <button onClick={() => setSelectedIds([])} className="btn-apple ghost small" style={{ marginLeft: 'auto', fontSize: 11 }}>Deselect All</button>
          <button onClick={toggleSelectAll} className="btn-apple ghost small" style={{ fontSize: 11 }}>Select All ({customers.length})</button>
        </div>
      )}

      {/* Customer Table */}
      <div style={{ marginTop: 8 }}>
        <PageContent loading={loading} empty={{ show: !loading && customers.length === 0, icon: 'users', title: 'No customers found', message: 'Click "Sync from Shopify" to import customers.' }}>
          <DataTable data={customers} columns={columns} loading={loading} searchable searchPlaceholder="Search customers..." searchFields={['firstName', 'lastName', 'email', 'phone']} defaultSortKey="totalSpent" defaultSortOrder="desc" rowActions={rowActions} />
        </PageContent>
      </div>

      {/* LIST VIEW MODAL */}
      {listViewModal.show && (
        <Modal show={listViewModal.show} onClose={() => setListViewModal({show: false, listId: '', listName: ''})} onConfirm={() => setListViewModal({show: false, listId: '', listName: ''})} title={listViewModal.listName} confirmText="Close" type="primary">
          <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {listLoading ? <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>Loading...</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>{listCustomers.length} customers in this list</div>
                {listCustomers.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f9fafb', borderRadius: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{c.firstName} {c.lastName}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{c.email}</div>
                    </div>
                    <div style={{ textAlign: 'right', marginRight: 8 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>${parseFloat(c.totalSpent || '0').toFixed(2)}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{c.ordersCount} orders</div>
                    </div>
                    {c.insight?.churnRisk && (() => { const r = riskColors[c.insight.churnRisk] || riskColors.low; return <Badge label={c.insight.churnRisk} bg={r.bg} text={r.text} />; })()}
                    <button className="btn-apple ghost small" style={{ color: '#ef4444' }} onClick={() => removeFromList(c.id)}><i className="ti ti-x" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* INTELLIGENCE DETAIL MODAL */}
      {inteliModal.show && inteliModal.customer && (
        <Modal show={inteliModal.show} onClose={() => setInteliModal({show: false, customer: null})} onConfirm={() => setInteliModal({show: false, customer: null})} title={`Intelligence: ${inteliModal.customer.firstName} ${inteliModal.customer.lastName}`} confirmText="Close" type="primary">
          <div style={{ maxHeight: '75vh', overflowY: 'auto', paddingRight: 10 }}>
            {dm ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Performance */}
                <div>
                  <h4 style={{ fontSize: 13, color: '#6b7280', marginBottom: 10, textTransform: 'uppercase' }}>📈 Performance & Growth</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    <MetricCard label="Spending Growth" value={`${dm.spendingGrowthRate}%`} icon="trending-up" color={dm.spendingGrowthRate >= 0 ? '#10b981' : '#ef4444'} />
                    <MetricCard label="Order Growth" value={`${dm.orderGrowthRate}%`} icon="chart-arrows" color={dm.orderGrowthRate >= 0 ? '#10b981' : '#ef4444'} />
                    <MetricCard label="Orders/Month" value={dm.ordersPerMonth} icon="calendar" />
                    <MetricCard label="AOV Trend" value={`${dm.aovTrend > 0 ? '+' : ''}${dm.aovTrend}%`} icon="coins" color={dm.aovTrend >= 0 ? '#10b981' : '#ef4444'} />
                    <MetricCard label="Engagement" value={dm.engagementVelocity?.replace('_', ' ') || '—'} icon="bolt" />
                    <MetricCard label="Percentile" value={`Top ${100 - (dm.customerPercentile || 50)}%`} icon="award" color="#3b82f6" />
                  </div>
                </div>
                {/* Behavior */}
                <div>
                  <h4 style={{ fontSize: 13, color: '#6b7280', marginBottom: 10, textTransform: 'uppercase' }}>🧠 Behavioral Analysis</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ padding: 12, background: '#f9fafb', borderRadius: 10 }}><div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Regularity</div><HealthBar score={dm.regularityScore} /></div>
                    <div style={{ padding: 12, background: '#f9fafb', borderRadius: 10 }}><div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Churn Probability</div><HealthBar score={dm.churnProbability} /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 10 }}>
                    <MetricCard label="Lifecycle" value={dm.lifecycleStage?.replace(/_/g, ' ') || '—'} icon="heart" color="#6366f1" />
                    <MetricCard label="Reactivation" value={dm.reactivationPotential?.replace(/_/g, ' ') || '—'} icon="refresh" />
                    <MetricCard label="Next Order" value={dm.predictedNextOrderDays != null ? `${dm.predictedNextOrderDays}d` : '—'} icon="calendar-event" color="#3b82f6" />
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {dm.isVipCandidate && <Badge label="🌟 VIP Candidate" bg="#fef3c7" text="#92400e" />}
                    {dm.isRisingStar && <Badge label="🚀 Rising Star" bg="#dbeafe" text="#1e40af" />}
                    {dm.isDormantHighValue && <Badge label="💤 Dormant" bg="#fee2e2" text="#991b1b" />}
                    {dm.isWhale && <Badge label="🐋 Whale" bg="#e0e7ff" text="#3730a3" />}
                    {dm.isBulkBuyer && <Badge label="📦 Bulk" bg="#f0fdf4" text="#166534" />}
                    {dm.brandLoyalty && <Badge label="🤝 Loyal" bg="#d1fae5" text="#065f46" />}
                  </div>
                </div>
                {/* Time */}
                <div>
                  <h4 style={{ fontSize: 13, color: '#6b7280', marginBottom: 10, textTransform: 'uppercase' }}>⏰ Time Patterns</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                    <MetricCard label="Peak Hour" value={`${dm.peakHour}:00`} icon="clock" />
                    <MetricCard label="Peak Day" value={getDayName(dm.peakDay)} icon="calendar" />
                    <MetricCard label="Peak Month" value={getMonthName(dm.peakMonth)} icon="calendar-stats" />
                    <MetricCard label="Night Rate" value={`${dm.nightOrderRate}%`} icon="moon" />
                  </div>
                </div>
                {/* Products */}
                <div>
                  <h4 style={{ fontSize: 13, color: '#6b7280', marginBottom: 10, textTransform: 'uppercase' }}>🛒 Product Intelligence</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    <MetricCard label="Basket Size" value={dm.avgBasketSize} icon="shopping-cart" />
                    <MetricCard label="Unique Products" value={dm.uniqueProductsCount} icon="box" />
                    <MetricCard label="Diversity Index" value={dm.productDiversityIndex} icon="chart-donut" />
                    <MetricCard label="Repeat Rate" value={`${dm.repeatPurchaseRate}%`} icon="repeat" color="#3b82f6" />
                    <MetricCard label="Discount Usage" value={`${dm.discountUsageRate}%`} icon="discount-2" />
                    <MetricCard label="Revenue/Item" value={`$${dm.revenuePerItem}`} icon="coin" />
                  </div>
                </div>
                {/* Revenue */}
                <div>
                  <h4 style={{ fontSize: 13, color: '#6b7280', marginBottom: 10, textTransform: 'uppercase' }}>📊 Revenue & Benchmarks</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    <MetricCard label="Net Revenue" value={`$${dm.netRevenue}`} icon="wallet" color="#10b981" />
                    <MetricCard label="Refund Rate" value={`${dm.refundRate}%`} icon="receipt-refund" color={dm.refundRate > 10 ? '#ef4444' : '#6b7280'} />
                    <MetricCard label="Loyalty" value={`${dm.loyaltyDurationDays}d`} icon="clock-2" />
                    <MetricCard label="AOV vs Avg" value={`${dm.aovVsAvg > 0 ? '+' : ''}${dm.aovVsAvg}%`} icon="chart-arrows-vertical" color={dm.aovVsAvg >= 0 ? '#10b981' : '#ef4444'} />
                    <MetricCard label="Spend vs Avg" value={`${dm.spentVsAvg > 0 ? '+' : ''}${dm.spentVsAvg}%`} icon="scale" color={dm.spentVsAvg >= 0 ? '#10b981' : '#ef4444'} />
                    <MetricCard label="Orders vs Avg" value={`${dm.ordersVsAvg > 0 ? '+' : ''}${dm.ordersVsAvg}%`} icon="list-numbers" color={dm.ordersVsAvg >= 0 ? '#10b981' : '#ef4444'} />
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <i className="ti ti-activity" style={{ fontSize: 48, color: '#e5e7eb', display: 'block', marginBottom: 12 }} />
                <p style={{ color: '#6b7280' }}>Deep intelligence not calculated yet. Click <strong>"🧠 Recalculate"</strong> to generate 50+ metrics.</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {convertModal.show && (
        <Modal show={convertModal.show} onClose={() => setConvertModal({show: false, customerId: ''})} onConfirm={() => convertToCompany(convertModal.customerId)} title="Convert to B2B Company" message="Convert this customer to a B2B company? An invitation email will be sent." confirmText="Convert" cancelText="Cancel" type="warning" />
      )}
    </div>
  );
}
