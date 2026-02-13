'use client';

import { useState } from 'react';
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils';

// Role types
export type TeamRole = 'owner' | 'admin' | 'manager' | 'buyer' | 'viewer';

interface TeamMember {
  id: string;
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: TeamRole;
  status: 'active' | 'pending' | 'inactive';
  spendingLimit?: number;
  monthlySpent?: number;
  lastActiveAt?: string;
  createdAt: string;
  permissions?: TeamPermissions;
}

interface TeamPermissions {
  canViewPrices: boolean;
  canPlaceOrders: boolean;
  canApproveOrders: boolean;
  canManageTeam: boolean;
  canViewReports: boolean;
  canRequestQuotes: boolean;
  canManageAddresses: boolean;
  canViewAllOrders: boolean;
}

// Team Members List
interface TeamMembersListProps {
  members: TeamMember[];
  currentUserId: string;
  onInvite: () => void;
  onEdit: (member: TeamMember) => void;
  onRemove: (memberId: string) => void;
  onResendInvite?: (memberId: string) => void;
  isLoading?: boolean;
}

export function TeamMembersList({ 
  members, 
  currentUserId,
  onInvite, 
  onEdit, 
  onRemove,
  onResendInvite,
  isLoading = false 
}: TeamMembersListProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'pending'>('all');

  const filteredMembers = members.filter(m => {
    if (filter === 'all') return true;
    return m.status === filter;
  });

  const roleConfig = getRoleConfig;

  return (
    <div className="team-members-list">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h5 style={{ marginBottom: 4 }}>Team Members</h5>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            {members.length} member{members.length !== 1 ? 's' : ''} • 
            {members.filter(m => m.status === 'active').length} active
          </p>
        </div>
        <button className="btn-apple btn-apple-primary" onClick={onInvite}>
          <i className="ti ti-user-plus" style={{ marginRight: 4 }}></i>
          Invite Member
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['all', 'active', 'pending'] as const).map(f => (
          <button
            key={f}
            className={filter === f ? 'btn-apple btn-apple-primary' : 'btn-apple btn-apple-secondary'}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Members Table */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div className="spinner-apple"></div>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <i className="ti ti-users-group ti-3x" style={{ color: 'var(--text-secondary)', marginBottom: 12, display: 'block' }}></i>
          <h5>No team members</h5>
          <p style={{ color: 'var(--text-secondary)' }}>Invite team members to get started</p>
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table className="apple-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Spending Limit</th>
                  <th>Status</th>
                  <th>Last Active</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map(member => {
                  const role = roleConfig(member.role);
                  const isCurrentUser = member.userId === currentUserId;
                  const spendingPercent = member.spendingLimit && member.monthlySpent
                    ? (member.monthlySpent / member.spendingLimit) * 100
                    : 0;

                  return (
                    <tr key={member.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div 
                            style={{ 
                              width: 40, height: 40, borderRadius: '50%',
                              background: 'var(--accent)', color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              marginRight: 12, fontWeight: 600, fontSize: 14
                            }}
                          >
                            {(member.firstName?.[0] || member.email[0]).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>
                              {member.firstName && member.lastName 
                                ? `${member.firstName} ${member.lastName}`
                                : member.email
                              }
                              {isCurrentUser && (
                                <span className="badge" style={{ background: 'var(--accent)', color: '#fff', marginLeft: 8, fontSize: 11 }}>You</span>
                              )}
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{member.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge" style={role.style}>
                          <i className={`ti ti-${role.icon}`} style={{ marginRight: 4 }}></i>
                          {role.label}
                        </span>
                      </td>
                      <td>
                        {member.spendingLimit ? (
                          <div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                              {formatCurrency(member.monthlySpent || 0)} / {formatCurrency(member.spendingLimit)}
                            </div>
                            <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                              <div 
                                style={{ 
                                  height: '100%', borderRadius: 2,
                                  width: `${Math.min(spendingPercent, 100)}%`,
                                  background: spendingPercent > 80 ? 'var(--red)' : spendingPercent > 50 ? 'var(--orange)' : 'var(--green)',
                                }}
                              ></div>
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)' }}>Unlimited</span>
                        )}
                      </td>
                      <td>
                        <span className="badge" style={{
                          background: member.status === 'active' ? 'var(--green)' :
                            member.status === 'pending' ? 'var(--orange)' : 'var(--text-tertiary)',
                          color: '#fff'
                        }}>
                          {member.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                        {member.lastActiveAt 
                          ? formatRelativeTime(member.lastActiveAt)
                          : 'Never'
                        }
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {member.status === 'pending' && onResendInvite && (
                          <button
                            className="btn-apple btn-apple-secondary"
                            onClick={() => onResendInvite(member.id)}
                            title="Resend invite"
                            style={{ padding: '4px 8px', marginRight: 4 }}
                          >
                            <i className="ti ti-send"></i>
                          </button>
                        )}
                        <button
                          className="btn-apple btn-apple-secondary"
                          onClick={() => onEdit(member)}
                          title="Edit"
                          style={{ padding: '4px 8px', marginRight: 4 }}
                        >
                          <i className="ti ti-edit"></i>
                        </button>
                        {!isCurrentUser && (
                          <button
                            className="btn-apple btn-apple-secondary"
                            onClick={() => onRemove(member.id)}
                            title="Remove"
                            style={{ padding: '4px 8px', color: 'var(--red)' }}
                          >
                            <i className="ti ti-trash"></i>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Invite Member Form
interface InviteMemberFormProps {
  onSubmit: (data: InviteMemberData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

interface InviteMemberData {
  email: string;
  role: TeamRole;
  firstName?: string;
  lastName?: string;
  spendingLimit?: number;
  permissions?: Partial<TeamPermissions>;
}

export function InviteMemberForm({ onSubmit, onCancel, isSubmitting = false }: InviteMemberFormProps) {
  const [formData, setFormData] = useState<InviteMemberData>({
    email: '',
    role: 'buyer',
    firstName: '',
    lastName: '',
    spendingLimit: undefined,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [permissions, setPermissions] = useState<TeamPermissions>({
    canViewPrices: true,
    canPlaceOrders: true,
    canApproveOrders: false,
    canManageTeam: false,
    canViewReports: false,
    canRequestQuotes: true,
    canManageAddresses: false,
    canViewAllOrders: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      ...formData,
      permissions: showAdvanced ? permissions : undefined,
    });
  };

  const roles: Array<{ value: TeamRole; label: string; description: string }> = [
    { value: 'admin', label: 'Admin', description: 'Full access to all features' },
    { value: 'manager', label: 'Manager', description: 'Can approve orders and manage buyers' },
    { value: 'buyer', label: 'Buyer', description: 'Can place orders within limits' },
    { value: 'viewer', label: 'Viewer', description: 'View-only access' },
  ];

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label className="form-label">First Name</label>
          <input
            type="text"
            className="form-input"
            value={formData.firstName}
            onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
            placeholder="John"
          />
        </div>
        <div>
          <label className="form-label">Last Name</label>
          <input
            type="text"
            className="form-input"
            value={formData.lastName}
            onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
            placeholder="Doe"
          />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Email Address <span style={{ color: 'var(--red)' }}>*</span></label>
          <input
            type="email"
            className="form-input"
            value={formData.email}
            onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="john@company.com"
            required
          />
        </div>
        <div>
          <label className="form-label">Role <span style={{ color: 'var(--red)' }}>*</span></label>
          <select
            className="form-input"
            value={formData.role}
            onChange={e => setFormData(prev => ({ ...prev, role: e.target.value as TeamRole }))}
          >
            {roles.map(role => (
              <option key={role.value} value={role.value}>
                {role.label} - {role.description}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Monthly Spending Limit</label>
          <div style={{ display: 'flex', alignItems: 'stretch' }}>
            <span style={{ 
              padding: '8px 12px', background: 'var(--bg-secondary)', 
              border: '1px solid var(--border)', borderRight: 'none',
              borderRadius: '8px 0 0 8px', color: 'var(--text-secondary)',
              display: 'flex', alignItems: 'center'
            }}>$</span>
            <input
              type="number"
              className="form-input"
              style={{ borderRadius: '0 8px 8px 0' }}
              value={formData.spendingLimit || ''}
              onChange={e => setFormData(prev => ({ 
                ...prev, 
                spendingLimit: e.target.value ? parseFloat(e.target.value) : undefined 
              }))}
              placeholder="No limit"
              min="0"
              step="100"
            />
          </div>
          <small style={{ color: 'var(--text-secondary)' }}>Leave empty for unlimited</small>
        </div>

        {/* Advanced Permissions */}
        <div style={{ gridColumn: '1 / -1' }}>
          <button
            type="button"
            style={{ background: 'none', border: 'none', color: 'var(--accent)', padding: 0, cursor: 'pointer', fontSize: 14 }}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <i className={`ti ti-chevron-${showAdvanced ? 'up' : 'down'}`} style={{ marginRight: 4 }}></i>
            {showAdvanced ? 'Hide' : 'Show'} Advanced Permissions
          </button>
        </div>

        {showAdvanced && (
          <div style={{ gridColumn: '1 / -1' }}>
            <div className="card" style={{ background: 'var(--bg-secondary)' }}>
              <div className="card-body">
                <h6 style={{ marginBottom: 12 }}>Custom Permissions</h6>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {Object.entries(permissions).map(([key, value]) => (
                    <div key={key}>
                      <div className="form-check form-switch">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id={key}
                          checked={value}
                          onChange={e => setPermissions(prev => ({ ...prev, [key]: e.target.checked }))}
                        />
                        <label className="form-check-label" htmlFor={key}>
                          {formatPermissionLabel(key)}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
        <button type="button" className="btn-apple btn-apple-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button 
          type="submit" 
          className="btn-apple btn-apple-primary"
          disabled={isSubmitting || !formData.email}
        >
          {isSubmitting ? (
            <>
              <span className="spinner-apple" style={{ width: 16, height: 16, marginRight: 8 }}></span>
              Sending Invite...
            </>
          ) : (
            <>
              <i className="ti ti-send" style={{ marginRight: 4 }}></i>
              Send Invitation
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// Role Badge Component
interface RoleBadgeProps {
  role: TeamRole;
  size?: 'sm' | 'md' | 'lg';
}

export function RoleBadge({ role, size = 'md' }: RoleBadgeProps) {
  const config = getRoleConfig(role);
  const fontSize = size === 'sm' ? 11 : size === 'lg' ? 16 : 13;
  
  return (
    <span className="badge" style={{ ...config.style, fontSize }}>
      <i className={`ti ti-${config.icon}`} style={{ marginRight: 4 }}></i>
      {config.label}
    </span>
  );
}

// Spending Limit Progress
interface SpendingLimitProgressProps {
  spent: number;
  limit: number;
  showAmount?: boolean;
  className?: string;
}

export function SpendingLimitProgress({ spent, limit, showAmount = true, className = '' }: SpendingLimitProgressProps) {
  const percentage = (spent / limit) * 100;
  const isOverLimit = percentage > 100;
  const isNearLimit = percentage > 80;

  return (
    <div className={className}>
      {showAmount && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
          <span>{formatCurrency(spent)} spent</span>
          <span style={{ color: 'var(--text-secondary)' }}>{formatCurrency(limit)} limit</span>
        </div>
      )}
      <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-secondary)', overflow: 'hidden' }}>
        <div 
          style={{ 
            height: '100%', borderRadius: 4,
            width: `${Math.min(percentage, 100)}%`,
            background: isOverLimit ? 'var(--red)' : isNearLimit ? 'var(--orange)' : 'var(--green)',
          }}
        ></div>
      </div>
      {isNearLimit && !isOverLimit && (
        <small style={{ color: 'var(--orange)' }}>
          <i className="ti ti-alert-triangle" style={{ marginRight: 4 }}></i>
          {(100 - percentage).toFixed(0)}% remaining
        </small>
      )}
      {isOverLimit && (
        <small style={{ color: 'var(--red)' }}>
          <i className="ti ti-alert-circle" style={{ marginRight: 4 }}></i>
          Limit exceeded by {formatCurrency(spent - limit)}
        </small>
      )}
    </div>
  );
}

// Team Activity Feed
interface TeamActivity {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details?: string;
  timestamp: string;
}

interface TeamActivityFeedProps {
  activities: TeamActivity[];
  maxItems?: number;
}

export function TeamActivityFeed({ activities, maxItems = 10 }: TeamActivityFeedProps) {
  const displayActivities = activities.slice(0, maxItems);

  return (
    <div className="card">
      <div className="card-header">
        <h6 style={{ margin: 0 }}>
          <i className="ti ti-activity" style={{ marginRight: 8 }}></i>
          Team Activity
        </h6>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        {displayActivities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)' }}>
            <p style={{ margin: 0 }}>No recent activity</p>
          </div>
        ) : (
          <div>
            {displayActivities.map(activity => (
              <div key={activity.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <strong>{activity.userName}</strong>{' '}
                    <span style={{ color: 'var(--text-secondary)' }}>{activity.action}</span>
                    {activity.details && (
                      <span style={{ color: 'var(--text-secondary)' }}> - {activity.details}</span>
                    )}
                  </div>
                  <small style={{ color: 'var(--text-secondary)' }}>{formatRelativeTime(activity.timestamp)}</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper functions
function getRoleConfig(role: TeamRole) {
  const configs: Record<TeamRole, { label: string; style: { background: string; color: string }; icon: string }> = {
    owner: { label: 'Owner', style: { background: 'var(--text-primary)', color: '#fff' }, icon: 'crown' },
    admin: { label: 'Admin', style: { background: 'var(--red)', color: '#fff' }, icon: 'shield' },
    manager: { label: 'Manager', style: { background: 'var(--orange)', color: '#fff' }, icon: 'users' },
    buyer: { label: 'Buyer', style: { background: 'var(--accent)', color: '#fff' }, icon: 'shopping-cart' },
    viewer: { label: 'Viewer', style: { background: 'var(--text-tertiary)', color: '#fff' }, icon: 'eye' },
  };
  return configs[role];
}

function formatPermissionLabel(key: string): string {
  const labels: Record<string, string> = {
    canViewPrices: 'View Prices',
    canPlaceOrders: 'Place Orders',
    canApproveOrders: 'Approve Orders',
    canManageTeam: 'Manage Team',
    canViewReports: 'View Reports',
    canRequestQuotes: 'Request Quotes',
    canManageAddresses: 'Manage Addresses',
    canViewAllOrders: 'View All Orders',
  };
  return labels[key] || key;
}
