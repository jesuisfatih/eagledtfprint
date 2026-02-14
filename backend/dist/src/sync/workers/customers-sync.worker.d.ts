import type { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { ShopifyGraphqlService } from '../../shopify/shopify-graphql.service';
import { ShopifyService } from '../../shopify/shopify.service';
import { SyncStateService } from '../sync-state.service';
interface SyncJobData {
    merchantId: string;
    syncLogId?: string;
    isInitial?: boolean;
}
export declare class CustomersSyncWorker {
    private prisma;
    private shopifyService;
    private shopifyGraphql;
    private syncState;
    private readonly logger;
    constructor(prisma: PrismaService, shopifyService: ShopifyService, shopifyGraphql: ShopifyGraphqlService, syncState: SyncStateService);
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
