import { ProductionService } from './production.service';
export declare class ProductionController {
    private readonly productionService;
    constructor(productionService: ProductionService);
    getBoard(merchantId: string): Promise<import("./production.service").KanbanBoard>;
    getStats(merchantId: string): Promise<import("./production.service").ProductionStats>;
    createFromOrder(merchantId: string, orderId: string): Promise<{
        created: number;
        jobs: any[];
    }>;
    createJob(merchantId: string, body: {
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
    }): Promise<any>;
    moveStatus(jobId: string, body: {
        status: string;
        operatorName?: string;
    }): Promise<any>;
    batchMoveStatus(body: {
        jobIds: string[];
        status: string;
        operatorName?: string;
    }): Promise<{
        succeeded: number;
        failed: number;
        results: {
            id: string;
            success: boolean;
            error?: string;
        }[];
    }>;
    assignPrinter(jobId: string, body: {
        printerId: string;
    }): Promise<any>;
    recordQc(jobId: string, body: {
        result: 'pass' | 'fail' | 'conditional';
        notes?: string;
    }): Promise<any>;
    getPrinters(merchantId: string): Promise<any>;
    createPrinter(merchantId: string, body: {
        name: string;
        model: string;
        maxWidthInch: number;
        supportedTypes?: string[];
        location?: string;
    }): Promise<any>;
    updateInk(printerId: string, body: {
        cyan?: number;
        magenta?: number;
        yellow?: number;
        black?: number;
        white?: number;
    }): Promise<any>;
    updatePrinterStatus(printerId: string, body: {
        status: 'IDLE' | 'PRINTING' | 'MAINTENANCE' | 'OFFLINE';
        notes?: string;
    }): Promise<any>;
    getPrinterStats(merchantId: string): Promise<any>;
    createGangBatch(merchantId: string, body: {
        sheetWidth: number;
        sheetHeight: number;
        jobIds: string[];
    }): Promise<any>;
    getGangBatches(merchantId: string, status?: string): Promise<any>;
}
