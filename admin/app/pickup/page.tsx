'use client';

import { adminFetch } from '@/lib/api-client';
import { useEffect, useState } from 'react';

interface PickupOrder {
  id: string;
  qrCode: string;
  status: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  designFiles: any[];
  notes: string;
  shelf: { id: string; code: string; name: string } | null;
  order: { shopifyOrderNumber: string; totalPrice: number; lineItems: any } | null;
  assignedAt: string | null;
  readyAt: string | null;
  pickedUpAt: string | null;
  createdAt: string;
}

interface Shelf {
  id: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  _count: { pickupOrders: number };
}

interface Stats {
  pending: number;
  processing: number;
  ready: number;
  pickedUp: number;
  totalShelves: number;
}

export default function PickupPage() {
  const [orders, setOrders] = useState<PickupOrder[]>([]);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'shelves'>('orders');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Shelf form
  const [showShelfModal, setShowShelfModal] = useState(false);
  const [shelfForm, setShelfForm] = useState({ code: '', name: '', description: '' });
  const [editingShelf, setEditingShelf] = useState<string | null>(null);

  // Assign shelf modal
  const [assignModal, setAssignModal] = useState<{ orderId: string; orderNumber: string } | null>(null);
  const [selectedShelfId, setSelectedShelfId] = useState('');

  useEffect(() => {
    loadData();
  }, [statusFilter, searchQuery]);

  const loadData = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (searchQuery) params.set('search', searchQuery);

      const [ordersRes, shelvesRes, statsRes] = await Promise.all([
        adminFetch(`/api/v1/pickup/orders?${params}`),
        adminFetch('/api/v1/pickup/shelves'),
        adminFetch('/api/v1/pickup/orders/stats'),
      ]);

      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (shelvesRes.ok) setShelves(await shelvesRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleCreateShelf = async () => {
    const url = editingShelf ? `/api/v1/pickup/shelves/${editingShelf}` : '/api/v1/pickup/shelves';
    const method = editingShelf ? 'PATCH' : 'POST';
    await adminFetch(url, { method, body: JSON.stringify(shelfForm) });
    setShowShelfModal(false);
    setShelfForm({ code: '', name: '', description: '' });
    setEditingShelf(null);
    loadData();
  };

  const handleDeleteShelf = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shelf?')) return;
    await adminFetch(`/api/v1/pickup/shelves/${id}`, { method: 'DELETE' });
    loadData();
  };

  const handleAssignShelf = async () => {
    if (!assignModal || !selectedShelfId) return;
    await adminFetch(`/api/v1/pickup/orders/${assignModal.orderId}/assign-shelf`, {
      method: 'PATCH', body: JSON.stringify({ shelfId: selectedShelfId }),
    });
    setAssignModal(null);
    setSelectedShelfId('');
    loadData();
  };

  const handleStatusUpdate = async (orderId: string, status: string) => {
    await adminFetch(`/api/v1/pickup/orders/${orderId}/status`, {
      method: 'PATCH', body: JSON.stringify({ status }),
    });
    loadData();
  };

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      pending: 'var(--accent-orange)',
      processing: 'var(--accent-blue)',
      ready: 'var(--accent-green)',
      notified: 'var(--accent-teal)',
      picked_up: 'var(--accent-purple)',
      completed: 'var(--text-quaternary)',
    };
    return map[status] || 'var(--text-tertiary)';
  };

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: 'Order Received',
      processing: 'Preparing',
      ready: 'Ready for Pickup',
      notified: 'Notified',
      picked_up: 'Picked Up',
      completed: 'Completed',
    };
    return map[status] || status;
  };

  return (
    <>
      <div className="page-header mb-24">
        <div>
          <h1 className="page-title">Pickup Management</h1>
          <p className="page-subtitle">Shelf assignment, QR management and order tracking</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid cols-5" style={{ marginBottom: 24 }}>
          {[
            { label: 'Received', value: stats.pending, icon: 'ti-clock', color: 'orange' },
            { label: 'Preparing', value: stats.processing, icon: 'ti-loader', color: 'blue' },
            { label: 'Ready', value: stats.ready, icon: 'ti-check', color: 'green' },
            { label: 'Picked Up', value: stats.pickedUp, icon: 'ti-package', color: 'purple' },
            { label: 'Total Shelves', value: stats.totalShelves, icon: 'ti-layout-grid', color: 'teal' },
          ].map(s => (
            <div className="stat-card" key={s.label}>
              <div className={`stat-icon ${s.color}`}><i className={`ti ${s.icon}`} /></div>
              <div className="stat-content">
                <div className="stat-label">{s.label}</div>
                <div className="stat-value">{s.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="apple-tabs" style={{ marginBottom: 20 }}>
        <button className={`apple-tab ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
          <i className="ti ti-package" style={{ marginRight: 6 }} /> Pickup Orders
        </button>
        <button className={`apple-tab ${activeTab === 'shelves' ? 'active' : ''}`} onClick={() => setActiveTab('shelves')}>
          <i className="ti ti-layout-grid" style={{ marginRight: 6 }} /> Shelf Management
        </button>
      </div>

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="apple-card">
          <div className="apple-card-header" style={{ padding: '16px 22px' }}>
            <div className="flex items-center gap-12">
              <div className="header-search" style={{ width: 220 }}>
                <i className="ti ti-search header-search-icon" />
                <input placeholder="Search orders..." value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: 13, color: 'var(--text-primary)' }} />
              </div>
              <select className="select-apple" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 160 }}>
                <option value="">All Statuses</option>
                <option value="pending">Order Received</option>
                <option value="processing">Preparing</option>
                <option value="ready">Ready for Pickup</option>
                <option value="notified">Notified</option>
                <option value="picked_up">Picked Up</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <div className="apple-table-wrapper">
            <table className="apple-table">
              <thead><tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Shelf</th>
                <th>QR Code</th>
                <th>Files</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>Loading...</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>No pickup orders yet.</td></tr>
                ) : orders.map(o => (
                  <tr key={o.id}>
                    <td><span style={{ fontWeight: 600 }}>#{o.orderNumber || '—'}</span></td>
                    <td>
                      <div style={{ fontSize: 13 }}>{o.customerName || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{o.customerEmail}</div>
                    </td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, background: `color-mix(in srgb, ${statusColor(o.status)} 12%, transparent)`, color: statusColor(o.status), fontSize: 11, fontWeight: 600 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor(o.status) }} />
                        {statusLabel(o.status)}
                      </div>
                    </td>
                    <td>
                      {o.shelf ? (
                        <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--accent-blue)' }}>{o.shelf.code}</span>
                      ) : (
                        <button className="btn-apple secondary sm" onClick={() => setAssignModal({ orderId: o.id, orderNumber: o.orderNumber })}>
                          <i className="ti ti-plus" style={{ fontSize: 12 }} /> Ata
                        </button>
                      )}
                    </td>
                    <td><code style={{ fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: 4 }}>{o.qrCode}</code></td>
                    <td>
                      {Array.isArray(o.designFiles) && o.designFiles.length > 0 ? (
                        <span style={{ fontSize: 12, color: 'var(--accent-green)' }}>
                          <i className="ti ti-file" /> {o.designFiles.length} file(s)
                        </span>
                      ) : <span style={{ fontSize: 12, color: 'var(--text-quaternary)' }}>—</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex items-center gap-8" style={{ justifyContent: 'flex-end' }}>
                        {o.status === 'pending' && <button className="btn-apple primary sm" onClick={() => handleStatusUpdate(o.id, 'processing')}>İşleme Al</button>}
                        {o.status === 'processing' && <button className="btn-apple success sm" onClick={() => handleStatusUpdate(o.id, 'ready')}>Hazır</button>}
                        {o.status === 'ready' && <button className="btn-apple sm" style={{ background: 'var(--accent-teal-soft)', color: 'var(--accent-teal)' }} onClick={() => handleStatusUpdate(o.id, 'notified')}>Bildir</button>}
                        {(o.status === 'notified' || o.status === 'ready') && <button className="btn-apple sm" style={{ background: 'var(--accent-purple-soft)', color: 'var(--accent-purple)' }} onClick={() => handleStatusUpdate(o.id, 'picked_up')}>Alındı</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Shelves Tab */}
      {activeTab === 'shelves' && (
        <div className="apple-card">
          <div className="apple-card-header" style={{ padding: '16px 22px' }}>
            <span className="apple-card-title">Shelf Definitions</span>
            <button className="btn-apple primary sm" onClick={() => { setShowShelfModal(true); setEditingShelf(null); setShelfForm({ code: '', name: '', description: '' }); }}>
              <i className="ti ti-plus" /> New Shelf
            </button>
          </div>
          <div className="apple-table-wrapper">
            <table className="apple-table">
              <thead><tr>
                <th>Code</th>
                <th>Name</th>
                <th>Description</th>
                <th>Order Count</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr></thead>
              <tbody>
                {shelves.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>No shelves defined yet. Add a new shelf above.</td></tr>
                ) : shelves.map(s => (
                  <tr key={s.id}>
                    <td><span style={{ fontWeight: 700, fontSize: 16, color: 'var(--accent-blue)' }}>{s.code}</span></td>
                    <td>{s.name || '—'}</td>
                    <td style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{s.description || '—'}</td>
                    <td><span style={{ fontWeight: 600 }}>{s._count?.pickupOrders || 0}</span></td>
                    <td>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.isActive ? 'var(--accent-green)' : 'var(--accent-red)' }} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn-apple ghost sm" onClick={() => { setEditingShelf(s.id); setShelfForm({ code: s.code, name: s.name || '', description: s.description || '' }); setShowShelfModal(true); }}>
                        <i className="ti ti-edit" />
                      </button>
                      <button className="btn-apple ghost sm" style={{ color: 'var(--accent-red)' }} onClick={() => handleDeleteShelf(s.id)}>
                        <i className="ti ti-trash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Shelf Modal */}
      {showShelfModal && (
        <div className="apple-modal-overlay" onClick={() => setShowShelfModal(false)}>
          <div className="apple-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="apple-modal-header">
              <h3>{editingShelf ? 'Edit Shelf' : 'Add New Shelf'}</h3>
              <button className="apple-modal-close" onClick={() => setShowShelfModal(false)}>
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="apple-modal-body">
              <div className="form-group">
                <label className="input-label">Shelf Code *</label>
                <input className="input-apple-field" placeholder="e.g. A-1, B-3, C-12" value={shelfForm.code} onChange={e => setShelfForm(f => ({ ...f, code: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="input-label">Name</label>
                <input className="input-apple-field" placeholder="e.g. Left Rack - Top Section" value={shelfForm.name} onChange={e => setShelfForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="input-label">Description</label>
                <textarea className="input-apple-field" placeholder="Location info visible to customers..." value={shelfForm.description} onChange={e => setShelfForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <div className="apple-modal-footer">
              <button className="btn-apple secondary" onClick={() => setShowShelfModal(false)}>Cancel</button>
              <button className="btn-apple primary" onClick={handleCreateShelf} disabled={!shelfForm.code}>
                {editingShelf ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Shelf Modal */}
      {assignModal && (
        <div className="apple-modal-overlay" onClick={() => setAssignModal(null)}>
          <div className="apple-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="apple-modal-header">
              <h3>Assign Shelf — #{assignModal.orderNumber}</h3>
              <button className="apple-modal-close" onClick={() => setAssignModal(null)}>
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="apple-modal-body">
              <div className="form-group">
                <label className="input-label">Select Shelf</label>
                <select className="select-apple" value={selectedShelfId} onChange={e => setSelectedShelfId(e.target.value)}>
                  <option value="">— Select —</option>
                  {shelves.filter(s => s.isActive).map(s => (
                    <option key={s.id} value={s.id}>{s.code} {s.name ? `— ${s.name}` : ''}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="apple-modal-footer">
              <button className="btn-apple secondary" onClick={() => setAssignModal(null)}>Cancel</button>
              <button className="btn-apple primary" onClick={handleAssignShelf} disabled={!selectedShelfId}>Assign Shelf</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
