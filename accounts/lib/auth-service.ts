/**
 * Eagle B2B - Silent Authentication Service
 * Seamless Shopify SSO without user interruption
 */

import { storageService } from './storage-service';
import { broadcastService } from './broadcast-service';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.eagledtfsupply.com';

export class AuthService {
  private static instance: AuthService;
  private tokenRefreshTimer: NodeJS.Timeout | null = null;
  private activityTimer: NodeJS.Timeout | null = null;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
      AuthService.instance.init();
    }
    return AuthService.instance;
  }

  private init(): void {
    // Subscribe to cross-tab auth events
    broadcastService.subscribe('auth', (event) => {
      if (event.type === 'login' && event.token) {
        this.setToken(event.token);
      } else if (event.type === 'logout') {
        this.logout();
      } else if (event.type === 'refresh' && event.token) {
        this.setToken(event.token);
      }
    });

    // User activity detection
    if (typeof window !== 'undefined') {
      ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
        window.addEventListener(event, () => this.onUserActivity(), { passive: true });
      });
    }
  }

  private onUserActivity(): void {
    broadcastService.broadcastActivity();
    
    // Debounce activity ping
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
    }
    
    this.activityTimer = setTimeout(() => {
      this.ping();
    }, 5000);
  }

  /**
   * Silent Authentication - No user interruption
   */
  async silentAuth(shopifyCustomerId: string, email: string): Promise<boolean> {
    try {
      // Create hidden iframe for background auth
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.style.position = 'absolute';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      document.body.appendChild(iframe);

      // Background authentication
      const response = await fetch(
        `${API_URL}/api/v1/auth/shopify-callback?customer_id=${shopifyCustomerId}&email=${email}`,
        { 
          credentials: 'include',
          mode: 'cors'
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        if (data.token) {
          this.setToken(data.token);
          this.setUserData(data.user);
          this.startTokenRefresh();
          
          // Cleanup
          document.body.removeChild(iframe);
          return true;
        }
      }

      document.body.removeChild(iframe);
      return false;
    } catch (error) {
      console.error('Silent auth failed:', error);
      return false;
    }
  }

  /**
   * Set authentication token (multi-layer)
   */
  async setToken(token: string): Promise<void> {
    await storageService.set('eagle_token', token);
    await storageService.set('eagle_session', 'active');
  }

  /**
   * Get authentication token (multi-layer)
   */
  async getToken(): Promise<string | null> {
    return await storageService.get('eagle_token');
  }

  /**
   * Set user data (multi-layer)
   */
  async setUserData(user: any): Promise<void> {
    await storageService.set('eagle_userId', user.id);
    await storageService.set('eagle_companyId', user.companyId);
    await storageService.set('eagle_userEmail', user.email);
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    const session = await storageService.get('eagle_session');
    return !!(token && session === 'active');
  }

  /**
   * Auto token refresh - Safari ITP proof (< 7 days)
   */
  startTokenRefresh(): void {
    if (this.tokenRefreshTimer) {
      clearInterval(this.tokenRefreshTimer);
    }

    // Refresh every 6 hours (Safari-safe: < 7 days)
    this.tokenRefreshTimer = setInterval(async () => {
      await this.refreshToken();
    }, 6 * 60 * 60 * 1000);
  }

  /**
   * Refresh token silently (multi-layer)
   */
  async refreshToken(): Promise<boolean> {
    try {
      const currentToken = await this.getToken();
      if (!currentToken) return false;

      const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: currentToken }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          await this.setToken(data.token);
          broadcastService.broadcastRefresh(data.token);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  /**
   * Ping to keep session alive
   */
  private async ping(): Promise<void> {
    try {
      const token = await this.getToken();
      if (!token) return;

      await fetch(`${API_URL}/api/v1/auth/ping`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Ping failed:', error);
    }
  }

  /**
   * Logout (multi-layer clear)
   */
  async logout(): Promise<void> {
    await storageService.clear();
    
    if (this.tokenRefreshTimer) {
      clearInterval(this.tokenRefreshTimer);
    }
    
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
    }

    broadcastService.broadcastLogout();
  }

  /**
   * Session recovery - Try to restore session from storage
   */
  async recoverSession(): Promise<boolean> {
    try {
      const token = await this.getToken();
      
      if (!token) {
        return false;
      }

      // Validate token
      const response = await fetch(`${API_URL}/api/v1/auth/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.valid) {
          await this.setUserData(data.user);
          this.startTokenRefresh();
          return true;
        }
      }

      // Invalid token - clear
      await this.logout();
      return false;
    } catch (error) {
      console.error('Session recovery failed:', error);
      return false;
    }
  }

  /**
   * Shopify SSO - Generate Multipass URL
   */
  async getShopifySsoUrl(returnTo?: string): Promise<string | null> {
    try {
      const token = this.getToken();
      if (!token) return null;

      const response = await fetch(`${API_URL}/api/v1/auth/shopify-sso`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ returnTo }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.ssoUrl;
      }

      return null;
    } catch (error) {
      console.error('Shopify SSO URL generation failed:', error);
      return null;
    }
  }
}

// Global instance
export const authService = AuthService.getInstance();

