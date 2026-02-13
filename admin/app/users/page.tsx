'use client';

import Modal from '@/components/Modal';
import {
    DataTable,
    type DataTableColumn,
    PageContent,
    PageHeader,
    StatsCard,
    StatusBadge,
    showToast
} from '@/components/ui';
import { adminFetch } from '@/lib/api-client';
import { useEffect, useState } from 'react';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  companyId: string;
  companyName: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, admins: 0, recentLogins: 0 });
  const [roleModal, setRoleModal] = useState<{show: boolean; user: User | null; selectedRole: string}>({ show: false, user: null, selectedRole: '' });
  const [statusModal, setStatusModal] = useState<{show: boolean; user: User | null}>({ show: false, user: null });
  const [updating, setUpdating] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await adminFetch('/api/v1/companies');
      const companiesData = await response.json();
      const companies = Array.isArray(companiesData) ? companiesData : companiesData.data || [];
      const allUsers: User[] = [];
      for (const company of companies) {
        if (company.users) {
          company.users.forEach((user: User) => {
            allUsers.push({ ...user, companyId: company.id, companyName: company.name });
          });
        }
      }
      setUsers(allUsers);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStats({
        total: allUsers.length,
        active: allUsers.filter(u => u.isActive).length,
        admins: allUsers.filter(u => u.role?.toLowerCase() === 'admin').length,
        recentLogins: allUsers.filter(u => u.lastLoginAt && new Date(u.lastLoginAt) > weekAgo).length,
      });
    } catch (err) {
      console.error('Load users error:', err);
      setUsers([]);
    } finally { setLoading(false); }
  };

  const handleRoleChange = async () => {
    if (!roleModal.user) return;
    try {
      setUpdating(true);
      const response = await adminFetch(`/api/v1/company-users/${roleModal.user.id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: roleModal.selectedRole }),
      });
      setRoleModal({show: false, user: null, selectedRole: ''});
      if (response.ok) {
        showToast('User role updated successfully!', 'success');
        loadUsers();
      } else {
        const error = await response.json().catch(() => ({}));
        showToast(error.message || 'Failed to update role', 'danger');
      }
    } catch (err) {
      setRoleModal({show: false, user: null, selectedRole: ''});
      showToast(err instanceof Error ? err.message : 'Failed to update role', 'danger');
    } finally { setUpdating(false); }
  };

  const handleStatusToggle = async () => {
    if (!statusModal.user) return;
    try {
      setUpdating(true);
      const newStatus = !statusModal.user.isActive;
      const response = await adminFetch(`/api/v1/company-users/${statusModal.user.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: newStatus }),
      });
      setStatusModal({show: false, user: null});
      if (response.ok) {
        showToast(`User ${newStatus ? 'activated' : 'deactivated'} successfully!`, 'success');
        loadUsers();
      } else {
        const error = await response.json().catch(() => ({}));
        showToast(error.message || 'Failed to update status', 'danger');
      }
    } catch (err) {
      setStatusModal({show: false, user: null});
      showToast(err instanceof Error ? err.message : 'Failed to update status', 'danger');
    } finally { setUpdating(false); }
  };

  const columns: DataTableColumn<User>[] = [
    {
      key: 'name', label: 'User', sortable: true,
      render: (user) => (
        <div>
          <div style={{ fontWeight: 500 }}>{user.firstName} {user.lastName}</div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{user.email}</div>
        </div>
      ),
    },
    { key: 'companyName', label: 'Company', sortable: true },
    {
      key: 'role', label: 'Role', sortable: true,
      render: (user) => <StatusBadge status={user.role} colorMap={{ admin: 'danger', manager: 'warning', buyer: 'info', viewer: 'secondary' }} />,
    },
    {
      key: 'isActive', label: 'Status', sortable: true,
      render: (user) => <StatusBadge status={user.isActive ? 'Active' : 'Pending'} colorMap={{ Active: 'success', Pending: 'warning' }} />,
    },
    {
      key: 'lastLoginAt', label: 'Last Login', sortable: true,
      render: (user) => user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never',
    },
  ];

  const rowActions = (user: User) => (
    <div style={{ display: 'flex', gap: 6 }}>
      <button onClick={() => setRoleModal({ show: true, user, selectedRole: user.role })} className="btn-apple ghost small" title="Edit Role">
        <i className="ti ti-edit" />
      </button>
      <button onClick={() => setStatusModal({show: true, user})}
        className={`btn-apple ${user.isActive ? 'warning' : 'success'} small`}
        title={user.isActive ? 'Deactivate' : 'Activate'}>
        <i className={`ti ${user.isActive ? 'ti-user-off' : 'ti-user-check'}`} />
      </button>
    </div>
  );

  return (
    <div>
      <PageHeader title="All Users" subtitle={`${users.length} users across all companies`}
        actions={[{ label: 'Refresh', icon: 'refresh', variant: 'secondary', onClick: loadUsers, disabled: loading }]} />

      <div className="stats-grid">
        <StatsCard title="Total Users" value={stats.total} icon="users" iconColor="primary" loading={loading} />
        <StatsCard title="Active" value={stats.active} icon="user-check" iconColor="success" loading={loading} />
        <StatsCard title="Admins" value={stats.admins} icon="shield" iconColor="danger" loading={loading} />
        <StatsCard title="Recent Logins (7d)" value={stats.recentLogins} icon="clock" iconColor="info" loading={loading} />
      </div>

      <div style={{ marginTop: 20 }}>
        <PageContent loading={loading} empty={{ show: !loading && users.length === 0, icon: 'users', title: 'No users found', message: 'Users will appear here when companies are created.' }}>
          <DataTable data={users} columns={columns} loading={loading} searchable searchPlaceholder="Search users..."
            searchFields={['firstName', 'lastName', 'email', 'companyName']}
            statusFilter={{ field: 'role', options: [{ value: 'admin', label: 'Admin' }, { value: 'manager', label: 'Manager' }, { value: 'buyer', label: 'Buyer' }, { value: 'viewer', label: 'Viewer' }] }}
            defaultSortKey="lastName" defaultSortOrder="asc" rowActions={rowActions} />
        </PageContent>
      </div>

      {/* Edit Role Modal */}
      {roleModal.show && roleModal.user && (
        <div className="apple-modal-overlay" onClick={() => setRoleModal({show: false, user: null, selectedRole: ''})}>
          <div className="apple-modal" onClick={(e) => e.stopPropagation()}>
            <div className="apple-modal-header">
              <h3 className="apple-modal-title">Change User Role</h3>
            </div>
            <div className="apple-modal-body">
              <p style={{ marginBottom: 16 }}>
                <strong>{roleModal.user.firstName} {roleModal.user.lastName}</strong>
                <br />
                <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{roleModal.user.email}</span>
              </p>
              <label className="input-label">Select New Role</label>
              <select className="select-apple" value={roleModal.selectedRole} onChange={(e) => setRoleModal(prev => ({...prev, selectedRole: e.target.value}))}>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="buyer">Buyer</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div className="apple-modal-footer">
              <button className="btn-apple secondary" onClick={() => setRoleModal({show: false, user: null, selectedRole: ''})} disabled={updating}>Cancel</button>
              <button className="btn-apple primary" onClick={handleRoleChange} disabled={updating}>
                {updating ? <><i className="ti ti-loader-2 spin" /> Updating...</> : 'Update Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {statusModal.show && statusModal.user && (
        <Modal show={statusModal.show} onClose={() => setStatusModal({show: false, user: null})} onConfirm={handleStatusToggle}
          title={statusModal.user.isActive ? 'Deactivate User' : 'Activate User'}
          message={`Are you sure you want to ${statusModal.user.isActive ? 'deactivate' : 'activate'} ${statusModal.user.firstName} ${statusModal.user.lastName}?`}
          confirmText={statusModal.user.isActive ? 'Deactivate' : 'Activate'}
          cancelText="Cancel" type={statusModal.user.isActive ? 'warning' : 'success'} />
      )}
    </div>
  );
}
