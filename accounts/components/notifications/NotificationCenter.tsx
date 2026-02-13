'use client';

import { useState } from 'react';
import { formatRelativeTime } from '@/lib/utils';

// Notification types
export type NotificationType = 
  | 'order'
  | 'quote'
  | 'team'
  | 'product'
  | 'promo'
  | 'system'
  | 'approval'
  | 'payment'
  | 'shipping'
  | 'alert';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

interface Notification {
  id: string;
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
}

// Notification Center Component
interface NotificationCenterProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  isLoading?: boolean;
}

export function NotificationCenter({ 
  notifications, 
  onMarkAsRead, 
  onMarkAllAsRead,
  onDelete,
  isLoading = false 
}: NotificationCenterProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | NotificationType>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'unread') return !n.isRead;
    return n.type === activeFilter;
  });

  const handleMarkAsRead = async (id: string) => {
    setProcessingId(id);
    try {
      await onMarkAsRead(id);
    } finally {
      setProcessingId(null);
    }
  };

  const filters: Array<{ key: 'all' | 'unread' | NotificationType; label: string; icon: string }> = [
    { key: 'all', label: 'All', icon: 'bell' },
    { key: 'unread', label: 'Unread', icon: 'bell-ringing' },
    { key: 'order', label: 'Orders', icon: 'shopping-cart' },
    { key: 'quote', label: 'Quotes', icon: 'file-invoice' },
    { key: 'promo', label: 'Promos', icon: 'discount' },
    { key: 'system', label: 'System', icon: 'settings' },
  ];

  return (
    <div className="notification-center">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h4 style={{ marginBottom: '0.25rem' }}>Notifications</h4>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 0 }}>
            {unreadCount > 0 
              ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
              : 'All caught up!'
            }
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            className="btn-apple btn-apple-secondary"
            onClick={onMarkAllAsRead}
            disabled={processingId === 'all'}
          >
            {processingId === 'all' ? (
              <span className="spinner-apple" style={{ width: 14, height: 14, marginRight: '0.25rem' }}></span>
            ) : (
              <i className="ti ti-checks" style={{ marginRight: '0.25rem' }}></i>
            )}
            Mark all as read
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {filters.map(filter => (
          <button
            key={filter.key}
            className={activeFilter === filter.key ? 'btn-apple btn-apple-primary' : 'btn-apple btn-apple-secondary'}
            onClick={() => setActiveFilter(filter.key)}
          >
            <i className={`ti ti-${filter.icon}`} style={{ marginRight: '0.25rem' }}></i>
            {filter.label}
            {filter.key === 'unread' && unreadCount > 0 && (
              <span className="badge" style={{ background: 'var(--red)', color: '#fff', marginLeft: '0.25rem' }}>{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <div className="spinner-apple" style={{ color: 'var(--accent)' }}></div>
          <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading notifications...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <i className="ti ti-bell-off ti-3x" style={{ color: 'var(--text-secondary)', marginBottom: '1rem', display: 'block' }}></i>
          <h5>No notifications</h5>
          <p style={{ color: 'var(--text-secondary)' }}>
            {activeFilter === 'unread' 
              ? 'You have no unread notifications' 
              : 'No notifications in this category'
            }
          </p>
        </div>
      ) : (
        <div className="notifications-list">
          {filteredNotifications.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
              onDelete={onDelete}
              isProcessing={processingId === notification.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Single notification item
interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
  isProcessing?: boolean;
  compact?: boolean;
}

export function NotificationItem({ 
  notification, 
  onMarkAsRead, 
  onDelete,
  isProcessing = false,
  compact = false 
}: NotificationItemProps) {
  const config = getNotificationConfig(notification.type);
  const priorityConfig = getPriorityConfig(notification.priority);

  return (
    <div 
      className="card"
      style={{ marginBottom: '0.5rem', ...((!notification.isRead) ? { borderLeft: '3px solid var(--accent)' } : {}) }}
    >
      <div className="card-body" style={compact ? { paddingTop: '0.5rem', paddingBottom: '0.5rem' } : undefined}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {/* Icon */}
          <div 
            style={{ borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: config.bgColor, width: compact ? 36 : 44, height: compact ? 36 : 44 }}
          >
            <i className={`ti ti-${config.icon} ${compact ? '' : 'fs-5'}`} style={{ color: '#fff' }}></i>
          </div>

          {/* Content */}
          <div style={{ flexGrow: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flexGrow: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <h6 style={{ marginBottom: 0, ...((!notification.isRead) ? { fontWeight: 700 } : {}) }}>
                    {notification.title}
                  </h6>
                  {notification.priority && notification.priority !== 'normal' && (
                    <span className="badge" style={{ background: priorityConfig.bgColor, color: priorityConfig.color, fontSize: '0.75rem' }}>
                      {priorityConfig.label}
                    </span>
                  )}
                </div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem', ...(compact ? { fontSize: '0.85rem' } : {}) }}>
                  {notification.message}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <small style={{ color: 'var(--text-secondary)' }}>
                    {formatRelativeTime(notification.createdAt)}
                  </small>
                  {notification.actionUrl && (
                    <a 
                      href={notification.actionUrl} 
                      style={{ fontSize: '0.85rem' }}
                    >
                      {notification.actionLabel || 'View'} →
                    </a>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                {!notification.isRead && (
                  <button
                    className="btn-apple btn-apple-secondary"
                    onClick={() => onMarkAsRead(notification.id)}
                    disabled={isProcessing}
                    title="Mark as read"
                  >
                    {isProcessing ? (
                      <span className="spinner-apple" style={{ width: 14, height: 14 }}></span>
                    ) : (
                      <i className="ti ti-check"></i>
                    )}
                  </button>
                )}
                {onDelete && (
                  <button
                    className="btn-apple btn-apple-secondary"
                    onClick={() => onDelete(notification.id)}
                    title="Delete"
                  >
                    <i className="ti ti-trash"></i>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Notification dropdown for header
interface NotificationDropdownProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => Promise<void>;
  onViewAll: () => void;
  maxItems?: number;
}

export function NotificationDropdown({ 
  notifications, 
  onMarkAsRead, 
  onViewAll,
  maxItems = 5 
}: NotificationDropdownProps) {
  const unreadNotifications = notifications.filter(n => !n.isRead);
  const displayNotifications = unreadNotifications.slice(0, maxItems);

  return (
    <div className="dropdown">
      <button
        type="button"
        className="btn-apple btn-apple-secondary"
        style={{ position: 'relative' }}
        data-bs-toggle="dropdown"
        aria-expanded="false"
      >
        <i className="ti ti-bell"></i>
        {unreadNotifications.length > 0 && (
          <span className="badge" style={{ position: 'absolute', top: 0, right: 0, transform: 'translate(50%, -50%)', background: 'var(--red)', color: '#fff', borderRadius: '999px' }}>
            {unreadNotifications.length > 99 ? '99+' : unreadNotifications.length}
          </span>
        )}
      </button>
      <div className="dropdown-menu dropdown-menu-end" style={{ width: 360, maxHeight: 400, overflowY: 'auto' }}>
        <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h6 style={{ marginBottom: 0 }}>Notifications</h6>
          {unreadNotifications.length > 0 && (
            <span className="badge" style={{ background: 'var(--accent)', color: '#fff' }}>{unreadNotifications.length} new</span>
          )}
        </div>
        
        {displayNotifications.length === 0 ? (
          <div style={{ padding: '1.5rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <i className="ti ti-bell-off" style={{ marginBottom: '0.5rem', display: 'block' }}></i>
            <p style={{ marginBottom: 0, fontSize: '0.85rem' }}>No new notifications</p>
          </div>
        ) : (
          <div style={{ padding: '0.5rem' }}>
            {displayNotifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={onMarkAsRead}
                compact
              />
            ))}
          </div>
        )}
        
        <div style={{ padding: '0.5rem 1rem', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
          <button className="btn-apple btn-apple-secondary" onClick={onViewAll}>
            View all notifications
          </button>
        </div>
      </div>
    </div>
  );
}

// Notification toast for real-time updates
interface NotificationToastProps {
  notification: Notification;
  onClose: () => void;
  onAction?: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export function NotificationToast({ 
  notification, 
  onClose, 
  onAction,
  autoClose = true,
  autoCloseDelay = 5000 
}: NotificationToastProps) {
  const config = getNotificationConfig(notification.type);

  // Auto close effect handled by parent

  return (
    <div 
      className="toast show"
      style={{ position: 'fixed', top: 20, right: 20, zIndex: 1050, minWidth: 300 }}
      role="alert"
    >
      <div className="toast-header">
        <span className="badge" style={{ background: config.bgColor, color: '#fff', marginRight: '0.5rem' }}>
          <i className={`ti ti-${config.icon}`}></i>
        </span>
        <strong style={{ marginRight: 'auto' }}>{notification.title}</strong>
        <small>{formatRelativeTime(notification.createdAt)}</small>
        <button type="button" className="btn-apple btn-apple-secondary" style={{ marginLeft: '0.5rem', padding: '0.25rem' }} onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div className="toast-body">
        {notification.message}
        {(notification.actionUrl || onAction) && (
          <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
            <a 
              href={notification.actionUrl || '#'} 
              className="btn-apple btn-apple-primary"
              onClick={(e) => {
                if (onAction) {
                  e.preventDefault();
                  onAction();
                }
              }}
            >
              {notification.actionLabel || 'View Details'}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// Notification preferences component
interface NotificationPreference {
  type: NotificationType;
  email: boolean;
  push: boolean;
  inApp: boolean;
}

interface NotificationPreferencesProps {
  preferences: NotificationPreference[];
  onUpdate: (preferences: NotificationPreference[]) => Promise<void>;
  isSaving?: boolean;
}

export function NotificationPreferences({ 
  preferences, 
  onUpdate,
  isSaving = false 
}: NotificationPreferencesProps) {
  const [localPrefs, setLocalPrefs] = useState<NotificationPreference[]>(preferences);

  const handleToggle = (type: NotificationType, channel: 'email' | 'push' | 'inApp') => {
    setLocalPrefs(prev => prev.map(pref => 
      pref.type === type ? { ...pref, [channel]: !pref[channel] } : pref
    ));
  };

  const handleSave = () => {
    onUpdate(localPrefs);
  };

  const typeLabels: Record<NotificationType, string> = {
    order: 'Order Updates',
    quote: 'Quote Notifications',
    team: 'Team Activity',
    product: 'Product Updates',
    promo: 'Promotions & Offers',
    system: 'System Notifications',
    approval: 'Approval Requests',
    payment: 'Payment Notifications',
    shipping: 'Shipping Updates',
    alert: 'Important Alerts',
  };

  return (
    <div className="card">
      <div className="card-header">
        <h6 style={{ marginBottom: 0 }}>
          <i className="ti ti-settings" style={{ marginRight: '0.5rem' }}></i>
          Notification Preferences
        </h6>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <div className="table-responsive">
          <table className="table" style={{ marginBottom: 0 }}>
            <thead>
              <tr>
                <th>Notification Type</th>
                <th style={{ textAlign: 'center' }}>Email</th>
                <th style={{ textAlign: 'center' }}>Push</th>
                <th style={{ textAlign: 'center' }}>In-App</th>
              </tr>
            </thead>
            <tbody>
              {localPrefs.map(pref => (
                <tr key={pref.type}>
                  <td>{typeLabels[pref.type] || pref.type}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="form-check form-switch" style={{ display: 'inline-block' }}>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={pref.email}
                        onChange={() => handleToggle(pref.type, 'email')}
                      />
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="form-check form-switch" style={{ display: 'inline-block' }}>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={pref.push}
                        onChange={() => handleToggle(pref.type, 'push')}
                      />
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="form-check form-switch" style={{ display: 'inline-block' }}>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={pref.inApp}
                        onChange={() => handleToggle(pref.type, 'inApp')}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card-footer" style={{ textAlign: 'right' }}>
        <button 
          className="btn-apple btn-apple-primary"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <span className="spinner-apple" style={{ width: 14, height: 14, marginRight: '0.5rem' }}></span>
              Saving...
            </>
          ) : (
            <>
              <i className="ti ti-check" style={{ marginRight: '0.25rem' }}></i>
              Save Preferences
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Helper functions
function getNotificationConfig(type: NotificationType) {
  const configs: Record<NotificationType, { icon: string; bgColor: string }> = {
    order: { icon: 'shopping-cart', bgColor: 'var(--accent)' },
    quote: { icon: 'file-invoice', bgColor: 'var(--blue, #007aff)' },
    team: { icon: 'users', bgColor: 'var(--purple)' },
    product: { icon: 'package', bgColor: 'var(--orange)' },
    promo: { icon: 'discount', bgColor: 'var(--green)' },
    system: { icon: 'settings', bgColor: 'var(--text-tertiary)' },
    approval: { icon: 'checklist', bgColor: 'var(--orange)' },
    payment: { icon: 'credit-card', bgColor: 'var(--green)' },
    shipping: { icon: 'truck', bgColor: 'var(--blue, #007aff)' },
    alert: { icon: 'alert-triangle', bgColor: 'var(--red)' },
  };
  return configs[type] || { icon: 'bell', bgColor: 'var(--text-tertiary)' };
}

function getPriorityConfig(priority?: NotificationPriority) {
  const configs: Record<NotificationPriority, { label: string; bgColor: string; color: string }> = {
    low: { label: 'Low', bgColor: 'var(--text-tertiary)', color: '#fff' },
    normal: { label: 'Normal', bgColor: 'var(--blue, #007aff)', color: '#fff' },
    high: { label: 'High', bgColor: 'var(--orange)', color: '#fff' },
    urgent: { label: 'Urgent', bgColor: 'var(--red)', color: '#fff' },
  };
  return configs[priority || 'normal'];
}
