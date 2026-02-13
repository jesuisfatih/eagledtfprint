'use client';

import { useState, useEffect } from 'react';
import { adminFetch } from '@/lib/api-client';
import type { Notification } from '@/types';

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await adminFetch('/api/v1/notifications');
      const data = await response.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      setNotifications([]);
    }
  };

  return (
    <ul className="dropdown-menu dropdown-menu-end">
      <li className="dropdown-header">
        <h6 className="mb-0">Notifications</h6>
        <span className="badge bg-label-primary rounded-pill">{notifications.length}</span>
      </li>
      <li><hr className="dropdown-divider" /></li>
      {notifications.length === 0 ? (
        <li className="dropdown-item text-center text-muted">
          No new notifications
        </li>
      ) : (
        notifications.slice(0, 5).map((notif) => (
          <li key={notif.id}>
            <a className="dropdown-item" href="javascript:void(0);">
              <div className="d-flex">
                <div className="flex-shrink-0">
                  <i className={`ti ti-${notif.type === 'order' ? 'shopping-cart' : 'bell'} text-primary`}></i>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h6 className="mb-1">{notif.title}</h6>
                  <p className="mb-0 small text-muted">{notif.message}</p>
                </div>
              </div>
            </a>
          </li>
        ))
      )}
    </ul>
  );
}

