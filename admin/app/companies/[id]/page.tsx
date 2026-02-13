'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Modal from '@/components/Modal';
import CompanyEditModal from '@/components/CompanyEditModal';
import { adminFetch } from '@/lib/api-client';
import type { Company, UserWithCompany, Order, PricingRule, CompanyFormData } from '@/types';

interface CompanyDetail extends Company {
  orders?: Order[];
  pricingRules?: PricingRule[];
}

export default function CompanyDetailPage() {
  const params = useParams();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [users, setUsers] = useState<UserWithCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('buyer');

  useEffect(() => {
    loadCompany();
  }, []);

  const loadCompany = async () => {
    try {
      const [companyData, usersData] = await Promise.all([
        adminFetch(`/api/v1/companies/${params.id}`).then(r => r.json()),
        adminFetch(`/api/v1/companies/${params.id}/users`).then(r => r.json()),
      ]);
      setCompany(companyData);
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [inviteResult, setInviteResult] = useState<{show: boolean; type: 'success'|'error'; message: string}>({
    show: false, type: 'success', message: ''
  });

  const handleInviteUser = async () => {
    try {
      const response = await adminFetch(`/api/v1/companies/${params.id}/users`, {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      
      if (response.ok) {
        setShowInviteModal(false);
        setInviteEmail('');
        loadCompany();
        setInviteResult({
          show: true,
          type: 'success',
          message: 'Invitation sent successfully!',
        });
      } else {
        throw new Error('Failed to send invitation');
      }
    } catch (err) {
      setInviteResult({
        show: true,
        type: 'error',
        message: err instanceof Error ? err.message : 'An error occurred',
      });
    }
  };

  const handleEditCompany = async (data: CompanyFormData) => {
    try {
      await adminFetch(`/api/v1/companies/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      setShowEditModal(false);
      loadCompany();
      alert('✅ Company updated!');
    } catch (err) {
      alert('❌ Update failed');
    }
  };

  const [approveModal, setApproveModal] = useState<{show: boolean; message: string}>({show: false, message: ''});

  const approveCompany = async () => {
    try {
      const response = await adminFetch(`/api/v1/companies/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'active' }),
      });
      
      if (response.ok) {
        setApproveModal({show: true, message: '✅ Company approved successfully!'});
        loadCompany();
      } else {
        setApproveModal({show: true, message: '❌ Failed to approve company'});
      }
    } catch (err) {
      setApproveModal({show: true, message: '❌ Error: ' + (err instanceof Error ? err.message : 'Unknown error')});
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary"></div>
      </div>
    );
  }

  if (!company) {
    return <div className="alert alert-danger">Company not found</div>;
  }

  return (
    <div>
      {/* Header */}
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link href="/companies">Companies</Link></li>
          <li className="breadcrumb-item active">{company.name}</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">{company.name}</h4>
          <p className="mb-0 text-muted">{company.email}</p>
        </div>
        <div className="dropdown">
          <button
            className="btn btn-primary dropdown-toggle"
            type="button"
            data-bs-toggle="dropdown"
          >
            <i className="ti ti-dots-vertical"></i> Actions
          </button>
          <ul className="dropdown-menu">
            {company.status === 'pending' && (
              <li>
                <a className="dropdown-item" href="javascript:void(0);" onClick={approveCompany}>
                  <i className="ti ti-check me-2"></i>
                  Approve Company
                </a>
              </li>
            )}
            <li>
              <a className="dropdown-item" href="javascript:void(0);">
                <i className="ti ti-edit me-2"></i>
                Edit Company Info
              </a>
            </li>
            <li>
              <a className="dropdown-item text-danger" href="javascript:void(0);">
                <i className="ti ti-trash me-2"></i>
                Delete Company
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Company Info */}
      <div className="row mb-4">
        <div className="col-md-8">
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="card-title mb-0">Company Information</h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label text-muted">Company Name</label>
                  <p className="fw-semibold">{company.name}</p>
                </div>
                <div className="col-md-6">
                  <label className="form-label text-muted">Status</label>
                  <p>
                    <span className={`badge ${company.status === 'active' ? 'bg-label-success' : 'bg-label-warning'}`}>
                      {company.status}
                    </span>
                  </p>
                </div>
                <div className="col-md-6">
                  <label className="form-label text-muted">Email</label>
                  <p className="fw-semibold">{company.email || 'N/A'}</p>
                </div>
                <div className="col-md-6">
                  <label className="form-label text-muted">Phone</label>
                  <p className="fw-semibold">{company.phone || 'N/A'}</p>
                </div>
                <div className="col-md-6">
                  <label className="form-label text-muted">Tax ID</label>
                  <p className="fw-semibold">{company.taxId || 'N/A'}</p>
                </div>
                <div className="col-md-6">
                  <label className="form-label text-muted">Company Group</label>
                  <p className="fw-semibold">{company.companyGroup || 'None'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card mb-4">
            <div className="card-body">
              <h6 className="card-title">Quick Stats</h6>
              <div className="mt-3">
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Team Members</span>
                  <span className="fw-bold">{users.length}</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Total Orders</span>
                  <span className="fw-bold">{company?.orders?.length || 0}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Total Spent</span>
                  <span className="fw-bold">${company?.orders?.reduce((sum: number, o) => sum + Number(o.total || 0), 0).toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h6 className="card-title">Assigned Pricing Rules</h6>
              <div className="mt-3">
                {company?.pricingRules?.length === 0 ? (
                  <p className="text-muted small mb-0">No pricing rules assigned</p>
                ) : (
                  company?.pricingRules?.map((rule) => (
                    <div key={rule.id} className="mb-2">
                      <span className="badge bg-label-success">{rule.name}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="card-title mb-0">Recent Orders</h5>
        </div>
        <div className="card-body">
          {!company?.orders || company.orders.length === 0 ? (
            <p className="text-muted mb-0">No orders yet</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {company.orders.slice(0, 5).map((order) => (
                    <tr key={order.id}>
                      <td className="fw-semibold">#{order.shopifyOrderNumber}</td>
                      <td className="small">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="fw-semibold">${order.totalPrice}</td>
                      <td><span className="badge bg-label-success">{order.financialStatus}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Team Members */}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0">Team Members ({users.length})</h5>
          <div className="d-flex gap-2">
            <button
              onClick={() => setShowInviteModal(true)}
              className="btn btn-sm btn-primary"
            >
              <i className="ti ti-user-plus me-1"></i>
              Add User
            </button>
            <button
              onClick={loadCompany}
              className="btn btn-sm btn-icon btn-label-secondary"
            >
              <i className="ti ti-refresh"></i>
            </button>
          </div>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Email Status</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4">
                      <p className="text-muted mb-0">No team members yet</p>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="fw-semibold">{user.firstName} {user.lastName}</div>
                        <div className="small text-muted">{user.email}</div>
                      </td>
                      <td>
                        <span className="badge bg-label-info">{user.role}</span>
                      </td>
                      <td>
                        <span className={`badge ${user.isActive ? 'bg-label-success' : 'bg-label-warning'}`}>
                          {user.isActive ? 'Active' : 'Pending'}
                        </span>
                      </td>
                      <td>
                        {((user.permissions as any)?.emailVerified) ? (
                          <span className="badge bg-label-success">
                            <i className="ti ti-check me-1"></i>Verified
                          </span>
                        ) : (
                          <span className="badge bg-label-warning">
                            <i className="ti ti-x me-1"></i>Not Verified
                          </span>
                        )}
                      </td>
                      <td className="small text-muted">
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td>
                        <div className="btn-group">
                          {!((user.permissions as any)?.emailVerified) && (
                            <button
                              className="btn btn-sm btn-icon btn-text-success"
                              onClick={async () => {
                                if (confirm('Verify this user\'s email address?')) {
                                  try {
                                    const response = await adminFetch(`/api/v1/companies/users/${user.id}/verify-email`, {
                                      method: 'POST',
                                    });
                                    if (response.ok) {
                                      alert('Email verified successfully!');
                                      loadCompany();
                                    } else {
                                      alert('Failed to verify email');
                                    }
                                  } catch (err) {
                                    alert('Error verifying email');
                                  }
                                }
                              }}
                              title="Verify Email"
                            >
                              <i className="ti ti-mail-check"></i>
                            </button>
                          )}
                          <button className="btn btn-sm btn-icon btn-text-secondary">
                            <i className="ti ti-edit"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Invite Team Member</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowInviteModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@company.com"
                  />
                  <small className="text-muted">
                    User will receive an invitation email to set up their account
                  </small>
                </div>
                <div className="mb-3">
                  <label className="form-label">Role</label>
                  <select
                    className="form-select"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                  >
                    <option value="admin">Admin (Full access)</option>
                    <option value="manager">Manager (Manage orders, approve)</option>
                    <option value="buyer">Buyer (Create orders)</option>
                    <option value="viewer">Viewer (Read only)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-label-secondary"
                  onClick={() => setShowInviteModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleInviteUser}
                  disabled={!inviteEmail}
                >
                  Send Invitation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Company Modal */}
      <CompanyEditModal
        show={showEditModal}
        company={company}
        onClose={() => setShowEditModal(false)}
        onSave={handleEditCompany}
      />

      {/* Invite Result Modal */}
      {inviteResult.show && (
        <Modal
          show={inviteResult.show}
          onClose={() => setInviteResult({...inviteResult, show: false})}
          onConfirm={() => setInviteResult({...inviteResult, show: false})}
          title={inviteResult.type === 'success' ? 'Success' : 'Error'}
          message={inviteResult.message}
          confirmText="OK"
          type={inviteResult.type === 'success' ? 'success' : 'danger'}
        />
      )}

      {/* Approve Result Modal */}
      {approveModal.show && (
        <Modal
          show={approveModal.show}
          onClose={() => setApproveModal({show: false, message: ''})}
          onConfirm={() => setApproveModal({show: false, message: ''})}
          title={approveModal.message.includes('✅') ? 'Success' : 'Error'}
          message={approveModal.message}
          confirmText="OK"
          type={approveModal.message.includes('✅') ? 'success' : 'danger'}
        />
      )}
    </div>
  );
}

