/**
 * Central configuration — ALL environment-dependent values read from here.
 * No hardcoded URLs anywhere else in the admin app.
 *
 * Required env vars (set in .env.local or Docker):
 *   NEXT_PUBLIC_API_URL           — Backend API base URL
 *   NEXT_PUBLIC_ADMIN_URL         — Admin panel base URL
 *   NEXT_PUBLIC_ACCOUNTS_URL      — Accounts (customer-facing) base URL
 *   NEXT_PUBLIC_COOKIE_DOMAIN     — Cross-subdomain cookie domain (e.g. ".eagledtfsupply.com")
 *   NEXT_PUBLIC_SHOPIFY_STORE_HANDLE — Shopify store handle for admin links (e.g. "eagledtfsupply")
 *   NEXT_PUBLIC_SUPPORT_EMAIL     — Support email address
 *   NEXT_PUBLIC_BRAND_NAME        — Brand name shown in sidebar and titles
 *   NEXT_PUBLIC_SHOPIFY_INSTALL_URL — Shopify app install URL
 */

export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || '',
  adminUrl: process.env.NEXT_PUBLIC_ADMIN_URL || '',
  accountsUrl: process.env.NEXT_PUBLIC_ACCOUNTS_URL || '',
  cookieDomain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || '',
  shopifyStoreHandle: process.env.NEXT_PUBLIC_SHOPIFY_STORE_HANDLE || '',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || '',
  brandName: process.env.NEXT_PUBLIC_BRAND_NAME || 'EAGLE SYSTEM',
  shopifyInstallUrl: process.env.NEXT_PUBLIC_SHOPIFY_INSTALL_URL || '',
  cdnUrl: (process.env.NEXT_PUBLIC_API_URL || '').replace('api.', 'cdn.'),
  shopifyAdminBaseUrl: `https://admin.shopify.com/store/${process.env.NEXT_PUBLIC_SHOPIFY_STORE_HANDLE || ''}`,
};
