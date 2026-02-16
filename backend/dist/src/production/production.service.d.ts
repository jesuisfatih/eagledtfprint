import { DittofeedService } from '../dittofeed/dittofeed.service';
import { PrismaService } from '../prisma/prisma.service';
type ProductionStatusType = 'QUEUED' | 'PREPRESS' | 'PRINTING' | 'CURING' | 'CUTTING' | 'QC_CHECK' | 'PACKAGING' | 'READY' | 'PICKED_UP' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
interface CreateJobInput {
    merchantId: string;
    orderId: string;
    designProjectId?: string;
    widthInch: number;
    heightInch: number;
    productType: string;
    quantity?: number;
    designFileUrl?: string;
    dpi?: number;
    priority?: 'STANDARD' | 'RUSH' | 'SAME_DAY' | 'NEXT_DAY';
    notes?: string;
}
export interface KanbanBoard {
    QUEUED: any[];
    PREPRESS: any[];
    PRINTING: any[];
    CURING: any[];
    CUTTING: any[];
    QC_CHECK: any[];
    PACKAGING: any[];
    READY: any[];
    PICKED_UP: any[];
    SHIPPED: any[];
    COMPLETED: any[];
    CANCELLED: any[];
}
export interface ProductionStats {
    totalJobs: number;
    byStatus: Record<string, number>;
    todayCompleted: number;
    todaySqft: number;
    avgTurnaroundHours: number;
    rushJobs: number;
    delayedJobs: number;
}
export declare class ProductionService {
    private readonly prisma;
    private readonly dittofeedService;
    private readonly logger;
    constructor(prisma: PrismaService, dittofeedService: DittofeedService);
    createJob(input: CreateJobInput): Promise<any>;
    createJobsFromOrder(merchantId: string, orderId: string): Promise<{
        created: number;
        jobs: any[];
    }>;
    moveToStatus(jobId: string, newStatus: ProductionStatusType, operatorName?: string): Promise<any>;
    batchMoveToStatus(jobIds: string[], newStatus: ProductionStatusType, operatorName?: string): Promise<{
        succeeded: number;
        failed: number;
        results: {
            id: string;
            success: boolean;
            error?: string;
        }[];
    }>;
    getKanbanBoard(merchantId: string): Promise<KanbanBoard>;
    getPrinters(merchantId: string): Promise<any>;
    createPrinter(merchantId: string, data: {
        name: string;
        model: string;
        maxWidthInch: number;
        supportedTypes?: string[];
        location?: string;
    }): Promise<any>;
    updateInkLevels(printerId: string, levels: {
        cyan?: number;
        magenta?: number;
        yellow?: number;
        black?: number;
        white?: number;
    }): Promise<any>;
    updatePrinterStatus(printerId: string, status: 'IDLE' | 'PRINTING' | 'MAINTENANCE' | 'OFFLINE', notes?: string): Promise<any>;
    assignToPrinter(jobId: string, printerId: string): Promise<any>;
    createGangSheetBatch(merchantId: string, data: {
        sheetWidth: number;
        sheetHeight: number;
        jobIds: string[];
    }): Promise<any>;
    getGangSheetBatches(merchantId: string, status?: string): Promise<any>;
    getStats(merchantId: string): Promise<ProductionStats>;
    getPrinterStats(merchantId: string): Promise<any>;
    recordQcResult(jobId: string, result: 'pass' | 'fail' | 'conditional', notes?: string): Promise<any>;
    resetDailyPrinterStats(): Promise<void>;
    private parseDimensions;
    private detectProductType;
    private sendProductionEvent;
    private mapStatusToEventName;
}
export {};
