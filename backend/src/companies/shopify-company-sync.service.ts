import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ShopifyCustomerSyncService } from '../shopify/shopify-customer-sync.service';

@Injectable()
export class ShopifyCompanySyncService {
  private readonly logger = new Logger(ShopifyCompanySyncService.name);

  constructor(
    private prisma: PrismaService,
    private shopifyCustomerSync: ShopifyCustomerSyncService,
  ) {}

  async syncCompanyToShopify(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        users: { where: { role: 'admin' }, take: 1 },
      },
    });

    if (!company || company.users.length === 0) return;

    const adminUser = company.users[0];

    // Sync admin user to Shopify (which represents the company)
    try {
      await this.shopifyCustomerSync.syncUserToShopify(adminUser.id);
      this.logger.log(`Company ${company.name} synced to Shopify via user ${adminUser.email}`);
    } catch (error) {
      this.logger.error('Company sync to Shopify failed', error);
    }
  }

  async updateCompanyInShopify(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        users: true,
      },
    });

    if (!company) return;

    // Update all company users in Shopify
    for (const user of company.users) {
      if (user.shopifyCustomerId) {
        try {
          await this.shopifyCustomerSync.updateShopifyCustomer(user.id);
        } catch (error) {
          this.logger.error(`Failed to update user ${user.email} in Shopify`, error);
        }
      }
    }
  }
}

