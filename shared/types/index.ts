/**
 * @eagle/types - Eagle B2B Platform Shared Types
 * 
 * Bu dosya tüm ekosistem için tek kaynak (single source of truth).
 * Backend, Admin Panel ve Accounts Portal aynı tipleri kullanır.
 * 
 * Prisma schema ile senkronize tutulmalıdır.
 */

// ============================================
// COMMON TYPES
// ============================================

export type Status = 'active' | 'inactive' | 'pending' | 'suspended';
export type UserRole = 'admin' | 'buyer' | 'approver' | 'viewer';
export type CartStatus = 'draft' | 'pending_approval' | 'approved' | 'converted' | 'abandoned';
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';
export type FulfillmentStatus = 'unfulfilled' | 'partial' | 'fulfilled';
export type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

// ============================================
// ADDRESS
// ============================================

export interface Address {
  id?: string;
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state?: string;
  zip: string;
  country: string;
  phone?: string;
  isDefault?: boolean;
}

// ============================================
// USER & AUTH
// ============================================

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  permissions: Record<string, boolean>;
  isActive: boolean;
  lastLoginAt?: string;
  companyId: string;
  shopifyCustomerId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthPayload {
  sub: string;
  email: string;
  type: 'merchant' | 'company_user';
  merchantId?: string;
  companyId?: string;
  shopDomain?: string;
  role?: UserRole;
}

export interface LoginResponse {
  token: string;
  refreshToken?: string;
  user: User;
  expiresIn: number;
}

export interface TokenInfo {
  token: string;
  expiresAt: number;
  isExpired: boolean;
}

// ============================================
// MERCHANT
// ============================================

export interface Merchant {
  id: string;
  shopDomain: string;
  shopifyShopId?: number;
  planName: string;
  status: Status;
  settings: MerchantSettings;
  snippetEnabled: boolean;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MerchantSettings {
  shopDomain?: string;
  apiKey?: string;
  ssoMode?: 'multipass' | 'alternative';
  multipassSecret?: string;
  storefrontToken?: string;
  snippetEnabled?: boolean;
  autoSync?: boolean;
  syncInterval?: number;
}

export interface MerchantStats {
  totalCustomers: number;
  syncedCustomers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue?: number;
  activeCompanies?: number;
}

// ============================================
// COMPANY
// ============================================

export interface Company {
  id: string;
  merchantId: string;
  name: string;
  legalName?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  website?: string;
  billingAddress?: Address;
  shippingAddress?: Address;
  companyGroup?: string;
  status: Status;
  settings: CompanySettings;
  createdAt: string;
  updatedAt: string;
  // Relations
  users?: User[];
  merchant?: Merchant;
}

export interface CompanySettings {
  requireApproval?: boolean;
  approvalThreshold?: number;
  paymentTerms?: string;
  creditLimit?: number;
}

// ============================================
// PRODUCT & VARIANT
// ============================================

export interface Product {
  id: string;
  merchantId: string;
  shopifyProductId: number;
  title: string;
  handle?: string;
  description?: string;
  vendor?: string;
  productType?: string;
  tags?: string;
  status?: string;
  images?: ProductImage[];
  collections?: string[];
  variants?: Variant[];
  // Computed
  b2bPrice?: number;
  originalPrice?: number;
  discount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductImage {
  id?: string;
  src: string;
  alt?: string;
  position?: number;
}

export interface Variant {
  id: string;
  productId: string;
  shopifyVariantId: number;
  sku?: string;
  title?: string;
  price: number;
  compareAtPrice?: number;
  inventoryQuantity?: number;
  weight?: number;
  weightUnit?: string;
  option1?: string;
  option2?: string;
  option3?: string;
  // Computed
  b2bPrice?: number;
  discount?: number;
}

// ============================================
// CART
// ============================================

export interface Cart {
  id: string;
  merchantId: string;
  companyId: string;
  createdByUserId: string;
  status: CartStatus;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  currency: string;
  items: CartItem[];
  note?: string;
  shopifyCartId?: string;
  checkoutUrl?: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  createdBy?: User;
  company?: Company;
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  variantId: string;
  shopifyVariantId: number;
  quantity: number;
  unitPrice: number;
  originalPrice: number;
  discountAmount: number;
  total: number;
  pricingRuleId?: string;
  // Relations
  product?: Product;
  variant?: Variant;
}

export interface AddToCartRequest {
  variantId: string;
  shopifyVariantId: number;
  quantity: number;
  productId?: string;
}

export interface UpdateCartItemRequest {
  itemId: string;
  quantity: number;
}

// ============================================
// CHECKOUT
// ============================================

export interface CheckoutResponse {
  success: boolean;
  checkoutUrl: string;
  shopifyCartId?: string;
  discountCode?: string;
  subtotal: number;
  discount: number;
  total: number;
  savings: number;
}

export interface CheckoutRequest {
  cartId: string;
  shippingAddressId?: string;
  billingAddressId?: string;
  note?: string;
}

// ============================================
// ORDER
// ============================================

export interface Order {
  id: string;
  merchantId: string;
  companyId: string;
  userId: string;
  shopifyOrderId?: number;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  total: number;
  currency: string;
  items: OrderItem[];
  shippingAddress?: Address;
  billingAddress?: Address;
  note?: string;
  discountCode?: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  user?: User;
  company?: Company;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId?: string;
  variantId?: string;
  shopifyVariantId?: number;
  title: string;
  variantTitle?: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  total: number;
  imageUrl?: string;
}

// ============================================
// PRICING RULES
// ============================================

export type TargetType = 'all' | 'company' | 'company_group';
export type ScopeType = 'all' | 'product' | 'collection' | 'tag' | 'variant';
export type DiscountType = 'percentage' | 'fixed_amount' | 'fixed_price' | 'qty_breaks';

export interface PricingRule {
  id: string;
  merchantId: string;
  name: string;
  description?: string;
  // Target
  targetType: TargetType;
  targetCompanyId?: string;
  targetCompanyGroup?: string;
  // Scope
  scopeType: ScopeType;
  scopeProductIds?: number[];
  scopeCollectionIds?: number[];
  scopeTags?: string;
  scopeVariantIds?: number[];
  // Discount
  discountType: DiscountType;
  discountValue?: number;
  discountPercentage?: number;
  qtyBreaks?: QuantityBreak[];
  minCartAmount?: number;
  // Priority & Status
  priority: number;
  isActive: boolean;
  validFrom?: string;
  validUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuantityBreak {
  minQty: number;
  maxQty?: number;
  discountPercentage?: number;
  fixedPrice?: number;
}

// ============================================
// QUOTES
// ============================================

export type QuoteStatus = 'draft' | 'submitted' | 'reviewing' | 'approved' | 'rejected' | 'expired';

export interface Quote {
  id: string;
  merchantId: string;
  companyId: string;
  userId: string;
  quoteNumber: string;
  status: QuoteStatus;
  items: QuoteItem[];
  subtotal: number;
  discount: number;
  total: number;
  note?: string;
  adminNote?: string;
  validUntil?: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  user?: User;
  company?: Company;
}

export interface QuoteItem {
  id: string;
  quoteId: string;
  productId: string;
  variantId: string;
  title: string;
  variantTitle?: string;
  quantity: number;
  requestedPrice?: number;
  offeredPrice?: number;
  note?: string;
}

// ============================================
// WISHLIST
// ============================================

export interface Wishlist {
  id: string;
  userId: string;
  companyId: string;
  merchantId: string;
  name: string;
  isDefault: boolean;
  items: WishlistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface WishlistItem {
  id: string;
  wishlistId: string;
  productId: string;
  variantId?: string;
  addedAt: string;
  // Relations
  product?: Product;
  variant?: Variant;
}

// ============================================
// NOTIFICATIONS
// ============================================

export type NotificationType = 'order' | 'quote' | 'cart' | 'system' | 'promo';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

// ============================================
// SUPPORT TICKETS
// ============================================

export interface SupportTicket {
  id: string;
  merchantId: string;
  companyId: string;
  userId: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: string;
  status: TicketStatus;
  priority: TicketPriority;
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  // Relations
  user?: User;
  company?: Company;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderType: 'user' | 'staff';
  message: string;
  attachments?: string[];
  createdAt: string;
}

// ============================================
// ACTIVITY & ANALYTICS
// ============================================

export type ActivityType = 'order' | 'quote' | 'cart' | 'login' | 'pricing' | 'sync' | 'company' | 'user';

export interface ActivityLog {
  id: string;
  merchantId: string;
  type: ActivityType;
  action: string;
  description: string;
  metadata?: Record<string, unknown>;
  userId?: string;
  companyId?: string;
  createdAt: string;
}

export interface SyncLog {
  id: string;
  merchantId: string;
  syncType: 'customers' | 'products' | 'orders' | 'initial' | 'full';
  status: 'pending' | 'running' | 'completed' | 'failed';
  itemsProcessed: number;
  itemsFailed: number;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}

// ============================================
// API RESPONSE WRAPPERS
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
  details?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============================================
// FORM & INPUT TYPES
// ============================================

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
}

export interface FilterState {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ============================================
// ABANDONED CARTS
// ============================================

export interface AbandonedCart {
  id: string;
  merchantId: string;
  cartToken?: string;
  email?: string;
  phone?: string;
  items: AbandonedCartItem[];
  subtotal: number;
  total: number;
  currency: string;
  checkoutUrl?: string;
  recoveryEmailSent: boolean;
  recoveredAt?: string;
  abandonedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AbandonedCartItem {
  id: string;
  abandonedCartId: string;
  shopifyVariantId: number;
  title: string;
  variantTitle?: string;
  quantity: number;
  price: number;
  imageUrl?: string;
}

// ============================================
// SHOPIFY TYPES
// ============================================

export interface ShopifyCustomer {
  id: string;
  merchantId: string;
  shopifyCustomerId: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  addresses?: Address[];
  tags?: string;
  note?: string;
  totalSpent?: number;
  ordersCount: number;
  syncedAt: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// DISCOUNT CODES
// ============================================

export interface DiscountCode {
  id: string;
  merchantId: string;
  companyId?: string;
  code: string;
  shopifyPriceRuleId?: number;
  shopifyDiscountId?: number;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  usageLimit?: number;
  usageCount: number;
  validFrom?: string;
  validUntil?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
