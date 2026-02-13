import type {
    Company,
    Merchant,
    MerchantSettings,
    MerchantStats,
    Order,
    PaginatedResponse,
    PricingRule,
    SyncLog,
} from '@eagle/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.eagledtfsupply.com';

// ============================================
// REQUEST/RESPONSE TYPES
// ============================================

export interface CreateCompanyRequest {
  name: string;
  legalName?: string;
  email?: string;
  phone?: string;
  taxId?: string;
  companyGroup?: string;
  status?: 'active' | 'inactive' | 'pending';
}

export interface UpdateCompanyRequest extends Partial<CreateCompanyRequest> {
  id: string;
}

export interface CreatePricingRuleRequest {
  name: string;
  description?: string;
  targetType: 'all' | 'company' | 'company_group';
  targetCompanyId?: string;
  targetCompanyGroup?: string;
  scopeType: 'all' | 'product' | 'collection' | 'tag' | 'variant';
  scopeProductIds?: number[];
  scopeCollectionIds?: number[];
  scopeTags?: string;
  discountType: 'percentage' | 'fixed_amount' | 'fixed_price';
  discountPercentage?: number;
  discountValue?: number;
  priority?: number;
  isActive?: boolean;
  validFrom?: string;
  validUntil?: string;
}

export interface UpdatePricingRuleRequest extends Partial<CreatePricingRuleRequest> {}

export interface CompanyListParams {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PricingRuleListParams {
  isActive?: boolean;
  companyId?: string;
}

export interface OrderListParams {
  companyId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface AnalyticsParams {
  from?: string;
  to?: string;
}

export interface CompanyStats {
  total: number;
  active: number;
  pending: number;
  inactive: number;
}

export interface OrderStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  totalRevenue: number;
}

export interface SyncStatus {
  lastSync?: string;
  isRunning: boolean;
  progress?: number;
  logs: SyncLog[];
}

// ============================================
// API CLIENT
// ============================================

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;

    // Load token from localStorage (client-side only)
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('eagle_admin_token');
    }
  }

  setToken(token: string): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('eagle_admin_token', token);
    }
  }

  clearToken(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('eagle_admin_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  private buildQueryString(params?: Record<string, unknown>): string {
    if (!params) return '';
    const filtered = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    );
    if (Object.keys(filtered).length === 0) return '';
    return '?' + new URLSearchParams(filtered as Record<string, string>).toString();
  }

  // Companies
  async getCompanies(params?: CompanyListParams): Promise<PaginatedResponse<Company> | Company[]> {
    const query = this.buildQueryString(params);
    return this.request(`/api/v1/companies${query}`);
  }

  async getCompany(id: string): Promise<Company> {
    return this.request(`/api/v1/companies/${id}`);
  }

  async createCompany(data: CreateCompanyRequest): Promise<Company> {
    return this.request('/api/v1/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCompany(id: string, data: Partial<CreateCompanyRequest>): Promise<Company> {
    return this.request(`/api/v1/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getCompanyStats(): Promise<CompanyStats> {
    return this.request('/api/v1/companies/stats');
  }

  // Pricing Rules
  async getPricingRules(params?: PricingRuleListParams): Promise<PricingRule[]> {
    const query = this.buildQueryString(params);
    return this.request(`/api/v1/pricing/rules${query}`);
  }

  async createPricingRule(data: CreatePricingRuleRequest): Promise<PricingRule> {
    return this.request('/api/v1/pricing/rules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePricingRule(id: string, data: UpdatePricingRuleRequest): Promise<PricingRule> {
    return this.request(`/api/v1/pricing/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePricingRule(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/v1/pricing/rules/${id}`, {
      method: 'DELETE',
    });
  }

  // Orders
  async getOrders(params?: OrderListParams): Promise<PaginatedResponse<Order> | Order[]> {
    const query = this.buildQueryString(params);
    return this.request(`/api/v1/orders${query}`);
  }

  async getOrder(id: string): Promise<Order> {
    return this.request(`/api/v1/orders/${id}`);
  }

  async getOrderStats(): Promise<OrderStats> {
    return this.request('/api/v1/orders/stats');
  }

  // Merchants
  async getMerchant(): Promise<Merchant> {
    return this.request('/api/v1/merchants/me');
  }

  async getMerchantStats(): Promise<MerchantStats> {
    return this.request('/api/v1/merchants/stats');
  }

  async updateSettings(settings: Partial<MerchantSettings>): Promise<Merchant> {
    return this.request('/api/v1/merchants/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // Sync
  async triggerInitialSync(): Promise<{ success: boolean; message: string }> {
    return this.request('/api/v1/sync/initial', {
      method: 'POST',
    });
  }

  async getSyncStatus(): Promise<SyncStatus> {
    return this.request('/api/v1/sync/status');
  }

  async resetEntitySync(entityType: 'customers' | 'products' | 'orders'): Promise<{ message: string }> {
    return this.request(`/api/v1/sync/reset/${entityType}`, {
      method: 'POST',
    });
  }

  async resetAllSync(): Promise<{ message: string }> {
    return this.request('/api/v1/sync/reset-all', {
      method: 'POST',
    });
  }

  // Analytics
  async getAnalytics(params?: AnalyticsParams): Promise<Record<string, unknown>> {
    const query = this.buildQueryString(params);
    return this.request(`/api/v1/events/analytics${query}`);
  }
}

export const apiClient = new ApiClient(API_URL);

/**
 * Authenticated fetch wrapper for admin pages
 * Use this instead of raw fetch() to automatically include Authorization header
 */
export async function adminFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('eagle_admin_token') : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
}

/**
 * Get current merchant ID from localStorage
 */
export function getMerchantId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('eagle_merchantId') || '';
}
