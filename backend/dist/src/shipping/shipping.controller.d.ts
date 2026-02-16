import { ShippingService } from './shipping.service';
export declare class ShippingController {
    private readonly shippingService;
    constructor(shippingService: ShippingService);
    getPending(merchantId: string): Promise<{
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
    getRates(merchantId: string, body: any): Promise<import("./shipping.service").ShippingRate[]>;
    createShipment(merchantId: string, body: any): Promise<import("./shipping.service").ShipmentResult>;
    batchShip(merchantId: string, body: {
        orderIds: string[];
    }): Promise<import("./shipping.service").BatchShipmentResult>;
    getRouting(merchantId: string, orderId: string): Promise<{
        recommendation: "pickup" | "ship";
        reason: string;
        shippingCost?: number;
        pickupSavings?: number;
        factors: Record<string, any>;
    }>;
    trackingWebhook(body: any): Promise<{
        processed: boolean;
        status: any;
    } | undefined>;
    getShelfCapacity(merchantId: string): Promise<import("./shipping.service").ShelfCapacity>;
    getStalePickups(merchantId: string, days?: string): Promise<any>;
    getStats(merchantId: string): Promise<{
        totalOrders: number;
        shippedOrders: number;
        pickupOrders: any;
        pickupRate: number;
        shipRate: number;
        otherRate: number;
    }>;
}
