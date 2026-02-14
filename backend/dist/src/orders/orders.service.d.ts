import { PrismaService } from '../prisma/prisma.service';
export declare class OrdersService {
    private prisma;
    constructor(prisma: PrismaService);
    private mapOrder;
    private mapFinancialToStatus;
    private mapPaymentStatus;
    findAll(merchantId: string, filters?: {
        companyId?: string;
        status?: string;
    }): Promise<{
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
    findOne(id: string, merchantId: string, companyId?: string): Promise<{
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
    getStats(merchantId: string, companyId?: string): Promise<{
        total: number;
        totalRevenue: number | import("@prisma/client-runtime-utils").Decimal;
    }>;
}
