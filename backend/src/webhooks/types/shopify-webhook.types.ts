/**
 * Shopify Webhook Payloads
 * These are external payloads from Shopify - we define interfaces but don't strictly validate
 * as Shopify's payload structure can change
 */

/**
 * Shopify Order Webhook Payload
 */
export interface ShopifyOrderPayload {
  id: number;
  admin_graphql_api_id: string;
  order_number: number;
  name: string;
  email?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
  processed_at?: string;
  cancelled_at?: string;
  closed_at?: string;
  financial_status: string;
  fulfillment_status?: string;
  currency: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  total_discounts: string;
  total_shipping_price_set?: {
    shop_money: { amount: string; currency_code: string };
    presentment_money: { amount: string; currency_code: string };
  };
  customer?: ShopifyCustomerPayload;
  line_items: ShopifyLineItem[];
  shipping_address?: ShopifyAddress;
  billing_address?: ShopifyAddress;
  note?: string;
  tags?: string;
  discount_codes?: Array<{ code: string; amount: string; type: string }>;
}

/**
 * Shopify Customer Webhook Payload
 */
export interface ShopifyCustomerPayload {
  id: number;
  admin_graphql_api_id: string;
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
  updated_at: string;
  verified_email: boolean;
  state: string;
  note?: string;
  tags?: string;
  addresses?: ShopifyAddress[];
  default_address?: ShopifyAddress;
  tax_exempt: boolean;
  accepts_marketing: boolean;
  orders_count: number;
  total_spent: string;
}

/**
 * Shopify Line Item
 */
export interface ShopifyLineItem {
  id: number;
  admin_graphql_api_id: string;
  product_id: number;
  variant_id: number;
  title: string;
  variant_title?: string;
  sku?: string;
  quantity: number;
  price: string;
  total_discount: string;
  fulfillable_quantity: number;
  fulfillment_status?: string;
  grams: number;
  properties?: Array<{ name: string; value: string }>;
}

/**
 * Shopify Address
 */
export interface ShopifyAddress {
  id?: number;
  first_name?: string;
  last_name?: string;
  company?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  province_code?: string;
  country?: string;
  country_code?: string;
  zip?: string;
  phone?: string;
  name?: string;
  default?: boolean;
}

/**
 * Shopify Webhook Headers
 */
export interface ShopifyWebhookHeaders {
  'x-shopify-topic'?: string;
  'x-shopify-shop-domain'?: string;
  'x-shopify-hmac-sha256'?: string;
  'x-shopify-api-version'?: string;
  'x-shopify-webhook-id'?: string;
}
