export interface RequestContext {
    merchantId: string;
    shopDomain: string;
    userId?: string;
    companyId?: string;
    ip?: string;
    userAgent?: string;
}
export interface PaginationParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    errors?: Record<string, string[]>;
    meta?: Record<string, unknown>;
}
export interface ApiError {
    statusCode: number;
    message: string;
    error: string;
    details?: Record<string, unknown>;
    timestamp: string;
    path: string;
}
export interface SyncResult {
    success: boolean;
    synced: number;
    failed: number;
    errors?: string[];
    duration?: number;
    details?: SyncItemResult[];
}
export interface SyncItemResult {
    id: string;
    externalId?: string;
    action: 'created' | 'updated' | 'skipped' | 'failed';
    message?: string;
}
export interface SyncProgress {
    status: 'pending' | 'running' | 'completed' | 'failed';
    current: number;
    total: number;
    percentage: number;
    startedAt?: Date;
    completedAt?: Date;
    error?: string;
}
export interface UploadedFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
    destination?: string;
    filename?: string;
    path?: string;
}
export interface FileUploadResult {
    url: string;
    filename: string;
    size: number;
    mimetype: string;
}
export interface ActivityEvent {
    shop: string;
    sessionId: string;
    shopifyCustomerId?: string;
    eagleToken?: string;
    eventType: string;
    payload: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
    timestamp?: Date;
}
export type EventType = 'page_view' | 'product_view' | 'collection_view' | 'add_to_cart' | 'remove_from_cart' | 'update_cart' | 'checkout_start' | 'checkout_complete' | 'order_created' | 'order_paid' | 'order_cancelled' | 'quote_requested' | 'quote_approved' | 'quote_rejected' | 'user_login' | 'user_logout' | 'user_register';
export interface DateRangeFilter {
    from?: Date;
    to?: Date;
}
export interface StatusFilter {
    status?: string | string[];
}
export interface SearchFilter {
    query?: string;
    fields?: string[];
}
export type FilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'startsWith' | 'endsWith';
export interface GenericFilter {
    field: string;
    operator: FilterOperator;
    value: unknown;
}
export interface BatchResult<T = unknown> {
    total: number;
    successful: number;
    failed: number;
    results: BatchItemResult<T>[];
}
export interface BatchItemResult<T = unknown> {
    id: string;
    success: boolean;
    data?: T;
    error?: string;
}
export interface CacheOptions {
    ttl?: number;
    key?: string;
    tags?: string[];
}
export interface RateLimitInfo {
    limit: number;
    remaining: number;
    reset: number;
}
export interface WebhookLogEntry {
    id: string;
    type: string;
    topic: string;
    shopDomain: string;
    payload: Record<string, unknown>;
    status: 'success' | 'failed';
    error?: string;
    processedAt: Date;
    duration?: number;
}
export interface AppSettings {
    maintenance: boolean;
    debugMode: boolean;
    features: Record<string, boolean>;
    limits: {
        maxUploadSize: number;
        maxBatchSize: number;
        rateLimitPerMinute: number;
    };
}
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export type Nullable<T> = T | null;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
