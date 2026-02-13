/**
 * BroadcastChannel Service
 * Cross-tab authentication sync
 */

type AuthEvent = {
  type: 'login' | 'logout' | 'refresh' | 'activity';
  token?: string;
  userId?: string;
  timestamp: number;
};

class BroadcastService {
  private channel: BroadcastChannel | null = null;
  private listeners: Map<string, (event: AuthEvent) => void> = new Map();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('eagle_auth');
      this.channel.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    }
  }

  /**
   * Broadcast login to all tabs
   */
  broadcastLogin(token: string, userId: string): void {
    this.broadcast({
      type: 'login',
      token,
      userId,
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast logout to all tabs
   */
  broadcastLogout(): void {
    this.broadcast({
      type: 'logout',
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast token refresh to all tabs
   */
  broadcastRefresh(token: string): void {
    this.broadcast({
      type: 'refresh',
      token,
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast user activity (reset Safari timer)
   */
  broadcastActivity(): void {
    this.broadcast({
      type: 'activity',
      timestamp: Date.now(),
    });
  }

  /**
   * Subscribe to auth events
   */
  subscribe(id: string, callback: (event: AuthEvent) => void): void {
    this.listeners.set(id, callback);
  }

  /**
   * Unsubscribe from auth events
   */
  unsubscribe(id: string): void {
    this.listeners.delete(id);
  }

  private broadcast(event: AuthEvent): void {
    if (this.channel) {
      this.channel.postMessage(event);
    }
  }

  private handleMessage(event: AuthEvent): void {
    this.listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Broadcast listener error:', error);
      }
    });
  }

  close(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.listeners.clear();
  }
}

export const broadcastService = new BroadcastService();

