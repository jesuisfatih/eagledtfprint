import { DittofeedService } from '../dittofeed/dittofeed.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class CrossSellService {
    private readonly prisma;
    private readonly dittofeedService;
    private readonly logger;
    constructor(prisma: PrismaService, dittofeedService: DittofeedService);
    checkSupplyReorders(): Promise<void>;
    checkMerchantSupplyReorders(merchantId: string): Promise<{
        alertsSent: number;
    }>;
    runCrossSellAnalysis(): Promise<void>;
    analyzeMerchantCrossSell(merchantId: string): Promise<{
        eventsSent: number;
    }>;
    getRecommendationsForUser(userId: string): Promise<{
        type: string;
        title: string;
        reason: string;
        discount?: string;
    }[]>;
    private detectSupplyCategory;
    private getConsumptionRate;
}
