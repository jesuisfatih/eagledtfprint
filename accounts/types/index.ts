/**
 * Accounts Portal Types
 * Re-exports from shared types with accounts-specific additions
 */

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterFormData {
  accountType: 'b2b' | 'normal';
  email: string;
  verificationCode: string;
  codeSent: boolean;
  emailVerified: boolean;
  skipEmailVerification: boolean;
  firstName: string;
  lastName: string;
  phone: string;
  companyName: string;
  taxId: string;
  billingAddress1: string;
  billingAddress2: string;
  billingCity: string;
  billingState: string;
  billingPostalCode: string;
  billingCountry: string;
  shippingSameAsBilling: boolean;
  shippingAddress1: string;
  shippingAddress2: string;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;
  password: string;
  confirmPassword: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId: string;
  merchantId?: string;
  isActive: boolean;
}

export interface AuthResponse {
  accessToken?: string;
  token?: string;
  refreshToken?: string;
  user: AuthUser;
}

// Product Types
export interface ProductVariant {
  id: string;
  shopifyVariantId?: string; // Optional - API may not include it
  title?: string;
  sku?: string;
  price: number | string;
  compareAtPrice?: number | string | null;
  inventoryQuantity?: number;
  option1?: string;
  option2?: string;
  option3?: string;
}

export interface Product {
  id: string;
  shopifyProductId: string;
  title: string;
  description?: string;
  vendor: string;
  productType?: string;
  handle: string;
  status: string;
  imageUrl?: string;
  images: { src: string; alt?: string; url?: string }[];
  variants: ProductVariant[];
  options?: { name: string; values: string[] }[];
  tags?: string[];
}

export interface B2BPricing {
  variantId: string;
  originalPrice: number;
  discountedPrice: number;
  discountPercentage: number;
  minQty?: number;
  qtyBreaks?: { qty: number; price: number }[];
}

// Order Types
export interface OrderLineItem {
  id: string;
  name: string; // Shopify: "Product Title - Variant Title"
  title: string; // Product title
  variantTitle?: string;
  variant_title?: string; // Shopify camelCase alternative
  sku?: string;
  quantity: number;
  price: number | string;
  totalPrice?: number;
  image?: string | { src: string }; // Shopify returns object with src
  imageUrl?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  shopifyOrderId?: string;
  financialStatus: string;
  fulfillmentStatus: string;
  totalPrice: number;
  subtotalPrice: number;
  totalTax: number;
  currency: string;
  lineItems: OrderLineItem[];
  shippingAddress?: Address;
  billingAddress?: Address;
  createdAt: string;
  updatedAt?: string;
}

export interface Address {
  id?: string;
  label?: string;
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  province?: string;
  provinceCode?: string;
  country: string;
  countryCode: string;
  zip: string;
  phone?: string;
  isDefault?: boolean;
  isBilling?: boolean;
  isShipping?: boolean;
}

// Cart Types
export interface CartItem {
  id: string;
  variantId: string;
  productId: string;
  title: string;
  variantTitle?: string;
  sku?: string;
  quantity: number;
  price: number;
  originalPrice?: number;
  imageUrl?: string;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  total: number;
  itemCount: number;
  currency: string;
}

// Dashboard Types
export interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalSpent: number;
}

// User Profile Types
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  isActive: boolean;
  company?: {
    id: string;
    name: string;
    status: string;
  };
  addresses?: Address[];
  lastLoginAt?: string;
  createdAt: string;
}

// Form validation helpers
export interface FormFieldError {
  field: string;
  message: string;
}

export interface FormState<T> {
  data: T;
  errors: FormFieldError[];
  loading: boolean;
  submitted: boolean;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================
// ENHANCED B2B TYPES
// ============================================

// Company Types
export interface Company {
  id: string;
  name: string;
  legalName?: string;
  email?: string;
  phone?: string;
  taxId?: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended' | 'active';
  companyGroup?: string;
  settings?: CompanySettings;
  creditLimit?: number;
  availableCredit?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CompanySettings {
  requireApproval: boolean;
  approvalLimit?: number;
  allowQuotes: boolean;
  paymentTerms?: string;
  defaultDiscountTier?: string;
}

// User Permissions
export interface UserPermissions {
  canOrder: boolean;
  canApprove: boolean;
  canManageUsers: boolean;
  canViewReports: boolean;
  orderLimit?: number;
}

// Enhanced Dashboard Stats
export interface EnhancedDashboardStats {
  orders: {
    total: number;
    pending: number;
    completed: number;
    thisMonth: number;
  };
  spending: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    savings: number;
  };
  cart: {
    itemCount: number;
    total: number;
  };
  credit: {
    limit: number;
    used: number;
    available: number;
  };
}

// Promotions
export interface Promotion {
  id: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValue?: number;
  minQuantity?: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  applicableProducts?: string[];
  applicableCategories?: string[];
}

// Enhanced Pricing
export interface EnhancedPricing {
  variantId: string;
  listPrice: number;
  companyPrice: number;
  finalPrice: number;
  discountPercentage: number;
  appliedRules: AppliedPricingRule[];
  quantityBreaks: QuantityBreak[];
}

export interface AppliedPricingRule {
  id: string;
  name: string;
  type: 'company' | 'volume' | 'promotion';
  discountPercentage?: number;
  discountValue?: number;
}

export interface QuantityBreak {
  qty: number;
  price: number;
  discountPercentage?: number;
}

// Cart with Pricing
export interface EnhancedCart {
  id: string;
  status: CartStatus;
  items: EnhancedCartItem[];
  subtotal: number;
  discount: number;
  total: number;
  itemCount: number;
  currency: string;
  savings: number;
  appliedPromotions: Promotion[];
  createdAt: string;
  updatedAt: string;
}

export type CartStatus = 
  | 'draft' 
  | 'pending_approval' 
  | 'approved' 
  | 'rejected' 
  | 'abandoned' 
  | 'converted';

export interface EnhancedCartItem {
  id: string;
  variantId: string;
  productId: string;
  shopifyVariantId: string;
  title: string;
  variantTitle?: string;
  sku?: string;
  quantity: number;
  listPrice: number;
  unitPrice: number;
  totalPrice: number;
  savings: number;
  imageUrl?: string;
  quantityBreaks?: QuantityBreak[];
  nextBreak?: {
    qty: number;
    price: number;
    additionalNeeded: number;
    potentialSavings: number;
  };
}

// Quote Types
export interface QuoteRequest {
  id: string;
  companyId: string;
  requestedByUserId: string;
  projectName?: string;
  deadline?: string;
  status: QuoteStatus;
  items: QuoteItem[];
  totalRequested: number;
  totalApproved?: number;
  note?: string;
  validUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export type QuoteStatus = 
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'counter_offered'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'converted';

export interface QuoteItem {
  id: string;
  productId: string;
  variantId: string;
  title: string;
  quantity: number;
  listPrice: number;
  requestedPrice: number;
  approvedPrice?: number;
}

// Approval Types
export interface ApprovalRequest {
  id: string;
  cartId: string;
  requestedByUserId: string;
  requestedByUser?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  approverId?: string;
  orderTotal: number;
  status: ApprovalStatus;
  note?: string;
  responseNote?: string;
  createdAt: string;
  respondedAt?: string;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

// Order Tracking
export interface OrderTracking {
  orderId: string;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  events: TrackingEvent[];
}

export interface TrackingEvent {
  status: string;
  description: string;
  location?: string;
  timestamp: string;
}

// Notification Types
export interface B2BNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  createdAt: string;
}

export type NotificationType = 
  | 'order_confirmed'
  | 'order_shipped'
  | 'order_delivered'
  | 'quote_response'
  | 'approval_needed'
  | 'approval_result'
  | 'price_drop'
  | 'stock_alert'
  | 'promo'
  | 'system';

// Reorder Types
export interface ReorderCheck {
  orderId: string;
  items: ReorderItem[];
  available: boolean;
  totalOriginal: number;
  totalCurrent: number;
}

export interface ReorderItem {
  productId: string;
  variantId: string;
  title: string;
  previousQty: number;
  currentQty: number;
  available: boolean;
  stockQty?: number;
  previousPrice: number;
  currentPrice: number;
  priceChange: number;
  alternatives?: Product[];
}

// Favorite/Saved Orders
export interface FavoriteOrder {
  id: string;
  name: string;
  orderId: string;
  itemCount: number;
  lastUsed: string;
  createdAt: string;
}

// Analytics Types
export interface SpendingAnalytics {
  totalSpent: number;
  totalSavings: number;
  orderCount: number;
  avgOrderValue: number;
  spendByCategory: CategorySpend[];
  spendByMonth: MonthlySpend[];
  topProducts: TopProduct[];
}

export interface CategorySpend {
  category: string;
  amount: number;
  percentage: number;
}

export interface MonthlySpend {
  month: string;
  amount: number;
  orderCount: number;
}

export interface TopProduct {
  productId: string;
  title: string;
  quantity: number;
  totalSpent: number;
}
