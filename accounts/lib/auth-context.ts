/**
 * Auth Context - Get user/company IDs from storage
 */

export async function getUserId(): Promise<string> {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('eagle_userId') || '';
}

export async function getCompanyId(): Promise<string> {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('eagle_companyId') || '';
}

export async function getMerchantId(): Promise<string> {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('eagle_merchantId') || '';
}

export function getUserIdSync(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('eagle_userId') || '';
}

export function getCompanyIdSync(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('eagle_companyId') || '';
}

export function getMerchantIdSync(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('eagle_merchantId') || '';
}

