'use client';

import { PageHeader } from '@/components/ui';

const templates = [
  { name: 'Welcome Email', desc: 'Sent when a new B2B company is created', icon: 'ti-user-plus', status: 'Active' },
  { name: 'Order Confirmation', desc: 'Sent when an order is placed', icon: 'ti-shopping-cart', status: 'Active' },
  { name: 'Invitation Email', desc: 'Sent to invite users to a company', icon: 'ti-mail-forward', status: 'Active' },
  { name: 'Password Reset', desc: 'Sent when password reset is requested', icon: 'ti-lock', status: 'Active' },
  { name: 'Quote Response', desc: 'Sent when a quote request is responded to', icon: 'ti-file-invoice', status: 'Draft' },
  { name: 'Cart Recovery', desc: 'Sent for abandoned cart recovery', icon: 'ti-shopping-cart-off', status: 'Draft' },
];

export default function EmailTemplatesPage() {
  return (
    <div>
      <PageHeader title="Email Templates" subtitle="Manage transactional email templates" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {templates.map(t => (
          <div key={t.name} className="apple-card">
            <div className="apple-card-body" style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`ti ${t.icon}`} style={{ fontSize: 20, color: 'var(--text-secondary)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</span>
                  <span className={`badge-apple ${t.status === 'Active' ? 'success' : 'secondary'}`}>{t.status}</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0, marginBottom: 12 }}>{t.desc}</p>
                <button className="btn-apple ghost small"><i className="ti ti-edit" /> Edit Template</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

