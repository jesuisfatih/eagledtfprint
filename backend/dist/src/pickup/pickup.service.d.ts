import { PrismaService } from '../prisma/prisma.service';
export declare class PickupService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    createShelf(merchantId: string, data: {
        code: string;
        name?: string;
        description?: string;
    }): Promise<any>;
    getShelves(merchantId: string): Promise<any>;
    updateShelf(id: string, merchantId: string, data: Partial<{
        code: string;
        name: string;
        description: string;
        isActive: boolean;
    }>): Promise<any>;
    deleteShelf(id: string, merchantId: string): Promise<any>;
    private generateQrCode;
    parseDesignFiles(orderData: any): any[];
    createPickupOrder(merchantId: string, data: {
        orderId: string;
        companyId?: string;
        companyUserId?: string;
        customerEmail?: string;
        customerName?: string;
        orderNumber?: string;
        designFiles?: any;
        notes?: string;
    }): Promise<any>;
    createFromWebhookOrder(merchantId: string, orderLocal: any, rawOrderData: any): Promise<any>;
    getPickupOrders(merchantId: string, filters?: {
        status?: string;
        companyId?: string;
        shelfId?: string;
        search?: string;
    }): Promise<any>;
    getPickupOrder(id: string, merchantId: string): Promise<any>;
    assignShelf(id: string, merchantId: string, shelfId: string): Promise<any>;
    updateStatus(id: string, merchantId: string, status: string): Promise<any>;
    scanQrCode(qrCode: string): Promise<{
        orderNumber: any;
        shelf: {
            code: any;
            name: any;
            description: any;
        } | null;
        status: any;
        customerName: any;
    }>;
    verifyCustomerEmail(email: string): Promise<any>;
    getStats(merchantId: string): Promise<{
        pending: any;
        processing: any;
        ready: any;
        pickedUp: any;
        totalShelves: any;
    }>;
}
