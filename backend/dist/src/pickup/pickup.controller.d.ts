import { PickupService } from './pickup.service';
export declare class PickupController {
    private readonly pickupService;
    constructor(pickupService: PickupService);
    createShelf(req: any, body: {
        code: string;
        name?: string;
        description?: string;
    }): Promise<any>;
    getShelves(req: any): Promise<any>;
    updateShelf(req: any, id: string, body: any): Promise<any>;
    deleteShelf(req: any, id: string): Promise<any>;
    getOrders(req: any, query: any): Promise<any>;
    getStats(req: any): Promise<{
        pending: any;
        processing: any;
        ready: any;
        pickedUp: any;
        totalShelves: any;
    }>;
    getOrder(req: any, id: string): Promise<any>;
    createOrder(req: any, body: any): Promise<any>;
    assignShelf(req: any, id: string, shelfId: string): Promise<any>;
    updateStatus(req: any, id: string, status: string): Promise<any>;
    scanQr(qrCode: string): Promise<{
        orderNumber: any;
        shelf: {
            code: any;
            name: any;
            description: any;
        } | null;
        status: any;
        customerName: any;
    }>;
    verifyEmail(email: string): Promise<any>;
}
