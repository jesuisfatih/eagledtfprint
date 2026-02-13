/**
 * Credential Management API
 * Browser auto-fill support
 */

export class CredentialManager {
  /**
   * Store credentials for auto-fill
   */
  async store(email: string, token: string): Promise<boolean> {
    try {
      if (!('credentials' in navigator)) {
        return false;
      }

      const credential = new (window as any).PasswordCredential({
        id: email,
        password: token,
        name: email,
      });

      await navigator.credentials.store(credential);
      return true;
    } catch (error) {
      console.warn('Credential store failed:', error);
      return false;
    }
  }

  /**
   * Get stored credentials for auto-login
   */
  async get(): Promise<{ email: string; token: string } | null> {
    try {
      if (!('credentials' in navigator)) {
        return null;
      }

      const credential = await navigator.credentials.get({
        password: true,
        mediation: 'optional',
      }) as any;

      if (credential && credential.id && credential.password) {
        return {
          email: credential.id,
          token: credential.password,
        };
      }

      return null;
    } catch (error) {
      console.warn('Credential get failed:', error);
      return null;
    }
  }

  /**
   * Clear stored credentials
   */
  async clear(): Promise<void> {
    try {
      if ('credentials' in navigator) {
        await navigator.credentials.preventSilentAccess();
      }
    } catch (error) {
      console.warn('Credential clear failed:', error);
    }
  }
}

export const credentialManager = new CredentialManager();

