import { PrismaService } from '../prisma/prisma.service';
import { ShopifyCustomerSyncService } from '../shopify/shopify-customer-sync.service';
export declare class ShopifyCompanySyncService {
    private prisma;
    private shopifyCustomerSync;
    private readonly logger;
    constructor(prisma: PrismaService, shopifyCustomerSync: ShopifyCustomerSyncService);
    syncCompanyToShopify(companyId: string): Promise<void>;
    updateCompanyInShopify(companyId: string): Promise<void>;
}
