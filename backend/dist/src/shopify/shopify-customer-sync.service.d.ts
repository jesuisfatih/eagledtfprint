import { HttpService } from '@nestjs/axios';
import { ShopifyService } from './shopify.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class ShopifyCustomerSyncService {
    private httpService;
    private shopifyService;
    private prisma;
    private readonly logger;
    constructor(httpService: HttpService, shopifyService: ShopifyService, prisma: PrismaService);
    syncUserToShopify(userId: string): Promise<any>;
    updateShopifyCustomer(userId: string): Promise<void>;
}
