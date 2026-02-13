// Admin Settings Page local types (different from shared types)
export interface AdminMerchantSettings {
  shopDomain: string;
  snippetEnabled: boolean;
  ssoMode: string;
  storefrontToken: string;
  lastSyncAt: string | null;
  stats?: {
    totalCustomers: number;
    syncedCustomers: number;
    totalProducts: number;
    totalOrders: number;
  };
}
