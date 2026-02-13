'use client';

import { PageHeader, showToast } from '@/components/ui';
import { adminFetch } from '@/lib/api-client';
import { useState } from 'react';

const reports = [
  { id: 'sales', title: 'Sales Report', desc: 'Revenue, orders, and payment analytics', icon: 'ti-chart-bar', color: '#007aff', endpoint: '/api/v1/orders' },
  { id: 'companies', title: 'Company Report', desc: 'B2B customer acquisition and activity', icon: 'ti-building', color: '#34c759', endpoint: '/api/v1/companies' },
  { id: 'customers', title: 'Customer Report', desc: 'Shopify customer data export', icon: 'ti-users', color: '#ff9500', endpoint: '/api/v1/shopify-customers' },
  { id: 'products', title: 'Product Catalog', desc: 'Full product catalog export', icon: 'ti-package', color: '#5856d6', endpoint: '/api/v1/catalog/products?limit=100' },
];

export default function ReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null);

  const generateReport = async (report: typeof reports[0]) => {
    setGenerating(report.id);
    try {
      const res = await adminFetch(report.endpoint);
      if (!res.ok) {
        showToast('Failed to fetch report data', 'danger');
        return;
      }
      const raw = await res.json();
      const data = Array.isArray(raw) ? raw : raw.data || [];

      if (data.length === 0) {
        showToast('No data to export', 'warning');
        return;
      }

      // Generate CSV based on report type
      let csv = '';
      switch (report.id) {
        case 'sales':
          csv = 'Order Number,Company,Total,Payment Status,Fulfillment,Currency,Date\n';
          csv += data.map((o: any) => [
            o.orderNumber || o.shopifyOrderNumber || o.id,
            o.company?.name || 'N/A',
            o.totalPrice || 0,
            o.paymentStatus || o.financialStatus || 'unknown',
            o.fulfillmentStatus || 'unfulfilled',
            o.currency || 'USD',
            new Date(o.createdAt).toLocaleDateString(),
          ].join(',')).join('\n');
          break;

        case 'companies':
          csv = 'Name,Email,Status,Users,Created\n';
          csv += data.map((c: any) => [
            `"${c.name || ''}"`,
            c.email || '',
            c.status || 'active',
            c.users?.length || c._count?.users || 0,
            new Date(c.createdAt).toLocaleDateString(),
          ].join(',')).join('\n');
          break;

        case 'customers':
          csv = 'First Name,Last Name,Email,Phone,Orders,Total Spent\n';
          csv += data.map((c: any) => [
            c.firstName || '',
            c.lastName || '',
            c.email || '',
            c.phone || '',
            c.ordersCount || 0,
            c.totalSpent || '0',
          ].join(',')).join('\n');
          break;

        case 'products':
          csv = 'Title,Vendor,Product Type,Status,Tags,Created\n';
          csv += data.map((p: any) => [
            `"${(p.title || '').replace(/"/g, '""')}"`,
            p.vendor || '',
            p.productType || '',
            p.status || 'active',
            `"${(p.tags || '').replace(/"/g, '""')}"`,
            new Date(p.createdAt).toLocaleDateString(),
          ].join(',')).join('\n');
          break;
      }

      // Download CSV file
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${report.id}-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`${report.title} exported! (${data.length} records)`, 'success');
    } catch {
      showToast('Error generating report', 'danger');
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div>
      <PageHeader title="Reports" subtitle="Generate and download CSV reports from live data" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {reports.map(r => (
          <div key={r.id} className="apple-card">
            <div className="apple-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${r.color}14`, color: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={`ti ${r.icon}`} style={{ fontSize: 22 }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{r.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{r.desc}</div>
                </div>
              </div>
              <button className="btn-apple primary" onClick={() => generateReport(r)} disabled={generating === r.id}>
                {generating === r.id ? (
                  <><i className="ti ti-loader-2 spin" /> Generating...</>
                ) : (
                  <><i className="ti ti-download" /> Export CSV</>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
