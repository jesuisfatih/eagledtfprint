import { OnModuleInit } from '@nestjs/common';
import { DittofeedService } from '../dittofeed/dittofeed.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class PenpotService implements OnModuleInit {
    private prisma;
    private dittofeed;
    private readonly logger;
    private client;
    private initialized;
    constructor(prisma: PrismaService, dittofeed: DittofeedService);
    onModuleInit(): Promise<void>;
    private isReady;
    getPublicUrl(): string;
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
}
