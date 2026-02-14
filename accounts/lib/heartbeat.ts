/**
 * Heartbeat Service - Keep session alive
 * Safari 7-day timer reset
 */

import { authService } from './auth-service';
import { config } from './config';

const API_URL = config.apiUrl;
const PING_INTERVAL = 5 * 60 * 1000; // 5 minutes
const ACTIVITY_THRESHOLD = 30 * 1000; // 30 seconds

class HeartbeatService {
  private pingTimer: NodeJS.Timeout | null = null;
  private lastActivity: number = Date.now();
  private isActive: boolean = false;

  start(): void {
    if (this.pingTimer) {
      return; // Already running
    }

    // Track user activity
    this.trackActivity();

    // Ping every 5 minutes
    this.pingTimer = setInterval(async () => {
      await this.ping();
    }, PING_INTERVAL);

    console.log('✅ Heartbeat service started');
  }

  stop(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    this.isActive = false;
  }

  private async ping(): Promise<void> {
    try {
      // Only ping if user was active in last 30 seconds
      const timeSinceActivity = Date.now() - this.lastActivity;

      if (timeSinceActivity > ACTIVITY_THRESHOLD) {
        return; // User inactive, skip ping
      }

      const token = await authService.getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/api/v1/auth/ping`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok && response.status === 401) {
        // Token expired - try refresh
        await authService.refreshToken();
      }
    } catch (error) {
      console.error('Heartbeat ping failed:', error);
    }
  }

  private trackActivity(): void {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    const updateActivity = () => {
      this.lastActivity = Date.now();
      this.isActive = true;
    };

    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });
  }

  getLastActivity(): number {
    return this.lastActivity;
  }

  isUserActive(): boolean {
    const timeSinceActivity = Date.now() - this.lastActivity;
    return timeSinceActivity < ACTIVITY_THRESHOLD;
  }
}

export const heartbeat = new HeartbeatService();
