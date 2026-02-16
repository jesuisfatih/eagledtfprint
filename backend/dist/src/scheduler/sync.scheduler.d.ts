import { CustomerIntelligenceService } from '../customers/customer-intelligence.service';
import { ProactiveOfferService } from '../customers/proactive-offer.service';
import { PrismaService } from '../prisma/prisma.service';
import { SyncStateService } from '../sync/sync-state.service';
import { SyncService } from '../sync/sync.service';
export declare class SyncScheduler {
    private prisma;
    private syncService;
    private syncState;
    private customerIntelligence;
    private proactiveOffers;
    private readonly logger;
    constructor(prisma: PrismaService, syncService: SyncService, syncState: SyncStateService, customerIntelligence: CustomerIntelligenceService, proactiveOffers: ProactiveOfferService);
    handleCustomersSync(): Promise<void>;
    handleProductsSync(): Promise<void>;
    handleOrdersSync(): Promise<void>;
    handleCustomerIntelligence(): Promise<void>;
    handleOfferGeneration(): Promise<void>;
    private runSyncForAllMerchants;
}
