/**
 * Shopify Types for Eagle B2B Platform
 * 
 * These types represent Shopify API response structures
 * used throughout the backend for type safety.
 */

// ============================================
// SHOPIFY COMMON
// ============================================

export interface ShopifyMoney {
  amount: string;
  currencyCode: string;
}

export interface ShopifyImage {
  id?: string;
  src: string;
  altText?: string;
  width?: number;
  height?: number;
}

export interface ShopifyAddress {
  id?: number;
  customerId?: number;
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  province?: string;
  provinceCode?: string;
  country: string;
  countryCode?: string;
  zip: string;
  phone?: string;
  default?: boolean;
}

// ============================================
// SHOPIFY CUSTOMER
// ============================================

export interface ShopifyCustomer {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  acceptsMarketing: boolean;
  verifiedEmail: boolean;
  taxExempt: boolean;
  currency?: string;
  state: 'disabled' | 'invited' | 'enabled' | 'declined';
  tags?: string;
  note?: string;
  defaultAddress?: ShopifyAddress;
  addresses?: ShopifyAddress[];
  ordersCount?: number;
  totalSpent?: string;
  createdAt: string;
  updatedAt: string;
  metafields?: ShopifyMetafield[];
}

export interface ShopifyCustomerCreateInput {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  addresses?: ShopifyAddress[];
  note?: string;
  tags?: string;
  sendEmailInvite?: boolean;
  sendEmailWelcome?: boolean;
  metafields?: ShopifyMetafieldInput[];
}

// ============================================
// SHOPIFY PRODUCT
// ============================================

export interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  bodyHtml?: string;
  vendor?: string;
  productType?: string;
  tags?: string;
  status: 'active' | 'draft' | 'archived';
  publishedAt?: string;
  templateSuffix?: string;
  publishedScope?: 'web' | 'global';
  variants: ShopifyVariant[];
  options: ShopifyProductOption[];
  images: ShopifyImage[];
  image?: ShopifyImage;
  createdAt: string;
  updatedAt: string;
}

export interface ShopifyProductOption {
  id: number;
  productId: number;
  name: string;
  position: number;
  values: string[];
}

export interface ShopifyVariant {
  id: number;
  productId: number;
  title: string;
  sku?: string;
  price: string;
  compareAtPrice?: string;
  position: number;
  inventoryPolicy: 'deny' | 'continue';
  inventoryQuantity?: number;
  inventoryItemId?: number;
  fulfillmentService: string;
  inventoryManagement?: string;
  option1?: string;
  option2?: string;
  option3?: string;
  weight?: number;
  weightUnit?: 'g' | 'kg' | 'oz' | 'lb';
  barcode?: string;
  grams?: number;
  requiresShipping: boolean;
  taxable: boolean;
  imageId?: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// SHOPIFY ORDER
// ============================================

export interface ShopifyOrder {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  orderNumber: number;
  financialStatus: 'pending' | 'authorized' | 'partially_paid' | 'paid' | 'partially_refunded' | 'refunded' | 'voided';
  fulfillmentStatus: 'fulfilled' | 'partial' | 'unfulfilled' | 'restocked' | null;
  currency: string;
  currentTotalPrice: string;
  subtotalPrice: string;
  totalPrice: string;
  totalTax: string;
  totalDiscounts: string;
  totalShippingPriceSet?: {
    shopMoney: ShopifyMoney;
    presentmentMoney: ShopifyMoney;
  };
  taxesIncluded: boolean;
  taxExempt: boolean;
  customer?: ShopifyCustomer;
  billingAddress?: ShopifyAddress;
  shippingAddress?: ShopifyAddress;
  lineItems: ShopifyLineItem[];
  shippingLines?: ShopifyShippingLine[];
  discountCodes?: ShopifyDiscountCode[];
  note?: string;
  noteAttributes?: { name: string; value: string }[];
  tags?: string;
  cancelReason?: string;
  cancelledAt?: string;
  closedAt?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShopifyLineItem {
  id: number;
  variantId?: number;
  productId?: number;
  title: string;
  variantTitle?: string;
  sku?: string;
  vendor?: string;
  quantity: number;
  price: string;
  totalDiscount: string;
  discountAllocations?: {
    amount: string;
    discountApplicationIndex: number;
  }[];
  grams?: number;
  fulfillableQuantity: number;
  fulfillmentService: string;
  fulfillmentStatus?: string;
  taxLines?: {
    title: string;
    price: string;
    rate: number;
  }[];
  properties?: { name: string; value: string }[];
  giftCard: boolean;
  requiresShipping: boolean;
  taxable: boolean;
}

export interface ShopifyShippingLine {
  id: number;
  title: string;
  price: string;
  code?: string;
  source?: string;
  discountedPrice?: string;
  taxLines?: {
    title: string;
    price: string;
    rate: number;
  }[];
}

export interface ShopifyDiscountCode {
  code: string;
  amount: string;
  type: 'fixed_amount' | 'percentage' | 'shipping';
}

// ============================================
// SHOPIFY METAFIELD
// ============================================

export interface ShopifyMetafield {
  id?: number;
  namespace: string;
  key: string;
  value: string;
  type: 'single_line_text_field' | 'multi_line_text_field' | 'number_integer' | 'number_decimal' | 'boolean' | 'json';
  ownerId?: number;
  ownerResource?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShopifyMetafieldInput {
  namespace: string;
  key: string;
  value: string;
  type: ShopifyMetafield['type'];
}

// ============================================
// SHOPIFY WEBHOOK
// ============================================

export interface ShopifyWebhookHeaders {
  'x-shopify-shop-domain': string;
  'x-shopify-topic': string;
  'x-shopify-hmac-sha256': string;
  'x-shopify-webhook-id': string;
  'x-shopify-api-version': string;
}

export interface ShopifyWebhookPayload {
  id: number;
  [key: string]: unknown;
}

// ============================================
// SHOPIFY CART (for abandoned carts)
// ============================================

export interface ShopifyCartItem {
  id: number;
  variantId: number;
  quantity: number;
  title: string;
  price: string;
  linePrice: string;
  image?: string;
  sku?: string;
  handle?: string;
  vendor?: string;
  properties?: { name: string; value: string }[];
}

export interface ShopifyCart {
  token: string;
  note?: string;
  attributes?: Record<string, string>;
  itemCount: number;
  items: ShopifyCartItem[];
  requiresShipping: boolean;
  currency: string;
  totalPrice: string;
  totalWeight: number;
}

// ============================================
// GRAPHQL RESPONSES
// ============================================

export interface ShopifyGraphQLResponse<T> {
  data: T;
  extensions?: {
    cost: {
      requestedQueryCost: number;
      actualQueryCost: number;
      throttleStatus: {
        maximumAvailable: number;
        currentlyAvailable: number;
        restoreRate: number;
      };
    };
  };
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
    extensions?: Record<string, unknown>;
  }>;
}

export interface ShopifyPageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

export interface ShopifyEdge<T> {
  node: T;
  cursor: string;
}

export interface ShopifyConnection<T> {
  edges: ShopifyEdge<T>[];
  pageInfo: ShopifyPageInfo;
}

// ============================================
// API RESPONSES
// ============================================

export interface ShopifyCustomersResponse {
  customers: ShopifyCustomer[];
}

export interface ShopifyCustomerResponse {
  customer: ShopifyCustomer;
}

export interface ShopifyProductsResponse {
  products: ShopifyProduct[];
}

export interface ShopifyProductResponse {
  product: ShopifyProduct;
}

export interface ShopifyOrdersResponse {
  orders: ShopifyOrder[];
}

export interface ShopifyOrderResponse {
  order: ShopifyOrder;
}

export interface ShopifyCustomerInviteResponse {
  customer_invite: {
    customer: ShopifyCustomer;
    invite_url: string;
  };
}
