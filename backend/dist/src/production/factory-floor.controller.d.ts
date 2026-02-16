import { FactoryFloorService } from './factory-floor.service';
export declare class FactoryFloorController {
    private readonly factoryFloor;
    constructor(factoryFloor: FactoryFloorService);
    initiatePipeline(merchantId: string, orderId: string): Promise<{
        orderId: string;
        orderNumber: string | null;
        intake: any;
        design: any;
        production: any;
    }>;
    scanQrCode(qrCode: string): Promise<{
        pickup: {
            id: any;
            qrCode: any;
            orderNumber: any;
            customerName: any;
            status: any;
            shelf: any;
        };
        design: any;
        production: any;
        order: {
            id: any;
            companyName: any;
        };
    }>;
    approveDesign(merchantId: string, designProjectId: string): Promise<{
        designProject: {
            id: string;
            status: string;
        };
        productionJobs: any;
        movedToPrepress: any;
    }>;
    markReady(merchantId: string, orderId: string): Promise<{
        success: boolean;
        message: string;
        pendingJobs: any;
        pickupOrderId?: undefined;
        qrCode?: undefined;
        shelf?: undefined;
        status?: undefined;
    } | {
        success: boolean;
        message: string;
        pendingJobs?: undefined;
        pickupOrderId?: undefined;
        qrCode?: undefined;
        shelf?: undefined;
        status?: undefined;
    } | {
        success: boolean;
        pickupOrderId: any;
        qrCode: any;
        shelf: any;
        status: string;
        message?: undefined;
        pendingJobs?: undefined;
    }>;
    getOrderStatus(merchantId: string, orderId: string): Promise<import("./factory-floor.service").FactoryFloorOrder>;
    getDashboard(merchantId: string): Promise<{
        totals: {
            intake: number;
            design: number;
            production: number;
            ready: number;
        };
        orders: {
            orderId: string;
            orderNumber: string;
            company: any;
            email: string;
            phase: string;
            qrCode: string;
            designStatus: string;
            jobCount: number;
            rushPriority: boolean;
            progress: number;
            isOverdue: boolean;
            oldestJobAge: number;
        }[];
    }>;
    getDailySummary(merchantId: string): Promise<{
        date: string;
        ordersCreated: number;
        jobsCompleted: any;
        designsCreated: any;
        pickupsCompleted: any;
        sqftPrinted: number;
        activeInPipeline: any;
        readyForPickup: any;
    }>;
}
