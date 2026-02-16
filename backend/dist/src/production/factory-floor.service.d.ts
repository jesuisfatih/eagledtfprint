import { DittofeedService } from '../dittofeed/dittofeed.service';
import { PenpotService } from '../penpot/penpot.service';
import { PickupService } from '../pickup/pickup.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProductionGateway } from './production.gateway';
import { ProductionService } from './production.service';
export interface FactoryFloorOrder {
    orderId: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    companyName: string;
    qrCode: string;
    currentPhase: 'INTAKE' | 'DESIGN' | 'PRODUCTION' | 'READY' | 'COMPLETED';
    intake: {
        pickupOrderId: string | null;
        status: string;
        assignedShelf: string | null;
        createdAt: Date | null;
    };
    design: {
        projectId: string | null;
        penpotFileId: string | null;
        penpotUrl: string | null;
        status: string;
        pageCount: number;
    };
    production: {
        jobs: Array<{
            jobId: string;
            status: string;
            productType: string;
            dimensions: string;
            printer: string | null;
            operator: string | null;
            progress: number;
        }>;
        overallProgress: number;
    };
    timeline: Array<{
        event: string;
        timestamp: Date;
        details?: string;
    }>;
}
export declare class FactoryFloorService {
    private readonly prisma;
    private readonly penpotService;
    private readonly pickupService;
    private readonly productionService;
    private readonly productionGateway;
    private readonly dittofeed;
    private readonly logger;
    constructor(prisma: PrismaService, penpotService: PenpotService, pickupService: PickupService, productionService: ProductionService, productionGateway: ProductionGateway, dittofeed: DittofeedService);
    initiateFullPipeline(merchantId: string, orderId: string): Promise<{
        orderId: string;
        orderNumber: string | null;
        intake: any;
        design: any;
        production: any;
    }>;
    scanAndProcess(qrCode: string): Promise<{
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
    approveDesignAndQueue(designProjectId: string, merchantId: string): Promise<{
        designProject: {
            id: string;
            status: string;
        };
        productionJobs: number;
        movedToPrepress: number;
    }>;
    markOrderReady(orderId: string, merchantId: string): Promise<{
        success: boolean;
        message: string;
        pendingJobs: {
            id: string;
            status: import("@prisma/client/client").$Enums.ProductionStatus;
        }[];
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
    getOrderPipelineStatus(orderId: string, merchantId: string): Promise<FactoryFloorOrder>;
    getFactoryFloorDashboard(merchantId: string): Promise<{
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
        jobsCompleted: number;
        designsCreated: any;
        pickupsCompleted: any;
        sqftPrinted: number;
        activeInPipeline: number;
        readyForPickup: any;
    }>;
}
