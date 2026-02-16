import { DittofeedService } from '../dittofeed/dittofeed.service';
import { PrismaService } from '../prisma/prisma.service';
interface ShipmentRequest {
    orderId: string;
    merchantId: string;
    toAddress: {
        name: string;
        company?: string;
        street1: string;
        street2?: string;
        city: string;
        state: string;
        zip: string;
        country?: string;
        phone?: string;
        email?: string;
    };
    fromAddress?: {
        name: string;
        company?: string;
        street1: string;
        city: string;
        state: string;
        zip: string;
        country?: string;
    };
    parcel: {
        weightOz: number;
        lengthIn?: number;
        widthIn?: number;
        heightIn?: number;
    };
    serviceLevel?: string;
}
export interface ShipmentResult {
    id: string;
    trackingNumber: string;
    trackingUrl: string;
    labelUrl: string;
    carrier: string;
    service: string;
    rate: number;
    estimatedDelivery?: string;
}
export interface ShippingRate {
    carrier: string;
    service: string;
    rate: number;
    estimatedDays: number;
    deliveryDate?: string;
}
export interface BatchShipmentResult {
    totalOrders: number;
    grouped: number;
    shipments: ShipmentResult[];
    errors: string[];
}
export interface ShelfCapacity {
    totalSlots: number;
    occupied: number;
    available: number;
    utilizationPercent: number;
    shelves: Array<{
        id: string;
        code: string;
        name: string;
        ordersCount: number;
        oldest?: string;
    }>;
}
export declare class ShippingService {
    private readonly prisma;
    private readonly dittofeed;
    private readonly logger;
    private easypostApiKey;
    private easypostBaseUrl;
    private readonly DEFAULT_FROM_ADDRESS;
    constructor(prisma: PrismaService, dittofeed: DittofeedService);
    private getEasypostClient;
    getRates(request: ShipmentRequest): Promise<ShippingRate[]>;
    createShipment(request: ShipmentRequest): Promise<ShipmentResult>;
    createBatchShipments(merchantId: string, orderIds: string[]): Promise<BatchShipmentResult>;
    getIntelligentRouting(orderId: string, merchantId: string): Promise<{
        recommendation: 'pickup' | 'ship';
        reason: string;
        shippingCost?: number;
        pickupSavings?: number;
        factors: Record<string, any>;
    }>;
    handleTrackingWebhook(payload: any): Promise<{
        processed: boolean;
        status: any;
    } | undefined>;
    getShelfCapacity(merchantId: string): Promise<ShelfCapacity>;
    getStalePickupOrders(merchantId: string, staleDays?: number): Promise<any>;
    getShippingStats(merchantId: string): Promise<{
        totalOrders: number;
        shippedOrders: number;
        pickupOrders: any;
        pickupRate: number;
        shipRate: number;
        otherRate: number;
    }>;
    checkStalePickups(): Promise<void>;
    getPendingOrders(merchantId: string): Promise<{
        id: string;
        shopifyOrderNumber: string | null;
        customerName: string | null;
        address: any;
        city: any;
        state: any;
        zip: any;
        totalItems: number;
        status: string | null;
        trackingNumber: any;
        labelUrl: any;
        carrier: any;
    }[]>;
}
export {};
