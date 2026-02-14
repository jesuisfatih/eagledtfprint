'use client';

import Modal from '@/components/Modal';
import { showToast } from '@/components/ui/Toast';
import { adminFetch } from '@/lib/api-client';
import { useCallback, useEffect, useState } from 'react';

interface CustomerList {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  isSystem: boolean;
  systemType: string | null;
  customerCount: number;
}

interface AlarmSummary {
  id: string;
  systemType: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  customerCount: number;
  preview: Array<{
    id: string;
    name: string;
    email: string;
    totalSpent: number;
    ordersCount: number;
    daysSinceLastOrder: number | null;
    churnRisk: string | null;
  }>;
}

interface Props {
  onViewList: (listId: string, listName: string) => void;
  onAddToList: (listId: string) => void;
  selectedCustomerIds: string[];
  refreshTrigger: number;
}

export default function CustomerListsPanel({ onViewList, onAddToList, selectedCustomerIds, refreshTrigger }: Props) {
  const [lists, setLists] = useState<CustomerList[]>([]);
  const [alarms, setAlarms] = useState<AlarmSummary[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', color: '#3b82f6' });
  const [activeTab, setActiveTab] = useState<'alarms' | 'lists'>('alarms');

  const loadLists = useCallback(async () => {
    try {
      const res = await adminFetch('/api/v1/customer-lists');
      setLists(await res.json());
    } catch { /* silent */ }
  }, []);

  const loadAlarms = useCallback(async () => {
    try {
      const res = await adminFetch('/api/v1/customer-lists/alarms/summary');
      setAlarms(await res.json());
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadLists(); loadAlarms(); }, [loadLists, loadAlarms, refreshTrigger]);

  const generateAlarms = async () => {
    try {
      setGenerating(true);
      const res = await adminFetch('/api/v1/customer-lists/alarms/generate', { method: 'POST' });
      const data = await res.json();
      showToast(`${data.generated} smart alarm(s) generated!`, 'success');
      loadAlarms();
      loadLists();
    } catch { showToast('Failed to generate alarms', 'danger'); }
    finally { setGenerating(false); }
  };

  const createList = async () => {
    if (!formData.name.trim()) { showToast('List name is required', 'warning'); return; }
    try {
      await adminFetch('/api/v1/customer-lists', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      showToast('List created!', 'success');
      setShowCreateModal(false);
      setFormData({ name: '', description: '', color: '#3b82f6' });
      loadLists();
    } catch { showToast('Failed to create list', 'danger'); }
  };

  const deleteList = async (listId: string) => {
    try {
      await adminFetch(`/api/v1/customer-lists/${listId}`, { method: 'DELETE' });
      showToast('List deleted', 'success');
      loadLists();
    } catch { showToast('Cannot delete system lists', 'danger'); }
  };

  const addSelectedToList = async (listId: string) => {
    if (selectedCustomerIds.length === 0) { showToast('Select customers first', 'warning'); return; }
    try {
      const res = await adminFetch(`/api/v1/customer-lists/${listId}/customers`, {
        method: 'POST',
        body: JSON.stringify({ customerIds: selectedCustomerIds }),
      });
      const data = await res.json();
      showToast(`${data.added} customer(s) added to list`, 'success');
      loadLists();
      loadAlarms();
    } catch { showToast('Failed to add customers', 'danger'); }
  };

  const customLists = lists.filter(l => !l.isSystem);

  const riskColors: Record<string, string> = { low: '#10b981', medium: '#f59e0b', high: '#ef4444', critical: '#dc2626' };

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Tab Selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setActiveTab('alarms')} style={{
          padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          background: activeTab === 'alarms' ? '#ef4444' : '#f3f4f6',
          color: activeTab === 'alarms' ? '#fff' : '#374151',
          border: 'none', transition: 'all 0.15s',
        }}>
          🚨 Smart Alarms {alarms.length > 0 && <span style={{ marginLeft: 4, background: 'rgba(255,255,255,0.3)', padding: '1px 6px', borderRadius: 8, fontSize: 11 }}>{alarms.length}</span>}
        </button>
        <button onClick={() => setActiveTab('lists')} style={{
          padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          background: activeTab === 'lists' ? '#3b82f6' : '#f3f4f6',
          color: activeTab === 'lists' ? '#fff' : '#374151',
          border: 'none', transition: 'all 0.15s',
        }}>
          📋 My Lists {customLists.length > 0 && <span style={{ marginLeft: 4, opacity: 0.7 }}>({customLists.length})</span>}
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="btn-apple secondary small" onClick={generateAlarms} disabled={generating}>
            <i className="ti ti-bolt" style={{ marginRight: 4 }} />{generating ? 'Generating...' : 'Refresh Alarms'}
          </button>
          <button className="btn-apple primary small" onClick={() => setShowCreateModal(true)}>
            <i className="ti ti-plus" style={{ marginRight: 4 }} />New List
          </button>
        </div>
      </div>

      {/* ALARMS TAB */}
      {activeTab === 'alarms' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {alarms.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 30, color: '#9ca3af' }}>
              <i className="ti ti-bell-off" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
              No alarms yet. Click "Refresh Alarms" after calculating insights.
            </div>
          ) : alarms.map(alarm => (
            <div key={alarm.id} style={{
              background: '#fff', borderRadius: 12, padding: 16,
              border: `2px solid ${alarm.color}22`, borderLeft: `4px solid ${alarm.color}`,
              cursor: 'pointer', transition: 'all 0.15s',
            }} onClick={() => onViewList(alarm.id, alarm.name)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: '#1f2937' }}>{alarm.name}</h4>
                  <p style={{ fontSize: 11, color: '#6b7280', margin: '4px 0 0' }}>{alarm.description}</p>
                </div>
                <span style={{
                  background: alarm.color, color: '#fff', padding: '4px 10px',
                  borderRadius: 16, fontSize: 14, fontWeight: 700, minWidth: 32, textAlign: 'center',
                }}>{alarm.customerCount}</span>
              </div>
              {alarm.preview.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                  {alarm.preview.slice(0, 3).map(c => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 8px', background: '#f9fafb', borderRadius: 6 }}>
                      <span style={{ fontWeight: 500 }}>{c.name || c.email}</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <span style={{ color: '#6b7280' }}>${c.totalSpent.toLocaleString()}</span>
                        {c.daysSinceLastOrder != null && (
                          <span style={{ color: riskColors[c.churnRisk || 'low'] || '#6b7280' }}>
                            {c.daysSinceLastOrder}d ago
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {alarm.customerCount > 3 && (
                    <span style={{ fontSize: 11, color: '#3b82f6', textAlign: 'center' }}>
                      +{alarm.customerCount - 3} more — click to view all
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* LISTS TAB */}
      {activeTab === 'lists' && (
        <div>
          {/* Add to List (when customers selected) */}
          {selectedCustomerIds.length > 0 && (
            <div style={{
              padding: '10px 14px', background: '#f0f9ff', borderRadius: 8,
              border: '1px solid #bae6fd', marginBottom: 12,
              display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#0369a1' }}>
                {selectedCustomerIds.length} customer(s) selected
              </span>
              <span style={{ fontSize: 11, color: '#6b7280' }}>→ Add to:</span>
              {customLists.map(l => (
                <button key={l.id} className="btn-apple ghost small" onClick={() => addSelectedToList(l.id)}
                  style={{ borderColor: l.color || '#3b82f6', color: l.color || '#3b82f6', fontSize: 11 }}>
                  {l.name}
                </button>
              ))}
              {customLists.length === 0 && (
                <span style={{ fontSize: 11, color: '#9ca3af' }}>Create a list first</span>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {customLists.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 30, color: '#9ca3af' }}>
                <i className="ti ti-list" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
                No custom lists yet. Create your first list!
              </div>
            ) : customLists.map(list => (
              <div key={list.id} style={{
                background: '#fff', borderRadius: 10, padding: 14,
                border: '1px solid #e5e7eb', borderLeft: `3px solid ${list.color || '#3b82f6'}`,
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>
                    <i className={`ti ti-${list.icon || 'list'}`} style={{ marginRight: 4, color: list.color || '#3b82f6' }} />
                    {list.name}
                  </h4>
                  <span style={{
                    background: `${list.color || '#3b82f6'}20`, color: list.color || '#3b82f6',
                    padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                  }}>{list.customerCount}</span>
                </div>
                {list.description && <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>{list.description}</p>}
                <div style={{ display: 'flex', gap: 4, marginTop: 'auto' }}>
                  <button className="btn-apple ghost small" onClick={() => onViewList(list.id, list.name)} style={{ flex: 1 }}>
                    <i className="ti ti-eye" style={{ marginRight: 2 }} />View
                  </button>
                  <button className="btn-apple ghost small" onClick={() => deleteList(list.id)} style={{ color: '#ef4444' }}>
                    <i className="ti ti-trash" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create List Modal */}
      <Modal show={showCreateModal} onClose={() => setShowCreateModal(false)} onConfirm={createList}
        title="Create Custom List" confirmText="Create" type="primary">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 10 }}>
          <div className="form-group">
            <label className="apple-label">List Name</label>
            <input type="text" className="apple-input" placeholder="e.g. To Call, VIP Follow-up..."
              value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} autoFocus />
          </div>
          <div className="form-group">
            <label className="apple-label">Description (optional)</label>
            <textarea className="apple-input" rows={2} placeholder="What is this list for?"
              value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="apple-label">Color</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'].map(c => (
                <button key={c} onClick={() => setFormData({ ...formData, color: c })} style={{
                  width: 28, height: 28, borderRadius: '50%', background: c, border: formData.color === c ? '3px solid #1f2937' : '3px solid transparent',
                  cursor: 'pointer', transition: 'all 0.1s',
                }} />
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
