'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.eagledtfsupply.com';
const WS_URL = API_URL.replace('https://', 'wss://').replace('http://', 'ws://');

export interface Notification {
  id: string;
  type: 'order' | 'quote' | 'approval' | 'system' | 'sync' | 'cart';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  createdAt: Date;
}

type NotificationCallback = (notification: Notification) => void;

interface UseNotificationsReturn {
  connected: boolean;
  notifications: Notification[];
  unreadCount: number;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

/**
 * Hook for real-time notifications via WebSocket
 */
export function useNotifications(onNotification?: NotificationCallback): UseNotificationsReturn {
  const socketRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    const token = localStorage.getItem('eagle_token');
    if (!token) {
      console.log('No token, skipping WebSocket connection');
      return;
    }

    // Close existing connection
    if (socketRef.current) {
      socketRef.current.close();
    }

    try {
      const wsUrl = `${WS_URL}/notifications?token=${token}`;
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('🔌 WebSocket connected');
        setConnected(true);
        reconnectAttempts.current = 0;
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.event === 'notification') {
            const notification: Notification = {
              ...data,
              createdAt: new Date(data.createdAt),
            };
            
            setNotifications(prev => [notification, ...prev].slice(0, 50));
            setUnreadCount(prev => prev + 1);
            
            if (onNotification) {
              onNotification(notification);
            }
          } else if (data.event === 'connected') {
            console.log('📡 WebSocket authenticated:', data);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      socket.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.reason);
        setConnected(false);
        socketRef.current = null;

        // Attempt reconnection
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`Reconnecting in ${delay}ms...`);
          reconnectAttempts.current++;
          setTimeout(connect, delay);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      socketRef.current = socket;
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
    }
  }, [onNotification]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setConnected(false);
  }, []);

  const sendMessage = useCallback((event: string, data: Record<string, unknown>) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ event, ...data }));
    }
  }, []);

  const subscribe = useCallback((channel: string) => {
    sendMessage('subscribe', { channel });
  }, [sendMessage]);

  const unsubscribe = useCallback((channel: string) => {
    sendMessage('unsubscribe', { channel });
  }, [sendMessage]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    
    // Also call API to persist
    const token = localStorage.getItem('eagle_token');
    if (token) {
      fetch(`${API_URL}/api/v1/notifications/${id}/read`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }).catch(err => console.error('Failed to mark as read:', err));
    }
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    
    // Also call API to persist
    const token = localStorage.getItem('eagle_token');
    if (token) {
      fetch(`${API_URL}/api/v1/notifications/read-all`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }).catch(err => console.error('Failed to mark all as read:', err));
    }
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Reconnect on token change
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'eagle_token') {
        if (e.newValue) {
          connect();
        } else {
          disconnect();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [connect, disconnect]);

  return {
    connected,
    notifications,
    unreadCount,
    subscribe,
    unsubscribe,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };
}

/**
 * Fetch notifications from API (for initial load)
 */
export async function fetchNotifications(
  limit = 50,
  offset = 0
): Promise<{ notifications: Notification[]; total: number }> {
  const token = localStorage.getItem('eagle_token');
  if (!token) {
    return { notifications: [], total: 0 };
  }

  try {
    const response = await fetch(
      `${API_URL}/api/v1/notifications?limit=${limit}&offset=${offset}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch notifications');
    }

    const data = await response.json();
    return {
      notifications: data.notifications.map((n: Notification & { createdAt: string }) => ({
        ...n,
        createdAt: new Date(n.createdAt),
      })),
      total: data.total,
    };
  } catch (err) {
    console.error('Failed to fetch notifications:', err);
    return { notifications: [], total: 0 };
  }
}

/**
 * Fetch unread count from API
 */
export async function fetchUnreadCount(): Promise<number> {
  const token = localStorage.getItem('eagle_token');
  if (!token) {
    return 0;
  }

  try {
    const response = await fetch(`${API_URL}/api/v1/notifications/unread-count`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch unread count');
    }

    const data = await response.json();
    return data.count || 0;
  } catch (err) {
    console.error('Failed to fetch unread count:', err);
    return 0;
  }
}
