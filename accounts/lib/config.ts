/**
 * Central configuration — ALL environment-dependent values read from here.
 * No hardcoded URLs anywhere else in the accounts app.
 */

export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || '',
  adminUrl: process.env.NEXT_PUBLIC_ADMIN_URL || '',
  accountsUrl: process.env.NEXT_PUBLIC_ACCOUNTS_URL || '',
  cookieDomain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || '',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || '',
  brandName: process.env.NEXT_PUBLIC_BRAND_NAME || 'EAGLE SYSTEM',
};
