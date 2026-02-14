import { OrdersService } from './orders.service';
export declare class OrdersController {
    private ordersService;
    constructor(ordersService: OrdersService);
    findAll(merchantId: string, userCompanyId: string, role: string, queryCompanyId?: string, status?: string): Promise<{
        id: any;
        orderNumber: any;
        shopifyOrderId: number | null;
        status: string;
        paymentStatus: string;
        fulfillmentStatus: any;
        totalPrice: any;
        subtotalPrice: any;
        taxTotal: any;
        discountTotal: any;
        currency: any;
        email: any;
        lineItems: any;
        shippingAddress: any;
        billingAddress: any;
        discountCodes: any;
        company: any;
        companyUser: any;
        createdAt: any;
        updatedAt: any;
    }[]>;
    getStats(merchantId: string, companyId: string): Promise<{
        total: number;
        totalRevenue: number | import("@prisma/client-runtime-utils").Decimal;
    }>;
    findOne(id: string, merchantId: string, companyId: string): Promise<{
        id: any;
        orderNumber: any;
        shopifyOrderId: number | null;
        status: string;
        paymentStatus: string;
        fulfillmentStatus: any;
        totalPrice: any;
        subtotalPrice: any;
        taxTotal: any;
        discountTotal: any;
        currency: any;
        email: any;
        lineItems: any;
        shippingAddress: any;
        billingAddress: any;
        discountCodes: any;
        company: any;
        companyUser: any;
        createdAt: any;
        updatedAt: any;
    } | null>;
}
