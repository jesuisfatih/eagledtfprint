'use client';

import { useState, useEffect } from 'react';
import { accountsFetch } from '@/lib/api-client';
import { formatRelativeTime } from '@/lib/utils';
import type { NotificationType } from '@/components/notifications/NotificationCenter';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  actionLabel?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | NotificationType>('all');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await accountsFetch('/api/v1/notifications');
      const data = await response.json();
      setNotifications(Array.isArray(data) ? data : data.notifications || []);
    } catch (err) {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      setMarkingRead(id);
      const response = await accountsFetch(`/api/v1/notifications/${id}/read`, { method: 'PUT' });
      if (response.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? {...n, isRead: true} : n));
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    } finally {
      setMarkingRead(null);
    }
  };

  const markAllAsRead = async () => {
    try {
      setMarkingRead('all');
      const response = await accountsFetch('/api/v1/notifications/read-all', { method: 'PUT' });
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({...n, isRead: true})));
      }
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    } finally {
      setMarkingRead(null);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const response = await accountsFetch(`/api/v1/notifications/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const getNotificationConfig = (type: NotificationType) => {
    const configs: Record<NotificationType, { icon: string; bgColor: string }> = {
      order: { icon: 'shopping-cart', bgColor: 'var(--accent)' },
      quote: { icon: 'file-invoice', bgColor: 'var(--accent)' },
      team: { icon: 'users', bgColor: '#8B5CF6' },
      product: { icon: 'package', bgColor: 'var(--orange)' },
      promo: { icon: 'discount', bgColor: 'var(--green)' },
      system: { icon: 'settings', bgColor: 'var(--text-secondary)' },
      approval: { icon: 'checklist', bgColor: 'var(--orange)' },
      payment: { icon: 'credit-card', bgColor: 'var(--green)' },
      shipping: { icon: 'truck', bgColor: 'var(--accent)' },
      alert: { icon: 'alert-triangle', bgColor: 'var(--red)' },
    };
    return configs[type] || { icon: 'bell', bgColor: 'var(--text-secondary)' };
  };

  const getPriorityBadge = (priority?: string) => {
    if (!priority || priority === 'normal') return null;
    const configs: Record<string, { label: string; color: string }> = {
      low: { label: 'Low', color: 'var(--text-secondary)' },
      high: { label: 'High', color: 'var(--orange)' },
      urgent: { label: 'Urgent', color: 'var(--red)' },
    };
    const config = configs[priority];
    return config ? <span className="badge" style={{ background: config.color, color: '#fff', marginLeft: 8, fontSize: 11 }}>{config.label}</span> : null;
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.isRead;
    return n.type === filter;
  });

  const filters: Array<{ key: 'all' | 'unread' | NotificationType; label: string; icon: string }> = [
    { key: 'all', label: 'All', icon: 'bell' },
    { key: 'unread', label: 'Unread', icon: 'bell-ringing' },
    { key: 'order', label: 'Orders', icon: 'shopping-cart' },
    { key: 'quote', label: 'Quotes', icon: 'file-invoice' },
    { key: 'promo', label: 'Promos', icon: 'discount' },
    { key: 'system', label: 'System', icon: 'settings' },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h4 style={{ fontWeight: 700, marginBottom: 4 }}>Notifications</h4>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            {unreadCount > 0 
              ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
              : 'All caught up!'
            }
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            className="btn-apple btn-apple-secondary"
            onClick={markAllAsRead}
            disabled={markingRead === 'all'}
          >
            {markingRead === 'all' ? (
              <span className="spinner-apple" style={{ width: 14, height: 14, marginRight: 8 }}></span>
            ) : (
              <i className="ti ti-checks" style={{ marginRight: 4 }}></i>
            )}
            Mark all as read
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <div>
          <div className="card" style={{ background: 'var(--accent)', color: '#fff' }}>
            <div className="card-body" style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, opacity: 0.75 }}>Total</p>
                  <h3 style={{ margin: 0 }}>{notifications.length}</h3>
                </div>
                <i className="ti ti-bell" style={{ fontSize: 28, opacity: 0.5 }}></i>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div className="card">
            <div className="card-body" style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Unread</p>
                  <h3 style={{ margin: 0, color: 'var(--red)' }}>{unreadCount}</h3>
                </div>
                <i className="ti ti-bell-ringing" style={{ fontSize: 28, color: 'var(--red)', opacity: 0.5 }}></i>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div className="card">
            <div className="card-body" style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Orders</p>
                  <h3 style={{ margin: 0 }}>{notifications.filter(n => n.type === 'order').length}</h3>
                </div>
                <i className="ti ti-shopping-cart" style={{ fontSize: 28, color: 'var(--accent)', opacity: 0.5 }}></i>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div className="card">
            <div className="card-body" style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Promos</p>
                  <h3 style={{ margin: 0 }}>{notifications.filter(n => n.type === 'promo').length}</h3>
                </div>
                <i className="ti ti-discount" style={{ fontSize: 28, color: 'var(--green)', opacity: 0.5 }}></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {filters.map(f => (
          <button
            key={f.key}
            className={filter === f.key ? 'btn-apple btn-apple-primary' : 'btn-apple btn-apple-secondary'}
            onClick={() => setFilter(f.key)}
            style={{ fontSize: 13 }}
          >
            <i className={`ti ti-${f.icon}`} style={{ marginRight: 4 }}></i>
            {f.label}
            {f.key === 'unread' && unreadCount > 0 && (
              <span className="badge" style={{ background: 'var(--red)', color: '#fff', marginLeft: 4 }}>{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div className="spinner-apple"></div>
              <p style={{ marginTop: 16, color: 'var(--text-secondary)' }}>Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <i className="ti ti-bell-off ti-3x" style={{ color: 'var(--text-secondary)', marginBottom: 12, display: 'block' }}></i>
              <h5>No notifications</h5>
              <p style={{ color: 'var(--text-secondary)' }}>
                {filter === 'unread' 
                  ? 'You have no unread notifications' 
                  : 'No notifications in this category'
                }
              </p>
            </div>
          ) : (
            <div className="notifications-list">
              {filteredNotifications.map((notification) => {
                const config = getNotificationConfig(notification.type);
                
                return (
                  <div 
                    key={notification.id}
                    className="card"
                    style={{ marginBottom: 8, borderLeft: !notification.isRead ? '3px solid var(--accent)' : undefined }}
                  >
                    <div className="card-body" style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 12 }}>
                        {/* Icon */}
                        <div 
                          style={{ width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: config.bgColor }}
                        >
                          <i className={`ti ti-${config.icon}`} style={{ fontSize: 18, color: '#fff' }}></i>
                        </div>

                        {/* Content */}
                        <div style={{ flexGrow: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flexGrow: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <h6 style={{ margin: 0, fontWeight: !notification.isRead ? 700 : undefined }}>
                                  {notification.title}
                                </h6>
                                {!notification.isRead && (
                                  <span className="badge" style={{ background: 'var(--accent)', color: '#fff', fontSize: 11 }}>NEW</span>
                                )}
                                {getPriorityBadge(notification.priority)}
                              </div>
                              <p style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{notification.message}</p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <small style={{ color: 'var(--text-secondary)' }}>
                                  {formatRelativeTime(notification.createdAt)}
                                </small>
                                {notification.actionUrl && (
                                  <a href={notification.actionUrl} style={{ fontSize: 13 }}>
                                    {notification.actionLabel || 'View'} →
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                              {!notification.isRead && (
                                <button
                                  className="btn-apple btn-apple-secondary"
                                  onClick={() => markAsRead(notification.id)}
                                  disabled={markingRead === notification.id}
                                  title="Mark as read"
                                  style={{ padding: '4px 8px', fontSize: 13 }}
                                >
                                  {markingRead === notification.id ? (
                                    <span className="spinner-apple" style={{ width: 14, height: 14 }}></span>
                                  ) : (
                                    <i className="ti ti-check"></i>
                                  )}
                                </button>
                              )}
                              <button
                                className="btn-apple btn-apple-secondary"
                                onClick={() => deleteNotification(notification.id)}
                                title="Delete"
                                style={{ padding: '4px 8px', fontSize: 13 }}
                              >
                                <i className="ti ti-trash"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

