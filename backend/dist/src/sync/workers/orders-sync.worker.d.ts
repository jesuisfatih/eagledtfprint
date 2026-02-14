import type { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { ShopifyRestService } from '../../shopify/shopify-rest.service';
import { ShopifyService } from '../../shopify/shopify.service';
import { SyncStateService } from '../sync-state.service';
interface SyncJobData {
    merchantId: string;
    syncLogId?: string;
    isInitial?: boolean;
}
export declare class OrdersSyncWorker {
    private prisma;
    private shopifyService;
    private shopifyRest;
    private syncState;
    private readonly logger;
    constructor(prisma: PrismaService, shopifyService: ShopifyService, shopifyRest: ShopifyRestService, syncState: SyncStateService);
    handleSync(job: Job<SyncJobData>): Promise<{
        skipped: boolean;
        reason: string;
        processed?: undefined;
    } | {
        processed: number;
        skipped?: undefined;
        reason?: undefined;
    }>;
}
export {};
