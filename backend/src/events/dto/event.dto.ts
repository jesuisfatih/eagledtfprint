import { IsString, IsOptional, IsObject, IsIn, MaxLength } from 'class-validator';

/**
 * Valid event types for tracking
 */
export const EVENT_TYPES = [
  'page_view',
  'product_view',
  'add_to_cart',
  'remove_from_cart',
  'cart_update',
  'checkout_start',
  'checkout_complete',
  'login',
  'logout',
  'search',
  'wishlist_add',
  'wishlist_remove',
  'quote_request',
  'custom',
] as const;

export type EventType = typeof EVENT_TYPES[number];

/**
 * DTO for collecting events from snippet/frontend
 */
export class CollectEventDto {
  @IsString()
  @IsIn(EVENT_TYPES)
  eventType: EventType;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  shopDomain?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  sessionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  userId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  pageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  referrer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  userAgent?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  timestamp?: string;
}

/**
 * DTO for query parameters when fetching events
 */
export class GetEventsQueryDto {
  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}

/**
 * DTO for analytics date range query
 */
export class AnalyticsQueryDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}
