import { OnModuleInit } from '@nestjs/common';
import { DittofeedService } from '../dittofeed/dittofeed.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProductionService } from '../production/production.service';
export declare class PenpotService implements OnModuleInit {
    private prisma;
    private dittofeed;
    private production;
    private readonly logger;
    private client;
    private initialized;
    constructor(prisma: PrismaService, dittofeed: DittofeedService, production: ProductionService);
    onModuleInit(): Promise<void>;
    private isReady;
    getPublicUrl(): string;
    getPublicDesignProject(id: string): Promise<{
        id: any;
        title: any;
        status: any;
        merchantName: any;
        viewUrl: string | null;
        fileCount: any;
    }>;
    createDesignProjectFromOrder(orderId: string, merchantId: string): Promise<{
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
    private extractDesignFilesWithDimensions;
    private parseDimensions;
    private isUrl;
    private getOrCreateTeam;
    private createProject;
    private createFile;
    private createPage;
    getDesignProjectsForOrder(orderId: string, merchantId: string): Promise<any>;
    getAllDesignProjects(merchantId: string, filters?: {
        status?: string;
        companyId?: string;
    }): Promise<any>;
    updateDesignProjectStatus(id: string, merchantId: string, status: string): Promise<any>;
    syncDesignReady(merchantId: string, penpotFileId: string): Promise<any>;
    exportDesign(designProjectId: string, merchantId: string, format?: 'svg' | 'pdf' | 'png'): Promise<{
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
    requestRevision(id: string, merchantId: string, notes: string): Promise<any>;
}
