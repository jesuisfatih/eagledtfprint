'use client';

import { PageHeader } from '@/components/ui';

const roles = [
  {
    name: 'Admin',
    desc: 'Full access to all features',
    color: '#ff3b30',
    permissions: ['Manage Users', 'Manage Orders', 'Manage Products', 'Manage Settings', 'View Analytics', 'Manage Pricing'],
  },
  {
    name: 'Manager',
    desc: 'Manage orders and customers',
    color: '#ff9500',
    permissions: ['View Users', 'Manage Orders', 'View Products', 'View Analytics'],
  },
  {
    name: 'Buyer',
    desc: 'Place and manage own orders',
    color: '#007aff',
    permissions: ['View Products', 'Place Orders', 'View Own Orders'],
  },
  {
    name: 'Viewer',
    desc: 'Read-only access',
    color: '#8e8e93',
    permissions: ['View Products', 'View Orders'],
  },
];

export default function PermissionsPage() {
  return (
    <div>
      <PageHeader title="Roles & Permissions" subtitle="Manage user access levels" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {roles.map(role => (
          <div key={role.name} className="apple-card">
            <div className="apple-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: role.color }} />
                <h3 className="apple-card-title">{role.name}</h3>
              </div>
            </div>
            <div className="apple-card-body">
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 12 }}>{role.desc}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {role.permissions.map(p => (
                  <span key={p} className="badge-apple info">{p}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

