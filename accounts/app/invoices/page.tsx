'use client';

import { accountsFetch } from '@/lib/api-client';
import { getCompanyIdSync } from '@/lib/auth-context';
import { useEffect, useState } from 'react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  totalAmount: number;
  amountPaid: number;
  issueDate: string;
  dueDate: string;
  fileUrl?: string;
}

export default function MyInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const companyId = getCompanyIdSync();
    if (companyId) {
      fetchInvoices(companyId);
    }
  }, []);

  const fetchInvoices = async (companyId: string) => {
    try {
      const res = await accountsFetch(`/api/v1/invoices?companyId=${companyId}`);
      const data = await res.json();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load invoices');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#34c759';
      case 'unpaid': return '#ff9500';
      case 'overdue': return '#ff3b30';
      default: return '#86868b';
    }
  };

  return (
    <div className="app-content">
      <div className="page-header">
        <h1 className="page-title">Billing & Invoices</h1>
        <p className="page-subtitle">View and download your company invoices</p>
      </div>

      <div className="apple-card">
        <div className="apple-table-wrapper">
          <table className="apple-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Status</th>
                <th>Issue Date</th>
                <th>Amount</th>
                <th>Balance</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>Loading invoices...</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>No invoices found.</td></tr>
              ) : (
                invoices.map(inv => (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 600 }}>{inv.invoiceNumber}</td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(inv.status) }} />
                        <span style={{ fontSize: 12, fontWeight: 500 }}>{inv.status.toUpperCase()}</span>
                      </div>
                    </td>
                    <td>{new Date(inv.issueDate).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 600 }}>${Number(inv.totalAmount).toFixed(2)}</td>
                    <td style={{ color: Number(inv.totalAmount) - Number(inv.amountPaid) > 0 ? '#ff3b30' : 'inherit' }}>
                      ${(Number(inv.totalAmount) - Number(inv.amountPaid)).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn-apple secondary small" onClick={() => inv.fileUrl && window.open(inv.fileUrl)}>
                        <i className="ti ti-download" style={{ marginRight: 4 }} />
                        PDF
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
