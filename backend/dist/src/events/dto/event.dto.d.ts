export declare const EVENT_TYPES: readonly ["page_view", "product_view", "add_to_cart", "remove_from_cart", "cart_update", "checkout_start", "checkout_complete", "login", "logout", "search", "wishlist_add", "wishlist_remove", "quote_request", "custom"];
export type EventType = typeof EVENT_TYPES[number];
export declare class CollectEventDto {
    eventType: EventType;
    shopDomain?: string;
    sessionId?: string;
    userId?: string;
    companyId?: string;
    pageUrl?: string;
    referrer?: string;
    userAgent?: string;
    payload?: Record<string, unknown>;
    timestamp?: string;
}
export declare class GetEventsQueryDto {
    eventType?: string;
    limit?: string;
}
export declare class AnalyticsQueryDto {
    from?: string;
    to?: string;
}
