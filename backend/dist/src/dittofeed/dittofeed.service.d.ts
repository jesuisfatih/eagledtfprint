import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
export type DittofeedEventName = 'order_placed' | 'order_fulfilled' | 'order_cancelled' | 'order_refunded' | 'order_paid' | 'gang_sheet_created' | 'gang_sheet_fill_rate_low' | 'design_uploaded' | 'design_approved' | 'design_rejected' | 'design_waiting_approval' | 'design_low_resolution' | 'production_started' | 'production_completed' | 'production_delayed' | 'internal_sla_exceeded' | 'pickup_ready' | 'pickup_completed' | 'pickup_reminder' | 'shipment_created' | 'shipment_delivered' | 'supply_purchased' | 'supply_running_low' | 'supply_back_in_stock' | 'price_tier_upgraded' | 'price_tier_downgraded' | 'volume_discount_unlocked' | 'cart_created' | 'cart_abandoned' | 'cart_recovered' | 'Product Viewed' | 'Added to Cart' | 'Page Viewed' | 'Collection Viewed' | 'Order Placed';
export interface DittofeedUserTraits {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    predicted_clv?: number;
    churn_risk_score?: number;
    churn_risk_level?: string;
    predicted_next_order_date?: string;
    purchase_probability_30d?: number;
    days_since_last_order?: number;
    avg_order_interval_days?: number;
    rfm_score?: string;
    rfm_segment?: string;
    rfm_recency?: number;
    rfm_frequency?: number;
    rfm_monetary?: number;
    clv_score?: number;
    clv_tier?: string;
    health_score?: number;
    purchase_frequency?: string;
    order_trend?: string;
    is_returning?: boolean;
    favorite_product_type?: string;
    preferred_transfer_type?: string;
    gang_sheet_fill_rate?: number;
    avg_gang_sheet_fill_rate?: number;
    typical_order_size_sqft?: number;
    last_gang_sheet_size?: string;
    design_uploads_count?: number;
    company_id?: string;
    company_name?: string;
    company_tier?: string;
    company_status?: string;
    is_wholesale?: boolean;
    pickup_preferred?: boolean;
    pickup_count?: number;
    ship_count?: number;
    is_supply_buyer?: boolean;
    supply_types?: string[];
    estimated_supply_reorder_date?: string;
    platform?: string;
    merchant_id?: string;
    merchant_domain?: string;
    first_order_at?: string;
    last_order_at?: string;
    total_orders?: number;
    total_spent?: number;
    [key: string]: any;
}
export declare class DittofeedService implements OnModuleInit {
    private prisma;
    private readonly logger;
    private client;
    private initialized;
    constructor(prisma: PrismaService);
    onModuleInit(): Promise<void>;
    private isReady;
    identifyUser(userId: string, traits: Partial<DittofeedUserTraits>): Promise<void>;
    trackEvent(userId: string, event: DittofeedEventName | string, properties?: Record<string, any>): Promise<void>;
    trackPage(userId: string, pageName: string, properties?: Record<string, any>): Promise<void>;
    batch(events: Array<{
        type: 'identify' | 'track' | 'page';
        userId: string;
        [key: string]: any;
    }>): Promise<void>;
    trackOrderPlaced(orderData: {
        userId: string;
        orderId: string;
        merchantId: string;
        orderNumber: string;
        totalPrice: number;
        financialStatus: string;
        fulfillmentStatus: string;
        companyId?: string;
        companyName?: string;
        lineItems: any[];
        currency?: string;
        email?: string;
    }): Promise<void>;
    trackOrderPaid(userId: string, orderId: string, orderNumber: string, totalPrice: number): Promise<void>;
    trackOrderFulfilled(userId: string, orderId: string, orderNumber: string, merchantId: string, trackingInfo?: {
        trackingNumber?: string;
        trackingUrl?: string;
        carrier?: string;
    }): Promise<void>;
    trackPickupReady(userId: string, data: {
        orderId: string;
        orderNumber: string;
        qrCode: string;
        shelfCode?: string;
    }): Promise<void>;
    trackPickupCompleted(userId: string, data: {
        orderId: string;
        orderNumber: string;
        waitDaysOnShelf: number;
    }): Promise<void>;
    trackGangSheetEvent(userId: string, data: {
        orderId: string;
        orderNumber: string;
        sheetSize: string;
        fillRate: number;
        itemCount: number;
    }): Promise<void>;
    trackDesignEvent(userId: string, event: DittofeedEventName | string, designData: {
        orderId?: string | null;
        orderNumber?: string | null;
        designProjectId?: string;
        fileName?: string;
        fileCount?: number;
        dimensions?: {
            width: number;
            height: number;
            unit: string;
        };
        variantTitle?: string;
        status?: string;
        format?: string;
        dpi?: number;
    }): Promise<void>;
    trackPriceTierChange(userId: string, data: {
        previousTier: string;
        newTier: string;
        reason: string;
    }): Promise<void>;
    identifyCompanyUser(user: {
        id: string;
        email: string;
        firstName?: string;
        lastName?: string;
        role?: string;
        companyId: string;
        companyName?: string;
        companyStatus?: string;
        merchantId?: string;
        merchantDomain?: string;
    }): Promise<void>;
    syncAllCompanies(merchantId: string): Promise<{
        synced: number;
    }>;
    syncCompanyIntelligence(merchantId: string): Promise<{
        synced: number;
    }>;
    syncOrders(merchantId: string, sinceHours?: number): Promise<{
        synced: number;
    }>;
    syncVisitorEvents(merchantId: string, sinceHours?: number): Promise<{
        synced: number;
    }>;
    syncCustomerInsights(merchantId: string): Promise<{
        synced: number;
    }>;
    syncDtfProductTraits(merchantId: string): Promise<{
        synced: number;
    }>;
    syncPickupTraits(merchantId: string): Promise<{
        synced: number;
    }>;
    handleWebhookCallback(payload: {
        type: string;
        userId: string;
        journeyName?: string;
        data?: Record<string, any>;
    }): Promise<{
        received: boolean;
    }>;
    autoSync(): Promise<void>;
    private analyzeOrderProducts;
    private analyzeCustomerOrderHistory;
    private predictNextOrderDate;
    private purchaseProbability30d;
    private churnRiskToScore;
    private churnRiskLevel;
    private segmentToTier;
    private tierRank;
    private logMarketingAction;
}
