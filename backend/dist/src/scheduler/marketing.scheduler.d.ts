import { EventBusService } from '../event-bus/event-bus.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class MarketingScheduler {
    private prisma;
    private eventBus;
    private readonly logger;
    constructor(prisma: PrismaService, eventBus: EventBusService);
    checkAbandonedCarts(): Promise<void>;
    checkAbandonedDesigns(): Promise<void>;
    checkChurnRisks(): Promise<void>;
}
