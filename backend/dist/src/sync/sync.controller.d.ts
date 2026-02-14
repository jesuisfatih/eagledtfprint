import { SyncService } from './sync.service';
export declare class SyncController {
    private syncService;
    constructor(syncService: SyncService);
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
    resetEntitySync(merchantId: string, entityType: string): Promise<{
        message: string;
    }>;
    resetAllSync(merchantId: string): Promise<{
        message: string;
    }>;
}
