'use client';

import { useState, useEffect } from 'react';
import { adminFetch } from '@/lib/api-client';
import { PageHeader, StatusBadge } from '@/components/ui';
import Modal from '@/components/Modal';

interface Quote {
  id: string;
  companyName: string;
  contactEmail: string;
  status: string;
  items: { productTitle: string; quantity: number }[];
  notes?: string;
  createdAt: string;
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Quote | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminFetch('/api/v1/quotes');
        if (res.ok) { const d = await res.json(); setQuotes(d.quotes || d.data || d || []); }
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div>
      <PageHeader title="Quote Requests" subtitle={`${quotes.length} quotes`} />
      <div className="apple-card">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}><i className="ti ti-loader-2 spin" style={{ fontSize: 24, color: 'var(--accent-primary)' }} /></div>
        ) : quotes.length === 0 ? (
          <div className="empty-state" style={{ padding: 48 }}>
            <div className="empty-state-icon"><i className="ti ti-file-invoice" /></div>
            <h4 className="empty-state-title">No quote requests</h4>
            <p className="empty-state-desc">Quote requests from customers will appear here.</p>
          </div>
        ) : (
          <table className="apple-table">
            <thead><tr><th>Company</th><th>Email</th><th>Items</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {quotes.map(q => (
                <tr key={q.id}>
                  <td style={{ fontWeight: 500 }}>{q.companyName}</td>
                  <td>{q.contactEmail}</td>
                  <td>{q.items?.length || 0} items</td>
                  <td><StatusBadge status={q.status} /></td>
                  <td style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{new Date(q.createdAt).toLocaleDateString()}</td>
                  <td><button className="btn-apple primary small" onClick={() => setSelected(q)}><i className="ti ti-eye" /> View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {selected && (
        <div className="apple-modal-overlay" onClick={() => setSelected(null)}>
          <div className="apple-modal" onClick={e => e.stopPropagation()}>
            <div className="apple-modal-header"><h3 className="apple-modal-title">Quote Request</h3></div>
            <div className="apple-modal-body">
              <div style={{ marginBottom: 12 }}><strong>{selected.companyName}</strong> · {selected.contactEmail}</div>
              {selected.items?.map((item, i) => (
                <div key={i} style={{ padding: 8, background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{item.productTitle}</span><span style={{ fontWeight: 500 }}>×{item.quantity}</span>
                </div>
              ))}
              {selected.notes && <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)' }}><strong>Notes:</strong> {selected.notes}</div>}
            </div>
            <div className="apple-modal-footer">
              <button className="btn-apple secondary" onClick={() => setSelected(null)}>Close</button>
              <button className="btn-apple primary">Respond</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

