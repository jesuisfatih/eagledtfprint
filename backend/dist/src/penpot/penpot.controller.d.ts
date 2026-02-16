import { PenpotService } from './penpot.service';
export declare class PenpotController {
    private readonly penpotService;
    constructor(penpotService: PenpotService);
    getPublicProject(id: string): Promise<{
        id: any;
        title: any;
        status: any;
        merchantName: any;
        viewUrl: string | null;
        fileCount: any;
    }>;
    approvePublicProject(id: string): Promise<any>;
    rejectPublicProject(id: string, notes: string): Promise<any>;
    createFromOrder(orderId: string, merchantId: string): Promise<{
        success: boolean;
        designProject: {
            id: any;
            penpotProjectId: string;
            penpotFileId: string;
            viewUrl: string;
            pages: {
                pageId: any;
                pageName: any;
                dimensions: any;
            }[];
        };
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        designProject?: undefined;
    }>;
    getForOrder(orderId: string, merchantId: string): Promise<any>;
    getAllProjects(merchantId: string, status?: string, companyId?: string): Promise<any>;
    updateStatus(id: string, merchantId: string, status: string): Promise<any>;
    syncReady(merchantId: string, fileId: string): Promise<any>;
    exportDesign(id: string, merchantId: string, format: 'svg' | 'pdf' | 'png'): Promise<{
        success: boolean;
        data: any;
        contentType: string;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
        contentType?: undefined;
    }>;
    getDashboardUrl(): {
        url: string;
    };
}
