'use client';

import Modal from '@/components/Modal';
import { PageContent, PageHeader, StatsCard } from '@/components/ui/PageLayout';
import { showToast } from '@/components/ui/Toast';
import { adminFetch } from '@/lib/api-client';
import { config } from '@/lib/config';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  totalAmount: number;
  amountPaid: number;
  currency: string;
  company: { id: string; name: string };
  companyId: string;
  issueDate: string;
  dueDate: string;
  paidAt: string | null;
  fileUrl: string | null;
  notes: string | null;
  order?: { id: string; shopifyOrderNumber: string } | null;
  createdAt: string;
}

interface Company {
  id: string;
  name: string;
}

interface InvoiceStats {
  totalInvoiced: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  totalCount: number;
  paidCount: number;
  overdueCount: number;
  recentPaid30d: number;
  collectionRate: number;
  topCompanies: Array<{ name: string; total: number; paid: number; pending: number; count: number }>;
}

const statusConfig: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  paid: { bg: '#d1fae5', text: '#065f46', label: 'Paid', icon: 'ti-check' },
  unpaid: { bg: '#fef3c7', text: '#92400e', label: 'Unpaid', icon: 'ti-clock' },
  partial: { bg: '#dbeafe', text: '#1e40af', label: 'Partial', icon: 'ti-clock-pause' },
  overdue: { bg: '#fee2e2', text: '#991b1b', label: 'Overdue', icon: 'ti-alert-triangle' },
  void: { bg: '#f3f4f6', text: '#6b7280', label: 'Void', icon: 'ti-x' },
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    invoiceNumber: '',
    companyId: '',
    totalAmount: '',
    subtotal: '',
    tax: '',
    dueDate: '',
    notes: '',
  });

  const fetchInvoices = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (searchQuery) params.set('search', searchQuery);
      const res = await adminFetch(`/api/v1/invoices?${params.toString()}`);
      const data = await res.json();
      setInvoices(Array.isArray(data) ? data : []);
    } catch {
      showToast('Failed to load invoices', 'danger');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await adminFetch('/api/v1/companies');
      const data = await res.json();
      setCompanies(Array.isArray(data) ? data : (data.data || []));
    } catch { /* silent */ }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await adminFetch('/api/v1/invoices/statistics');
      const data = await res.json();
      setStats(data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchInvoices();
    fetchCompanies();
    fetchStats();
  }, [fetchInvoices, fetchCompanies, fetchStats]);

  // Auto-detect overdue on page load
  useEffect(() => {
    adminFetch('/api/v1/invoices/mark-overdue', { method: 'POST' }).catch(() => {});
  }, []);

  const handleCreateClick = () => {
    setFormData({
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      companyId: '',
      totalAmount: '',
      subtotal: '',
      tax: '',
      dueDate: '',
      notes: '',
    });
    setShowCreateModal(true);
  };

  const handleUploadSubmit = async () => {
    if (!formData.companyId) {
      showToast('Please select a company', 'warning');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const data = new FormData();
    data.append('file', file);
    data.append('companyId', formData.companyId);
    data.append('invoiceNumber', formData.invoiceNumber);
    data.append('totalAmount', formData.totalAmount);
    data.append('subtotal', formData.subtotal || formData.totalAmount);
    data.append('tax', formData.tax || '0');
    data.append('dueDate', formData.dueDate);
    data.append('notes', formData.notes);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const API_URL = config.apiUrl;

      const res = await fetch(`${API_URL}/api/v1/invoices/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: data,
      });

      if (res.ok) {
        showToast('Invoice created and uploaded successfully', 'success');
        setShowCreateModal(false);
        fetchInvoices();
        fetchStats();
      } else {
        const error = await res.json().catch(() => ({}));
        showToast(error.message || 'Upload failed', 'danger');
      }
    } catch {
      showToast('Upload failed', 'danger');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleStatusChange = async (invoiceId: string, newStatus: string) => {
    try {
      const res = await adminFetch(`/api/v1/invoices/${invoiceId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        showToast(`Status updated to ${newStatus}`, 'success');
        fetchInvoices();
        fetchStats();
      }
    } catch {
      showToast('Status update failed', 'danger');
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice || !paymentAmount) return;
    try {
      const res = await adminFetch(`/api/v1/invoices/${selectedInvoice.id}/record-payment`, {
        method: 'POST',
        body: JSON.stringify({ amount: parseFloat(paymentAmount) }),
      });
      if (res.ok) {
        showToast('Payment recorded', 'success');
        setShowPaymentModal(false);
        setPaymentAmount('');
        fetchInvoices();
        fetchStats();
      }
    } catch {
      showToast('Failed to record payment', 'danger');
    }
  };

  const handleDuplicate = async (invoiceId: string) => {
    try {
      const res = await adminFetch(`/api/v1/invoices/${invoiceId}/duplicate`, { method: 'POST' });
      if (res.ok) {
        showToast('Invoice duplicated', 'success');
        fetchInvoices();
        fetchStats();
      }
    } catch {
      showToast('Duplication failed', 'danger');
    }
  };

  const getBalance = (inv: Invoice) => Number(inv.totalAmount) - Number(inv.amountPaid);
  const isOverdue = (inv: Invoice) => inv.dueDate && new Date(inv.dueDate) < new Date() && inv.status !== 'paid' && inv.status !== 'void';

  const API_BASE_URL = config.apiUrl;

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle="Manage B2B billing, payments, and collection tracking"
        actions={[
          { label: 'Create Invoice', icon: 'plus', variant: 'primary', onClick: handleCreateClick },
        ]}
      />

      <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: 'none' }} onChange={handleFileChange} />

      {/* ─── STATS DASHBOARD ─── */}
      {stats && (
        <div style={{ marginBottom: 24 }}>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            <StatsCard title="Total Invoiced" value={`$${stats.totalInvoiced.toLocaleString()}`} icon="receipt" iconColor="primary" />
            <StatsCard title="Collected" value={`$${stats.totalPaid.toLocaleString()}`} icon="check" iconColor="success" />
            <StatsCard title="Pending" value={`$${stats.totalPending.toLocaleString()}`} icon="clock" iconColor="warning" />
            <StatsCard title="Overdue" value={`$${stats.totalOverdue.toLocaleString()}`} icon="alert-triangle" iconColor="danger" />
            <StatsCard title="Collection Rate" value={`${stats.collectionRate}%`} icon="trending-up" iconColor="info" />
          </div>

          {/* Top Companies */}
          {stats.topCompanies && stats.topCompanies.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              marginTop: 16,
            }}>
              <div className="apple-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>
                  <i className="ti ti-building" style={{ marginRight: 6 }} />
                  Top Companies by Invoice Volume
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stats.topCompanies.map((c, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 8,
                    }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 8 }}>
                          {c.count} invoice{c.count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>${c.total.toLocaleString()}</div>
                        {c.pending > 0 && (
                          <span style={{ fontSize: 10, color: '#f59e0b' }}>${c.pending.toLocaleString()} pending</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Filters */}
              <div className="apple-card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>
                  <i className="ti ti-filter" style={{ marginRight: 6 }} />
                  Quick Filters
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {['', 'unpaid', 'partial', 'overdue', 'paid', 'void'].map(status => {
                    const label = status || 'All';
                    const sc = status ? statusConfig[status] : null;
                    return (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 500,
                          background: statusFilter === status ? (sc?.bg || 'var(--accent-blue)') : 'var(--bg-secondary)',
                          color: statusFilter === status ? (sc?.text || '#fff') : 'var(--text-secondary)',
                          border: statusFilter === status ? `2px solid ${sc?.bg || 'var(--accent-blue)'}` : '2px solid transparent',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {sc && <i className={`ti ${sc.icon}`} style={{ marginRight: 4, fontSize: 11 }} />}
                        {label.charAt(0).toUpperCase() + label.slice(1)}
                        {status && statusFilter !== status && (
                          <span style={{ marginLeft: 4, opacity: 0.6 }}>
                            ({invoices.filter(i => i.status === status).length})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Search */}
                <div style={{ marginTop: 16 }}>
                  <div style={{ position: 'relative' }}>
                    <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                    <input
                      type="text"
                      className="apple-input"
                      placeholder="Search invoices or companies..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{ paddingLeft: 36 }}
                    />
                  </div>
                </div>

                {/* Quick Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
                  <div style={{ padding: 10, background: 'var(--bg-tertiary)', borderRadius: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Last 30 Days Collected</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-green)' }}>
                      ${stats.recentPaid30d.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ padding: 10, background: 'var(--bg-tertiary)', borderRadius: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Overdue Invoices</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: stats.overdueCount > 0 ? '#ef4444' : 'var(--text-primary)' }}>
                      {stats.overdueCount}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── INVOICE TABLE ─── */}
      <PageContent loading={loading}>
        <div className="apple-card">
          <table className="apple-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Company</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>File</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center" style={{ padding: 40, color: 'var(--text-tertiary)' }}>
                    <i className="ti ti-file-invoice" style={{ fontSize: 36, display: 'block', marginBottom: 8 }} />
                    No invoices found. Create your first invoice to get started.
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => {
                  const balance = getBalance(invoice);
                  const overdue = isOverdue(invoice);
                  const sc = statusConfig[invoice.status] || statusConfig.unpaid;

                  return (
                    <tr key={invoice.id} style={{ background: overdue && invoice.status !== 'overdue' ? '#fff5f5' : undefined }}>
                      <td>
                        <button
                          onClick={() => { setSelectedInvoice(invoice); setShowDetailModal(true); }}
                          style={{ fontWeight: 600, color: 'var(--accent-blue)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          {invoice.invoiceNumber}
                        </button>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500 }}>{invoice.company?.name}</span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {new Date(invoice.issueDate).toLocaleDateString()}
                      </td>
                      <td>
                        <span style={{
                          fontSize: 12,
                          color: overdue ? '#ef4444' : 'var(--text-secondary)',
                          fontWeight: overdue ? 600 : 400,
                        }}>
                          {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '—'}
                          {overdue && <i className="ti ti-alert-triangle" style={{ marginLeft: 4, fontSize: 11 }} />}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>${Number(invoice.totalAmount).toFixed(2)}</td>
                      <td style={{ color: Number(invoice.amountPaid) > 0 ? '#10b981' : 'var(--text-tertiary)', fontWeight: 500 }}>
                        ${Number(invoice.amountPaid).toFixed(2)}
                      </td>
                      <td style={{ fontWeight: 600, color: balance > 0 ? '#f59e0b' : '#10b981' }}>
                        ${balance.toFixed(2)}
                      </td>
                      <td>
                        {invoice.fileUrl ? (
                          <a href={`${API_BASE_URL}${invoice.fileUrl}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)', fontSize: 12, textDecoration: 'none' }}>
                            <i className="ti ti-file-check" style={{ marginRight: 4 }} />VIEW
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>—</span>
                        )}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '2px 10px', borderRadius: 16, fontSize: 11, fontWeight: 600,
                          background: sc.bg, color: sc.text,
                        }}>
                          <i className={`ti ${sc.icon}`} style={{ fontSize: 11 }} />
                          {sc.label}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {/* Record Payment */}
                          {invoice.status !== 'paid' && invoice.status !== 'void' && (
                            <button
                              className="btn-apple ghost small"
                              onClick={() => { setSelectedInvoice(invoice); setPaymentAmount(''); setShowPaymentModal(true); }}
                              title="Record Payment"
                            >
                              <i className="ti ti-cash" />
                            </button>
                          )}

                          {/* Mark Paid */}
                          {invoice.status !== 'paid' && invoice.status !== 'void' && (
                            <button
                              className="btn-apple ghost small"
                              onClick={() => handleStatusChange(invoice.id, 'paid')}
                              title="Mark as Paid"
                              style={{ color: '#10b981' }}
                            >
                              <i className="ti ti-check" />
                            </button>
                          )}

                          {/* Void */}
                          {invoice.status !== 'void' && (
                            <button
                              className="btn-apple ghost small"
                              onClick={() => handleStatusChange(invoice.id, 'void')}
                              title="Void Invoice"
                              style={{ color: '#9ca3af' }}
                            >
                              <i className="ti ti-x" />
                            </button>
                          )}

                          {/* Duplicate */}
                          <button
                            className="btn-apple ghost small"
                            onClick={() => handleDuplicate(invoice.id)}
                            title="Duplicate"
                          >
                            <i className="ti ti-copy" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </PageContent>

      {/* ─── CREATE INVOICE MODAL ─── */}
      <Modal
        show={showCreateModal}
        onClose={() => !uploading && setShowCreateModal(false)}
        title="Create New Invoice"
        confirmText={uploading ? 'Uploading...' : 'Select File & Upload'}
        onConfirm={handleUploadSubmit}
        loading={uploading}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 10 }}>
          <div className="form-group">
            <label className="apple-label">Company</label>
            <select
              className="apple-input"
              value={formData.companyId}
              onChange={e => setFormData({ ...formData, companyId: e.target.value })}
              required
            >
              <option value="">Select Company...</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="apple-label">Invoice Number</label>
              <input
                type="text"
                className="apple-input"
                value={formData.invoiceNumber}
                onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="apple-label">Due Date</label>
              <input
                type="date"
                className="apple-input"
                value={formData.dueDate}
                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="apple-label">Subtotal ($)</label>
              <input
                type="number"
                step="0.01"
                className="apple-input"
                placeholder="0.00"
                value={formData.subtotal}
                onChange={e => {
                  const subtotal = e.target.value;
                  const tax = formData.tax || '0';
                  const total = (parseFloat(subtotal || '0') + parseFloat(tax || '0')).toFixed(2);
                  setFormData({ ...formData, subtotal, totalAmount: total });
                }}
              />
            </div>
            <div className="form-group">
              <label className="apple-label">Tax ($)</label>
              <input
                type="number"
                step="0.01"
                className="apple-input"
                placeholder="0.00"
                value={formData.tax}
                onChange={e => {
                  const tax = e.target.value;
                  const subtotal = formData.subtotal || '0';
                  const total = (parseFloat(subtotal || '0') + parseFloat(tax || '0')).toFixed(2);
                  setFormData({ ...formData, tax, totalAmount: total });
                }}
              />
            </div>
            <div className="form-group">
              <label className="apple-label">Total ($)</label>
              <input
                type="number"
                step="0.01"
                className="apple-input"
                placeholder="0.00"
                value={formData.totalAmount}
                readOnly
                style={{ background: 'var(--bg-tertiary)', fontWeight: 700 }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="apple-label">Notes</label>
            <textarea
              className="apple-input"
              rows={3}
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Invoice notes..."
            />
          </div>
        </div>
      </Modal>

      {/* ─── PAYMENT MODAL ─── */}
      {showPaymentModal && selectedInvoice && (
        <Modal
          show={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onConfirm={handleRecordPayment}
          title={`Record Payment — ${selectedInvoice.invoiceNumber}`}
          confirmText="Record Payment"
          type="primary"
        >
          <div style={{ marginTop: 10 }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
              padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 16,
            }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Total Amount</span>
                <div style={{ fontWeight: 700, fontSize: 16 }}>${Number(selectedInvoice.totalAmount).toFixed(2)}</div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Already Paid</span>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#10b981' }}>
                  ${Number(selectedInvoice.amountPaid).toFixed(2)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Balance</span>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#f59e0b' }}>
                  ${getBalance(selectedInvoice).toFixed(2)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Company</span>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{selectedInvoice.company?.name}</div>
              </div>
            </div>

            <div className="form-group">
              <label className="apple-label">Payment Amount ($)</label>
              <input
                type="number"
                step="0.01"
                className="apple-input"
                placeholder="Enter amount..."
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                autoFocus
              />
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button
                  className="btn-apple ghost small"
                  onClick={() => setPaymentAmount(getBalance(selectedInvoice).toFixed(2))}
                >
                  Pay Full Balance
                </button>
                <button
                  className="btn-apple ghost small"
                  onClick={() => setPaymentAmount((getBalance(selectedInvoice) / 2).toFixed(2))}
                >
                  Pay 50%
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── DETAIL MODAL ─── */}
      {showDetailModal && selectedInvoice && (
        <Modal
          show={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          onConfirm={() => setShowDetailModal(false)}
          title={`Invoice Details — ${selectedInvoice.invoiceNumber}`}
          confirmText="Close"
          type="primary"
        >
          <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 8 }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
              marginTop: 10,
            }}>
              <div className="apple-card" style={{ padding: 16 }}>
                <h4 style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10, textTransform: 'uppercase' }}>Invoice Info</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div><span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Number</span><div style={{ fontWeight: 600 }}>{selectedInvoice.invoiceNumber}</div></div>
                  <div><span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Issue Date</span><div>{new Date(selectedInvoice.issueDate).toLocaleDateString()}</div></div>
                  <div><span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Due Date</span><div>{selectedInvoice.dueDate ? new Date(selectedInvoice.dueDate).toLocaleDateString() : '—'}</div></div>
                  {selectedInvoice.paidAt && <div><span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Paid At</span><div style={{ color: '#10b981' }}>{new Date(selectedInvoice.paidAt).toLocaleDateString()}</div></div>}
                </div>
              </div>

              <div className="apple-card" style={{ padding: 16 }}>
                <h4 style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10, textTransform: 'uppercase' }}>Amounts</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Total</span>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>${Number(selectedInvoice.totalAmount).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Paid</span>
                    <span style={{ fontWeight: 600, color: '#10b981' }}>${Number(selectedInvoice.amountPaid).toFixed(2)}</span>
                  </div>
                  <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600 }}>Balance</span>
                    <span style={{ fontWeight: 700, fontSize: 16, color: getBalance(selectedInvoice) > 0 ? '#f59e0b' : '#10b981' }}>
                      ${getBalance(selectedInvoice).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="apple-card" style={{ padding: 16, marginTop: 12 }}>
              <h4 style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10, textTransform: 'uppercase' }}>Company</h4>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{selectedInvoice.company?.name}</div>
              {selectedInvoice.order && (
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                  Linked Order: #{selectedInvoice.order.shopifyOrderNumber}
                </div>
              )}
            </div>

            {selectedInvoice.notes && (
              <div className="apple-card" style={{ padding: 16, marginTop: 12 }}>
                <h4 style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6, textTransform: 'uppercase' }}>Notes</h4>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{selectedInvoice.notes}</p>
              </div>
            )}

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              {selectedInvoice.fileUrl && (
                <a
                  href={`${API_BASE_URL}${selectedInvoice.fileUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-apple secondary small"
                  style={{ textDecoration: 'none' }}
                >
                  <i className="ti ti-file-download" style={{ marginRight: 4 }} />
                  Download File
                </a>
              )}
              {selectedInvoice.status !== 'paid' && selectedInvoice.status !== 'void' && (
                <button className="btn-apple primary small" onClick={() => { setShowDetailModal(false); setPaymentAmount(''); setShowPaymentModal(true); }}>
                  <i className="ti ti-cash" style={{ marginRight: 4 }} />
                  Record Payment
                </button>
              )}
              <button className="btn-apple ghost small" onClick={() => { handleDuplicate(selectedInvoice.id); setShowDetailModal(false); }}>
                <i className="ti ti-copy" style={{ marginRight: 4 }} />
                Duplicate
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
