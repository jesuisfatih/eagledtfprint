'use client';

import { useState, useEffect } from 'react';
import { accountsFetch } from '@/lib/api-client';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  createdAt?: string;
  lastLoginAt?: string;
  orderCount?: number;
  totalSpent?: number;
  companyName?: string;
}

interface NotificationPreferences {
  orderUpdates: boolean;
  promotions: boolean;
  quoteAlerts: boolean;
  teamActivity: boolean;
  weeklyDigest: boolean;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
  });
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({
    orderUpdates: true,
    promotions: true,
    quoteAlerts: true,
    teamActivity: true,
    weeklyDigest: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingNotifs, setSavingNotifs] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile');
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  // Password change state
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await accountsFetch('/api/v1/company-users/me');
      
      if (response.ok) {
        const data = await response.json();
        setProfile({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phone: data.phone || '',
          role: data.role || 'member',
          createdAt: data.createdAt,
          lastLoginAt: data.lastLoginAt,
          orderCount: data.orderCount || 0,
          totalSpent: data.totalSpent || 0,
          companyName: data.company?.name || localStorage.getItem('eagle_companyName') || '',
        });
      }
    } catch (err) {
      console.error('Load profile error:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const response = await accountsFetch('/api/v1/company-users/me', {
        method: 'PUT',
        body: JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone,
        }),
      });
      
      if (response.ok) {
        setMessage({type: 'success', text: 'Profile updated successfully!'});
        localStorage.setItem('eagle_userName', `${profile.firstName} ${profile.lastName}`);
      } else {
        setMessage({type: 'error', text: 'Failed to update profile'});
      }
    } catch (err) {
      setMessage({type: 'error', text: 'Failed to update profile'});
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      setMessage({type: 'error', text: 'New passwords do not match'});
      return;
    }
    if (passwords.new.length < 8) {
      setMessage({type: 'error', text: 'Password must be at least 8 characters'});
      return;
    }
    // Password complexity: uppercase, lowercase, number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(passwords.new)) {
      setMessage({type: 'error', text: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'});
      return;
    }

    setChangingPassword(true);
    setMessage(null);

    try {
      const response = await accountsFetch('/api/v1/company-users/me/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.new,
        }),
      });

      if (response.ok) {
        setMessage({type: 'success', text: 'Password changed successfully!'});
        setPasswords({ current: '', new: '', confirm: '' });
      } else {
        const error = await response.json().catch(() => ({}));
        setMessage({type: 'error', text: error.message || 'Failed to change password'});
      }
    } catch (err) {
      setMessage({type: 'error', text: 'Failed to change password'});
    } finally {
      setChangingPassword(false);
    }
  };

  const saveNotificationPrefs = async () => {
    setSavingNotifs(true);
    try {
      const response = await accountsFetch('/api/v1/company-users/me/notifications', {
        method: 'PUT',
        body: JSON.stringify(notifPrefs),
      });

      if (response.ok) {
        setMessage({type: 'success', text: 'Notification preferences saved!'});
      } else {
        setMessage({type: 'error', text: 'Failed to save preferences'});
      }
    } catch (err) {
      setMessage({type: 'error', text: 'Failed to save preferences'});
    } finally {
      setSavingNotifs(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const configs: Record<string, { label: string; color: string; icon: string }> = {
      ADMIN: { label: 'Administrator', color: 'var(--red)', icon: 'shield' },
      MANAGER: { label: 'Manager', color: 'var(--orange)', icon: 'user-star' },
      BUYER: { label: 'Buyer', color: 'var(--accent)', icon: 'shopping-cart' },
      VIEWER: { label: 'Viewer', color: 'var(--text-secondary)', icon: 'eye' },
    };
    const config = configs[role] || { label: role, color: 'var(--text-secondary)', icon: 'user' };
    return (
      <span className="badge" style={{ background: config.color }}>
        <i className={`ti ti-${config.icon}`} style={{ marginRight: 4 }}></i>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div className="spinner-apple"></div>
        <p style={{ marginTop: 8, color: 'var(--text-secondary)' }}>Loading profile...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h4 style={{ fontWeight: 700, marginBottom: 4 }}>Account Settings</h4>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Manage your profile and preferences</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
        {/* Sidebar - Profile Card */}
        <div>
          <div className="card">
            <div className="card-body" style={{ textAlign: 'center' }}>
              <div 
                style={{ width: 100, height: 100, fontSize: 36, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, margin: '0 auto 12px' }}
              >
                {profile.firstName?.[0]}{profile.lastName?.[0]}
              </div>
              <h5 style={{ marginBottom: 4 }}>{profile.firstName} {profile.lastName}</h5>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>{profile.email}</p>
              {getRoleBadge(profile.role)}
              
              {profile.companyName && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <small style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Company</small>
                  <span style={{ fontWeight: 600 }}>{profile.companyName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats Card */}
          <div className="card" style={{ marginTop: 12 }}>
            <div className="card-body">
              <h6 style={{ marginBottom: 12 }}>Account Statistics</h6>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                  <h4 style={{ margin: 0, color: 'var(--accent)' }}>{profile.orderCount || 0}</h4>
                  <small style={{ color: 'var(--text-secondary)' }}>Orders</small>
                </div>
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                  <h4 style={{ margin: 0, color: 'var(--green)' }}>{formatCurrency(profile.totalSpent || 0)}</h4>
                  <small style={{ color: 'var(--text-secondary)' }}>Total Spent</small>
                </div>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, fontSize: 13, marginTop: 12, marginBottom: 0 }}>
                <li style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Member Since</span>
                  <span>{profile.createdAt ? formatRelativeTime(profile.createdAt) : 'N/A'}</span>
                </li>
                <li style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Last Login</span>
                  <span>{profile.lastLoginAt ? formatRelativeTime(profile.lastLoginAt) : 'N/A'}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div>
          {/* Tabs */}
          <div className="tab-bar" style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
            <button 
              className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => { setActiveTab('profile'); setMessage(null); }}
            >
              <i className="ti ti-user" style={{ marginRight: 4 }}></i>Profile
            </button>
            <button 
              className={`tab-button ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => { setActiveTab('security'); setMessage(null); }}
            >
              <i className="ti ti-lock" style={{ marginRight: 4 }}></i>Security
            </button>
            <button 
              className={`tab-button ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => { setActiveTab('notifications'); setMessage(null); }}
            >
              <i className="ti ti-bell" style={{ marginRight: 4 }}></i>Notifications
            </button>
          </div>

          {/* Alert Message */}
          {message && (
            <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
              <i className={`ti ti-${message.type === 'success' ? 'check' : 'alert-circle'}`} style={{ marginRight: 8 }}></i>
              {message.text}
              <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto', fontSize: 18, color: 'var(--text-secondary)' }} onClick={() => setMessage(null)}>×</button>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="card">
              <div className="card-header">
                <h5 className="card-title" style={{ margin: 0 }}>Personal Information</h5>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={profile.firstName}
                      onChange={(e) => setProfile({...profile, firstName: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={profile.lastName}
                      onChange={(e) => setProfile({...profile, lastName: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="form-input"
                      value={profile.email}
                      disabled
                    />
                    <small style={{ color: 'var(--text-secondary)' }}>Email cannot be changed</small>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={profile.phone}
                      onChange={(e) => setProfile({...profile, phone: e.target.value})}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
                <div style={{ marginTop: 20 }}>
                  <button onClick={saveProfile} disabled={saving} className="btn-apple btn-apple-primary">
                    {saving ? (
                      <>
                        <span className="spinner-apple" style={{ width: 16, height: 16, marginRight: 8 }}></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="ti ti-check" style={{ marginRight: 4 }}></i>Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="card">
              <div className="card-header">
                <h5 className="card-title" style={{ margin: 0 }}>Change Password</h5>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Current Password</label>
                    <input
                      type="password"
                      className="form-input"
                      value={passwords.current}
                      onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <input
                      type="password"
                      className="form-input"
                      value={passwords.new}
                      onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm New Password</label>
                    <input
                      type="password"
                      className="form-input"
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                    />
                  </div>
                </div>
                <div style={{ marginTop: 20 }}>
                  <button 
                    onClick={changePassword} 
                    disabled={changingPassword || !passwords.current || !passwords.new || !passwords.confirm}
                    className="btn-apple btn-apple-primary"
                  >
                    {changingPassword ? (
                      <>
                        <span className="spinner-apple" style={{ width: 16, height: 16, marginRight: 8 }}></span>
                        Updating...
                      </>
                    ) : (
                      <>
                        <i className="ti ti-lock" style={{ marginRight: 4 }}></i>Update Password
                      </>
                    )}
                  </button>
                </div>
                
                {/* Security Tips */}
                <div className="alert alert-info" style={{ marginTop: 20, marginBottom: 0 }}>
                  <h6 style={{ marginBottom: 8 }}>
                    <i className="ti ti-shield-check" style={{ marginRight: 4 }}></i>Password Tips
                  </h6>
                  <ul style={{ margin: 0, fontSize: 13 }}>
                    <li>Use at least 8 characters</li>
                    <li>Include uppercase and lowercase letters</li>
                    <li>Add numbers and special characters</li>
                    <li>Don't reuse passwords from other sites</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="card">
              <div className="card-header">
                <h5 className="card-title" style={{ margin: 0 }}>Email Notifications</h5>
              </div>
              <div className="card-body">
                <div style={{ marginBottom: 20 }}>
                  <div className="toggle-row" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="orderUpdates"
                      checked={notifPrefs.orderUpdates}
                      onChange={(e) => setNotifPrefs({...notifPrefs, orderUpdates: e.target.checked})}
                    />
                    <label htmlFor="orderUpdates">
                      <strong>Order Updates</strong>
                      <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>Receive notifications about order status changes and shipping updates</p>
                    </label>
                  </div>
                  <div className="toggle-row" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="quoteAlerts"
                      checked={notifPrefs.quoteAlerts}
                      onChange={(e) => setNotifPrefs({...notifPrefs, quoteAlerts: e.target.checked})}
                    />
                    <label htmlFor="quoteAlerts">
                      <strong>Quote Alerts</strong>
                      <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>Get notified when quotes are ready or about to expire</p>
                    </label>
                  </div>
                  <div className="toggle-row" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="teamActivity"
                      checked={notifPrefs.teamActivity}
                      onChange={(e) => setNotifPrefs({...notifPrefs, teamActivity: e.target.checked})}
                    />
                    <label htmlFor="teamActivity">
                      <strong>Team Activity</strong>
                      <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>Notifications about team member actions and approvals</p>
                    </label>
                  </div>
                  <div className="toggle-row" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="promotions"
                      checked={notifPrefs.promotions}
                      onChange={(e) => setNotifPrefs({...notifPrefs, promotions: e.target.checked})}
                    />
                    <label htmlFor="promotions">
                      <strong>Promotions & Deals</strong>
                      <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>Special offers, discounts, and exclusive B2B deals</p>
                    </label>
                  </div>
                  <div className="toggle-row" style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="weeklyDigest"
                      checked={notifPrefs.weeklyDigest}
                      onChange={(e) => setNotifPrefs({...notifPrefs, weeklyDigest: e.target.checked})}
                    />
                    <label htmlFor="weeklyDigest">
                      <strong>Weekly Digest</strong>
                      <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>Weekly summary of your account activity and spending</p>
                    </label>
                  </div>
                </div>
                <button onClick={saveNotificationPrefs} disabled={savingNotifs} className="btn-apple btn-apple-primary">
                  {savingNotifs ? (
                    <>
                      <span className="spinner-apple" style={{ width: 16, height: 16, marginRight: 8 }}></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="ti ti-check" style={{ marginRight: 4 }}></i>Save Preferences
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}