'use client';

import { PageContent, PageHeader, StatsCard } from '@/components/ui/PageLayout';
import { showToast } from '@/components/ui/Toast';
import { adminFetch } from '@/lib/api-client';
import { useEffect, useRef, useState } from 'react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  totalAmount: number;
  amountPaid: number;
  company: { name: string };
  issueDate: string;
  dueDate: string;
  fileUrl: string | null;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await adminFetch('/api/v1/invoices');
      const data = await res.json();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast('Failed to fetch invoices', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = (invoiceId?: string) => {
    setUploadTargetId(invoiceId || null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    if (uploadTargetId) formData.append('invoiceId', uploadTargetId);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.eagledtfsupply.com';
      const res = await fetch(`${API_URL}/api/v1/invoices/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (res.ok) {
        showToast('Fatura başarıyla yüklendi', 'success');
        fetchInvoices();
      } else {
        showToast('Fatura yükleme hatası', 'danger');
      }
    } catch (err) {
      showToast('Yükleme başarısız', 'danger');
    }
    setUploading(false);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
    setUploadTargetId(null);
  };

  const getStatusBadge = (status: string) => {
    const map: any = {
      paid: 'success',
      unpaid: 'warning',
      overdue: 'danger',
      partial: 'info',
    };
    return <span className={`badge-apple ${map[status] || 'secondary'}`}>{status.toUpperCase()}</span>;
  };

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle="Manage B2B billing and customer invoices"
        actions={[
          { label: 'Upload Invoice', icon: 'upload', variant: 'secondary' as any, onClick: () => handleUploadClick() },
          { label: 'Create Invoice', icon: 'plus', variant: 'primary', onClick: () => showToast('Create feature coming soon', 'info') }
        ]}
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div className="grid-3 mb-24">
        <StatsCard title="Total Invoiced" value={`$${invoices.reduce((acc, inv) => acc + Number(inv.totalAmount), 0).toLocaleString()}`} icon="receipt" iconColor="blue" />
        <StatsCard title="Pending Payments" value={`$${invoices.filter(i => i.status !== 'paid').reduce((acc, inv) => acc + Number(inv.totalAmount - inv.amountPaid), 0).toLocaleString()}`} icon="clock" iconColor="orange" />
        <StatsCard title="Paid Today" value="$0.00" icon="check" iconColor="green" />
      </div>

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
                <th>File</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center" style={{ padding: 40, color: 'var(--text-tertiary)' }}>
                    No invoices found.
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td style={{ fontWeight: 600 }}>{invoice.invoiceNumber}</td>
                    <td>{invoice.company?.name}</td>
                    <td>{new Date(invoice.issueDate).toLocaleDateString()}</td>
                    <td>{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '-'}</td>
                    <td style={{ fontWeight: 600 }}>${Number(invoice.totalAmount).toFixed(2)}</td>
                    <td>
                      {invoice.fileUrl ? (
                        <a href={invoice.fileUrl} target="_blank" style={{ color: 'var(--accent-blue)', fontSize: 12 }}>
                          <i className="ti ti-file-check" style={{ marginRight: 4 }} /> PDF
                        </a>
                      ) : (
                        <button className="btn-apple ghost small" onClick={() => handleUploadClick(invoice.id)} disabled={uploading} style={{ fontSize: 11, padding: '2px 8px' }}>
                          <i className="ti ti-upload" /> Upload
                        </button>
                      )}
                    </td>
                    <td>{getStatusBadge(invoice.status)}</td>
                    <td>
                      <button className="btn-apple ghost small">View</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PageContent>
    </>
  );
}
