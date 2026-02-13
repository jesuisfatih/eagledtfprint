'use client';

import { PageHeader, StatusBadge, showToast } from '@/components/ui';
import { adminFetch } from '@/lib/api-client';
import { useCallback, useEffect, useState } from 'react';

interface Ticket {
  id: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  createdAt: string;
  customerEmail?: string;
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ subject: '', description: '', priority: 'medium', customerEmail: '' });
  const [submitting, setSubmitting] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/v1/support-tickets');
      if (res.ok) { const d = await res.json(); setTickets(d.tickets || d.data || d || []); }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await adminFetch('/api/v1/support-tickets', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      if (res.ok) {
        showToast('Ticket created!', 'success');
        setForm({ subject: '', description: '', priority: 'medium', customerEmail: '' });
        const d = await res.json();
        setTickets(prev => [d, ...prev]);
      } else showToast('Failed to create ticket', 'danger');
    } catch { showToast('Error', 'danger'); }
    finally { setSubmitting(false); }
  };

  return (
    <div>
      <PageHeader title="Support Tickets" subtitle="Manage customer support" />
      <div className="content-grid cols-2" style={{ gap: 20 }}>
        {/* Create Ticket */}
        <div className="apple-card">
          <div className="apple-card-header"><h3 className="apple-card-title">New Ticket</h3></div>
          <div className="apple-card-body">
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label className="input-label">Subject</label>
                <div className="input-apple">
                  <input placeholder="Ticket subject" value={form.subject} onChange={e => setForm(p => ({...p, subject: e.target.value}))} required />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="input-label">Customer Email</label>
                <div className="input-apple">
                  <i className="ti ti-mail input-icon" />
                  <input type="email" placeholder="customer@example.com" value={form.customerEmail} onChange={e => setForm(p => ({...p, customerEmail: e.target.value}))} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="input-label">Priority</label>
                <select className="select-apple" value={form.priority} onChange={e => setForm(p => ({...p, priority: e.target.value}))}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="input-label">Description</label>
                <div className="input-apple">
                  <textarea placeholder="Describe the issue..." value={form.description}
                    onChange={e => setForm(p => ({...p, description: e.target.value}))} required
                    style={{ minHeight: 100, resize: 'vertical', border: 'none', outline: 'none', width: '100%', fontFamily: 'inherit', fontSize: 14 }} />
                </div>
              </div>
              <button type="submit" className="btn-apple primary" disabled={submitting} style={{ width: '100%', justifyContent: 'center' }}>
                {submitting ? <><i className="ti ti-loader-2 spin" /> Creating...</> : <><i className="ti ti-plus" /> Create Ticket</>}
              </button>
            </form>
          </div>
        </div>

        {/* Ticket List */}
        <div className="apple-card">
          <div className="apple-card-header"><h3 className="apple-card-title">Recent Tickets</h3></div>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}><i className="ti ti-loader-2 spin" style={{ fontSize: 24, color: 'var(--accent-primary)' }} /></div>
          ) : tickets.length === 0 ? (
            <div className="empty-state" style={{ padding: 48 }}>
              <div className="empty-state-icon"><i className="ti ti-help" /></div>
              <h4 className="empty-state-title">No tickets</h4>
            </div>
          ) : (
            <table className="apple-table">
              <thead><tr><th>Subject</th><th>Priority</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 500 }}>{t.subject}</td>
                    <td><StatusBadge status={t.priority} colorMap={{ low: 'secondary', medium: 'info', high: 'warning', urgent: 'danger' }} /></td>
                    <td><StatusBadge status={t.status} /></td>
                    <td style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
