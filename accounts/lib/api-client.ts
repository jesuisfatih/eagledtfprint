const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.eagledtfsupply.com';

class AccountsApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('eagle_token');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('eagle_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('eagle_token');
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
      throw new Error('Request failed');
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    return this.request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async acceptInvitation(token: string, password: string) {
    return this.request('/api/v1/auth/accept-invitation', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  // Products
  async getProducts(params?: { search?: string; limit?: number }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/api/v1/catalog/products${query ? `?${query}` : ''}`);
  }

  async getProduct(id: string) {
    return this.request(`/api/v1/catalog/products/${id}`);
  }

  // Pricing
  async calculatePrices(variantIds: string[], quantities?: any) {
    return this.request('/api/v1/pricing/calculate', {
      method: 'POST',
      body: JSON.stringify({ variantIds, quantities }),
    });
  }

  // Cart
  async getActiveCart() {
    return this.request('/api/v1/carts/active');
  }

  async addToCart(variantId: string, shopifyVariantId: string, quantity: number) {
    const cart = await this.getActiveCart();
    if (!cart || !cart.id) {
      throw new Error('No active cart found');
    }
    return this.request(`/api/v1/carts/${cart.id}/items`, {
      method: 'POST',
      body: JSON.stringify({ variantId, shopifyVariantId: shopifyVariantId || variantId, quantity }),
    });
  }

  async updateCartItem(cartId: string, itemId: string, quantity: number) {
    return this.request(`/api/v1/carts/${cartId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });
  }

  async removeCartItem(cartId: string, itemId: string) {
    return this.request(`/api/v1/carts/${cartId}/items/${itemId}`, {
      method: 'DELETE',
    });
  }

  // Checkout
  async createCheckout(cartId: string) {
    return this.request('/api/v1/checkout/create', {
      method: 'POST',
      body: JSON.stringify({ cartId }),
    });
  }

  // Orders
  async getOrders() {
    return this.request('/api/v1/orders');
  }

  async getOrder(id: string) {
    return this.request(`/api/v1/orders/${id}`);
  }
}

export const accountsApi = new AccountsApiClient(API_URL);

// Helper function for authenticated fetch - similar to adminFetch
export async function accountsFetch(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' 
    ? localStorage.getItem('eagle_token') 
    : null;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(`${API_URL}${endpoint}`, { ...options, headers });
}

// Helper function for public endpoints (no auth required)
export async function publicFetch(endpoint: string, options: RequestInit = {}) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  return fetch(`${API_URL}${endpoint}`, { ...options, headers });
}

// Get API URL for external use
export function getApiUrl() {
  return API_URL;
}




