/**
 * Admin Panel Types
 * Re-exports from @eagle/types with admin-specific additions
 */

// Re-export all shared types
export type {
  Status,
  UserRole,
  CartStatus,
  OrderStatus,
  PaymentStatus,
  FulfillmentStatus,
  TicketStatus,
  TicketPriority,
  User,
  AuthPayload,
  LoginResponse,
  TokenInfo,
  Merchant,
  MerchantSettings,
  MerchantStats,
  Company,
  CompanySettings,
  Product,
  ProductImage,
  Variant,
  Cart,
  CartItem,
  Order,
  OrderItem,
  PricingRule,
  QuantityBreak,
  TargetType,
  ScopeType,
  DiscountType,
  Quote,
  QuoteItem,
  QuoteStatus,
  Wishlist,
  WishlistItem,
  Notification,
  NotificationType,
  SupportTicket,
  TicketMessage,
  ActivityLog,
  ActivityType,
  SyncLog,
  ApiResponse,
  ApiError,
  PaginatedResponse,
  SelectOption,
  TableColumn,
  FilterState,
  AbandonedCart,
  AbandonedCartItem,
  ShopifyCustomer,
  DiscountCode,
} from '@eagle/types';

// ============================================
// ADMIN-SPECIFIC TYPES
// ============================================

/**
 * Extended Company with counts (from Prisma includes)
 */
export interface CompanyWithCounts {
  id: string;
  name: string;
  legalName?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  companyGroup?: string;
  createdByShopifyCustomerId?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users: number;
    orders: number;
    pricingRules: number;
  };
}

/**
 * Extended Order with line items
 */
export interface OrderWithItems {
  id: string;
  orderNumber: string;
  shopifyOrderId?: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  fulfillmentStatus: 'unfulfilled' | 'partial' | 'fulfilled';
  totalPrice: string | number;
  subtotalPrice?: string | number;
  taxTotal?: string | number;
  currency?: string;
  lineItems?: OrderLineItem[];
  shippingAddress?: Address;
  billingAddress?: Address;
  company?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface OrderLineItem {
  id: string;
  title: string;
  variantTitle?: string;
  quantity: number;
  price: string | number;
  sku?: string;
  imageUrl?: string;
}

export interface Address {
  firstName?: string;
  lastName?: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state?: string;
  zip: string;
  country: string;
  phone?: string;
}

/**
 * Shopify Customer (for conversion to Company)
 */
export interface ShopifyCustomerAdmin {
  id: string;
  shopifyCustomerId: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  ordersCount: number;
  totalSpent?: number;
  tags?: string;
  note?: string;
  addresses?: Address[];
  syncedAt: string;
  createdAt: string;
}

/**
 * User with company info
 */
export interface UserWithCompany {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'buyer' | 'approver' | 'viewer';
  isActive: boolean;
  lastLoginAt?: string;
  company?: {
    id: string;
    name: string;
    status: string;
  };
  createdAt: string;
}

/**
 * Pricing Rule with computed fields
 */
export interface PricingRuleWithCompany {
  id: string;
  name: string;
  description?: string;
  targetType: 'all' | 'company' | 'company_group';
  targetCompanyId?: string;
  targetCompanyGroup?: string;
  scopeType: 'all' | 'product' | 'collection' | 'tag' | 'variant';
  scopeProductIds?: number[];
  scopeCollectionIds?: number[];
  scopeTags?: string;
  discountType: 'percentage' | 'fixed_amount' | 'fixed_price' | 'qty_breaks';
  discountPercentage?: number;
  discountValue?: number;
  priority: number;
  isActive: boolean;
  validFrom?: string;
  validUntil?: string;
  createdAt: string;
  updatedAt: string;
  targetCompany?: {
    id: string;
    name: string;
  };
}

/**
 * Catalog Product for list view
 */
export interface CatalogProduct {
  id: string;
  shopifyProductId: number;
  title: string;
  handle?: string;
  vendor?: string;
  productType?: string;
  status?: string;
  images?: { src: string; alt?: string }[];
  variants?: {
    id: string;
    price: number;
    compareAtPrice?: number;
    inventoryQuantity?: number;
    sku?: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Dashboard Stats
 */
export interface DashboardStats {
  companies: {
    total: number;
    active: number;
    pending: number;
    inactive: number;
  };
  orders: {
    total: number;
    thisMonth: number;
    pending: number;
    revenue: number;
  };
  users: {
    total: number;
    active: number;
  };
  products: {
    total: number;
    synced: number;
  };
}

/**
 * Webhook Log Entry
 */
export interface WebhookLog {
  id: string;
  type: 'order' | 'customer' | 'product' | 'sync';
  action: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

/**
 * Activity Entry
 */
export interface ActivityEntry {
  id: string;
  type: 'order' | 'company' | 'user' | 'pricing' | 'sync' | 'quote';
  icon: string;
  iconColor: string;
  text: string;
  subtext?: string;
  link?: string;
  createdAt: string;
}

/**
 * Report Data
 */
export interface ReportData {
  id: string;
  type: string;
  label: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
}

/**
 * Email Template
 */
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Permission/Role
 */
export interface RolePermission {
  id: string;
  role: 'admin' | 'buyer' | 'approver' | 'viewer';
  name: string;
  description?: string;
  permissions: string[];
}

/**
 * Analytics Data
 */
export interface AnalyticsData {
  pageViews: number;
  uniqueVisitors: number;
  conversionRate: number;
  avgOrderValue: number;
  revenueByDay: { date: string; revenue: number }[];
  topProducts: { productId: string; title: string; views: number; orders: number }[];
  funnel?: {
    steps: { name: string; count: number; rate?: number }[];
  };
}

/**
 * Form Modal Props
 */
export interface ModalState<T = unknown> {
  show: boolean;
  data?: T;
  type?: 'create' | 'edit' | 'view' | 'delete';
}

/**
 * Result Modal Props
 */
export interface ResultModalState {
  show: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title?: string;
}

// ============================================
// FORM INPUT TYPES
// ============================================

export interface CompanyFormData {
  name: string;
  legalName?: string;
  email?: string;
  phone?: string;
  taxId?: string;
  companyGroup?: string;
  status?: 'active' | 'inactive' | 'pending';
}

export interface PricingRuleFormData {
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

export interface InviteUserFormData {
  email: string;
  role: 'admin' | 'buyer' | 'approver' | 'viewer';
  firstName?: string;
  lastName?: string;
}
