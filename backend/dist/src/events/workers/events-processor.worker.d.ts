import type { Job } from 'bull';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { ShopifyService } from '../../shopify/shopify.service';
export declare class EventsProcessorWorker {
    private prisma;
    private shopifyService;
    private jwtService;
    private readonly logger;
    constructor(prisma: PrismaService, shopifyService: ShopifyService, jwtService: JwtService);
    processEvent(job: Job): Promise<void>;
}
