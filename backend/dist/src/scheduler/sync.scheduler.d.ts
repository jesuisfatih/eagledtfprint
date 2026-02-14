import { PrismaService } from '../prisma/prisma.service';
import { SyncStateService } from '../sync/sync-state.service';
import { SyncService } from '../sync/sync.service';
export declare class SyncScheduler {
    private prisma;
    private syncService;
    private syncState;
    private readonly logger;
    constructor(prisma: PrismaService, syncService: SyncService, syncState: SyncStateService);
    handleCustomersSync(): Promise<void>;
    handleProductsSync(): Promise<void>;
    handleOrdersSync(): Promise<void>;
    private runSyncForAllMerchants;
}
