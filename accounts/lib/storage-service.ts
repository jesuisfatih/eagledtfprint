/**
 * Multi-Layer Storage Service
 * Safari ITP + Chrome Privacy Sandbox proof
 */

import { indexedDB } from './indexed-db';

class StorageService {
  /**
   * Set value across all storage layers
   * Safari-proof: Multiple fallbacks
   */
  async set(key: string, value: any): Promise<void> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    try {
      // Layer 1: Cookie (30 days)
      document.cookie = `${key}=${encodeURIComponent(stringValue)}; path=/; max-age=2592000; secure; samesite=lax`;
    } catch (e) {
      console.warn('Cookie storage failed:', e);
    }

    try {
      // Layer 2: LocalStorage
      localStorage.setItem(key, stringValue);
    } catch (e) {
      console.warn('LocalStorage failed:', e);
    }

    try {
      // Layer 3: SessionStorage
      sessionStorage.setItem(key, stringValue);
    } catch (e) {
      console.warn('SessionStorage failed:', e);
    }

    try {
      // Layer 4: IndexedDB (Safari-proof, persistent)
      await indexedDB.set(key, stringValue);
    } catch (e) {
      console.warn('IndexedDB failed:', e);
    }

    try {
      // Layer 5: Credential Manager (if password)
      if (key === 'eagle_token' && 'credentials' in navigator) {
        const email = await this.get('eagle_userEmail');
        if (email) {
          await (navigator.credentials as any).store({
            id: email,
            password: stringValue,
            name: email,
          });
        }
      }
    } catch (e) {
      console.warn('Credential Manager failed:', e);
    }
  }

  /**
   * Get value from any storage layer
   * Try all layers, return first found
   */
  async get(key: string): Promise<string | null> {
    // Layer 1: Cookie
    try {
      const cookie = document.cookie
        .split('; ')
        .find(row => row.startsWith(key + '='));
      
      if (cookie) {
        return decodeURIComponent(cookie.split('=')[1]);
      }
    } catch (e) {}

    // Layer 2: LocalStorage
    try {
      const value = localStorage.getItem(key);
      if (value) return value;
    } catch (e) {}

    // Layer 3: SessionStorage
    try {
      const value = sessionStorage.getItem(key);
      if (value) return value;
    } catch (e) {}

    // Layer 4: IndexedDB
    try {
      const value = await indexedDB.get(key);
      if (value) return value;
    } catch (e) {}

    return null;
  }

  /**
   * Remove from all layers
   */
  async remove(key: string): Promise<void> {
    // Cookie
    try {
      document.cookie = `${key}=; path=/; max-age=0`;
    } catch (e) {}

    // LocalStorage
    try {
      localStorage.removeItem(key);
    } catch (e) {}

    // SessionStorage
    try {
      sessionStorage.removeItem(key);
    } catch (e) {}

    // IndexedDB
    try {
      await indexedDB.delete(key);
    } catch (e) {}
  }

  /**
   * Clear all auth data
   */
  async clear(): Promise<void> {
    const authKeys = ['eagle_token', 'eagle_userId', 'eagle_companyId', 'eagle_userEmail'];
    
    for (const key of authKeys) {
      await this.remove(key);
    }

    try {
      await indexedDB.clear();
    } catch (e) {}
  }
}

export const storageService = new StorageService();

