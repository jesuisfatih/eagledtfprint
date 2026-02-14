import type { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { SyncEntityType, SyncStateService } from './sync-state.service';
export declare class SyncService {
    private prisma;
    private syncState;
    private customersQueue;
    private productsQueue;
    private ordersQueue;
    private readonly logger;
    constructor(prisma: PrismaService, syncState: SyncStateService, customersQueue: Queue, productsQueue: Queue, ordersQueue: Queue);
    triggerInitialSync(merchantId: string): Promise<{
        message: string;
        syncLogId: string;
    }>;
    triggerCustomersSync(merchantId: string): Promise<{
        message: string;
        skipped: boolean;
    } | {
        message: string;
        skipped?: undefined;
    }>;
    triggerProductsSync(merchantId: string): Promise<{
        message: string;
        skipped: boolean;
    } | {
        message: string;
        skipped?: undefined;
    }>;
    triggerOrdersSync(merchantId: string): Promise<{
        message: string;
        skipped: boolean;
    } | {
        message: string;
        skipped?: undefined;
    }>;
    private triggerEntitySync;
    getSyncStatus(merchantId: string): Promise<{
        merchantLastSyncAt: Date | null | undefined;
        isAnySyncing: boolean;
        hasErrors: boolean;
        entities: Record<string, any>;
        recentLogs: {
            id: string;
            status: string;
            merchantId: string;
            metadata: import("@prisma/client/runtime/client").JsonValue | null;
            syncType: string;
            recordsProcessed: number;
            recordsFailed: number;
            startedAt: Date;
            completedAt: Date | null;
            errorMessage: string | null;
        }[];
    }>;
    resetEntitySync(merchantId: string, entityType: SyncEntityType): Promise<{
        message: string;
    }>;
    resetAllSync(merchantId: string): Promise<{
        message: string;
    }>;
}
