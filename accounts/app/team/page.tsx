'use client';

import { useState, useEffect } from 'react';
import InviteMemberModal from './components/InviteMemberModal';
import Modal from '@/components/Modal';
import { accountsFetch } from '@/lib/api-client';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import type { User } from '@eagle/types';
import { RoleBadge, SpendingLimitProgress } from '@/components/team';

interface TeamMember extends User {
  spendingLimit?: number;
  spendingUsed?: number;
  permissions?: string[];
  invitedBy?: string;
  orderCount?: number;
  totalSpent?: number;
}

type RoleFilter = 'all' | 'ADMIN' | 'MANAGER' | 'BUYER' | 'VIEWER';

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadMembers();
  }, []);

  const [resultModal, setResultModal] = useState<{show: boolean; message: string}>({show: false, message: ''});

  const handleInvite = async (email: string, role: string) => {
    try {
      const companyId = localStorage.getItem('eagle_companyId') || '';
      
      const response = await accountsFetch(`/api/v1/companies/${companyId}/users`, {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      });
      
      setShowInviteModal(false);
      
      if (response.ok) {
        setResultModal({show: true, message: '✅ Invitation sent successfully!'});
        loadMembers();
      } else {
        setResultModal({show: true, message: '❌ Failed to send invitation'});
      }
    } catch (err) {
      setResultModal({show: true, message: '❌ Failed to send invitation'});
    }
  };

  const loadMembers = async () => {
    try {
      setLoading(true);
      const companyId = localStorage.getItem('eagle_companyId') || '';
      
      const response = await accountsFetch(`/api/v1/companies/${companyId}/users`);
      const data = await response.json();
      setMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member from the team?')) return;
    
    try {
      const companyId = localStorage.getItem('eagle_companyId') || '';
      const response = await accountsFetch(`/api/v1/companies/${companyId}/users/${memberId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setMembers(prev => prev.filter(m => m.id !== memberId));
        setSelectedMember(null);
        setResultModal({show: true, message: '✅ Member removed successfully'});
      } else {
        setResultModal({show: true, message: '❌ Failed to remove member'});
      }
    } catch (err) {
      setResultModal({show: true, message: '❌ Failed to remove member'});
    }
  };

  const handleResendInvite = async (email: string) => {
    try {
      const companyId = localStorage.getItem('eagle_companyId') || '';
      const response = await accountsFetch(`/api/v1/companies/${companyId}/users/resend-invite`, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      
      if (response.ok) {
        setResultModal({show: true, message: '✅ Invitation resent successfully'});
      } else {
        setResultModal({show: true, message: '❌ Failed to resend invitation'});
      }
    } catch (err) {
      setResultModal({show: true, message: '❌ Failed to resend invitation'});
    }
  };

  // Filter members
  const filteredMembers = members.filter(member => {
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    const matchesSearch = searchQuery === '' || 
      `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  // Stats
  const stats = {
    total: members.length,
    active: members.filter(m => m.isActive).length,
    pending: members.filter(m => !m.isActive).length,
    admins: members.filter(m => m.role === 'ADMIN').length,
    totalSpent: members.reduce((acc, m) => acc + (m.totalSpent || 0), 0),
  };

  const roleFilters: Array<{ key: RoleFilter; label: string }> = [
    { key: 'all', label: 'All Members' },
    { key: 'ADMIN', label: 'Admins' },
    { key: 'MANAGER', label: 'Managers' },
    { key: 'BUYER', label: 'Buyers' },
    { key: 'VIEWER', label: 'Viewers' },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h4 style={{ fontWeight: 700, marginBottom: 4 }}>Team Management</h4>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Manage your team members and their permissions</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowInviteModal(true)} className="btn-apple btn-apple-primary">
            <i className="ti ti-user-plus" style={{ marginRight: 6 }}></i>Invite Member
          </button>
          <button onClick={loadMembers} className="btn-apple btn-apple-secondary" style={{ height: 36, width: 36, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} title="Refresh">
            <i className="ti ti-refresh"></i>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ background: 'var(--accent)', color: '#fff' }}>
          <div className="card-body" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, opacity: 0.75 }}>Total Members</p>
                <h3 style={{ margin: 0 }}>{stats.total}</h3>
              </div>
              <i className="ti ti-users" style={{ fontSize: 28, opacity: 0.5 }}></i>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Active</p>
                <h3 style={{ margin: 0, color: 'var(--green)' }}>{stats.active}</h3>
              </div>
              <i className="ti ti-user-check" style={{ fontSize: 28, color: 'var(--green)', opacity: 0.5 }}></i>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Pending</p>
                <h3 style={{ margin: 0, color: 'var(--orange)' }}>{stats.pending}</h3>
              </div>
              <i className="ti ti-user-exclamation" style={{ fontSize: 28, color: 'var(--orange)', opacity: 0.5 }}></i>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Team Spending</p>
                <h3 style={{ margin: 0 }}>{formatCurrency(stats.totalSpent)}</h3>
              </div>
              <i className="ti ti-cash" style={{ fontSize: 28, color: 'var(--accent)', opacity: 0.5 }}></i>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {roleFilters.map(f => (
            <button
              key={f.key}
              className={roleFilter === f.key ? 'btn-apple btn-apple-primary' : 'btn-apple btn-apple-secondary'}
              style={{ height: 34 }}
              onClick={() => setRoleFilter(f.key)}
            >
              {f.label}
              {f.key !== 'all' && (
                <span className="badge" style={{ background: 'rgba(255,255,255,0.9)', color: 'var(--text-primary)', marginLeft: 6 }}>
                  {members.filter(m => m.role === f.key).length}
                </span>
              )}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ti ti-search" style={{ color: 'var(--text-tertiary)' }}></i>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Members List */}
        <div style={{ flex: selectedMember ? '2 1 0%' : '1 1 100%', minWidth: 0 }}>
          <div className="card">
            <div className="card-body">
              {loading ? (
                <div style={{ textAlign: 'center', padding: '48px 0' }}>
                  <div className="spinner-apple"></div>
                  <p style={{ marginTop: 16, color: 'var(--text-secondary)' }}>Loading team members...</p>
                </div>
              ) : filteredMembers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0' }}>
                  <i className="ti ti-users-group" style={{ fontSize: 48, color: 'var(--text-tertiary)', display: 'block', marginBottom: 16 }}></i>
                  <h5>No team members found</h5>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
                    {searchQuery || roleFilter !== 'all' 
                      ? 'Try adjusting your filters' 
                      : 'Start by inviting your first team member'
                    }
                  </p>
                  {!searchQuery && roleFilter === 'all' && (
                    <button className="btn-apple btn-apple-primary" onClick={() => setShowInviteModal(true)}>
                      <i className="ti ti-user-plus" style={{ marginRight: 6 }}></i>Invite Member
                    </button>
                  )}
                </div>
              ) : (
                <div className="table-container">
                  <table className="apple-table">
                    <thead>
                      <tr>
                        <th>Member</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Spending</th>
                        <th>Last Activity</th>
                        <th width="50"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.map((member) => (
                        <tr 
                          key={member.id} 
                          style={{ cursor: 'pointer', background: selectedMember?.id === member.id ? 'var(--bg-secondary)' : undefined }}
                          onClick={() => setSelectedMember(member)}
                        >
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div 
                                style={{ width: 40, height: 40, fontSize: 14, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, flexShrink: 0 }}
                              >
                                {member.firstName?.[0]}{member.lastName?.[0]}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600 }}>{member.firstName} {member.lastName}</div>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{member.email}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <RoleBadge role={member.role as any} />
                          </td>
                          <td>
                            <span className="badge" style={member.isActive ? { background: 'rgba(52,199,89,0.12)', color: 'var(--green)' } : { background: 'rgba(255,149,0,0.12)', color: 'var(--orange)' }}>
                              {member.isActive ? 'Active' : 'Pending'}
                            </span>
                          </td>
                          <td>
                            {member.spendingLimit ? (
                              <SpendingLimitProgress 
                                used={member.spendingUsed || 0} 
                                limit={member.spendingLimit} 
                                compact
                              />
                            ) : (
                              <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No limit</span>
                            )}
                          </td>
                          <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            {member.lastLoginAt 
                              ? formatRelativeTime(member.lastLoginAt)
                              : 'Never logged in'
                            }
                          </td>
                          <td>
                            <div className="dropdown">
                              <button 
                                className="btn-apple btn-apple-secondary"
                                style={{ height: 32, width: 32, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                data-bs-toggle="dropdown"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <i className="ti ti-dots-vertical"></i>
                              </button>
                              <ul className="dropdown-menu dropdown-menu-end">
                                <li>
                                  <button className="dropdown-item" onClick={(e) => { e.stopPropagation(); setSelectedMember(member); }}>
                                    <i className="ti ti-eye" style={{ marginRight: 8 }}></i>View Details
                                  </button>
                                </li>
                                {!member.isActive && (
                                  <li>
                                    <button className="dropdown-item" onClick={(e) => { e.stopPropagation(); handleResendInvite(member.email); }}>
                                      <i className="ti ti-mail-forward" style={{ marginRight: 8 }}></i>Resend Invite
                                    </button>
                                  </li>
                                )}
                                <li><hr className="dropdown-divider" /></li>
                                <li>
                                  <button 
                                    className="dropdown-item" 
                                    style={{ color: 'var(--red)' }}
                                    onClick={(e) => { e.stopPropagation(); handleRemoveMember(member.id); }}
                                  >
                                    <i className="ti ti-user-minus" style={{ marginRight: 8 }}></i>Remove Member
                                  </button>
                                </li>
                              </ul>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Member Detail Sidebar */}
        {selectedMember && (
          <div style={{ flex: '1 1 0%', minWidth: 280 }}>
            <div className="card" style={{ position: 'sticky', top: 80 }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h6 style={{ margin: 0 }}>Member Details</h6>
                <button className="btn-apple btn-apple-secondary" style={{ height: 32, width: 32, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedMember(null)}>
                  <i className="ti ti-x"></i>
                </button>
              </div>
              <div className="card-body">
                {/* Avatar & Basic Info */}
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div 
                    style={{ width: 80, height: 80, fontSize: 28, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, margin: '0 auto 16px' }}
                  >
                    {selectedMember.firstName?.[0]}{selectedMember.lastName?.[0]}
                  </div>
                  <h5 style={{ marginBottom: 4 }}>{selectedMember.firstName} {selectedMember.lastName}</h5>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>{selectedMember.email}</p>
                  <RoleBadge role={selectedMember.role as any} />
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                    <h4 style={{ margin: 0 }}>{selectedMember.orderCount || 0}</h4>
                    <small style={{ color: 'var(--text-secondary)' }}>Orders</small>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                    <h4 style={{ margin: 0 }}>{formatCurrency(selectedMember.totalSpent || 0)}</h4>
                    <small style={{ color: 'var(--text-secondary)' }}>Total Spent</small>
                  </div>
                </div>

                {/* Spending Limit */}
                {selectedMember.spendingLimit && (
                  <div style={{ marginBottom: 24 }}>
                    <h6 style={{ marginBottom: 8 }}>Spending Limit</h6>
                    <SpendingLimitProgress 
                      used={selectedMember.spendingUsed || 0} 
                      limit={selectedMember.spendingLimit} 
                    />
                  </div>
                )}

                {/* Details List */}
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13 }}>
                  <li style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Status</span>
                    <span className="badge" style={selectedMember.isActive ? { background: 'rgba(52,199,89,0.12)', color: 'var(--green)' } : { background: 'rgba(255,149,0,0.12)', color: 'var(--orange)' }}>
                      {selectedMember.isActive ? 'Active' : 'Pending'}
                    </span>
                  </li>
                  <li style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Joined</span>
                    <span>{selectedMember.createdAt ? formatRelativeTime(selectedMember.createdAt) : 'N/A'}</span>
                  </li>
                  <li style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Last Login</span>
                    <span>{selectedMember.lastLoginAt ? formatRelativeTime(selectedMember.lastLoginAt) : 'Never'}</span>
                  </li>
                  {selectedMember.invitedBy && (
                    <li style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Invited by</span>
                      <span>{selectedMember.invitedBy}</span>
                    </li>
                  )}
                </ul>

                {/* Actions */}
                <div style={{ display: 'grid', gap: 8, marginTop: 24 }}>
                  {!selectedMember.isActive && (
                    <button 
                      className="btn-apple btn-apple-secondary"
                      onClick={() => handleResendInvite(selectedMember.email)}
                    >
                      <i className="ti ti-mail-forward" style={{ marginRight: 6 }}></i>Resend Invitation
                    </button>
                  )}
                  <button 
                    className="btn-apple btn-apple-secondary"
                    style={{ color: 'var(--red)', borderColor: 'var(--red)' }}
                    onClick={() => handleRemoveMember(selectedMember.id)}
                  >
                    <i className="ti ti-user-minus" style={{ marginRight: 6 }}></i>Remove from Team
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <InviteMemberModal
        show={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInvite}
      />

      {resultModal.show && (
        <Modal
          show={resultModal.show}
          onClose={() => setResultModal({show: false, message: ''})}
          onConfirm={() => setResultModal({show: false, message: ''})}
          title={resultModal.message.includes('✅') ? 'Success' : 'Error'}
          message={resultModal.message}
          confirmText="OK"
          type={resultModal.message.includes('✅') ? 'success' : 'danger'}
        />
      )}
    </div>
  );
}

