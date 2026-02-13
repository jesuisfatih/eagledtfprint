import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ShopifyCustomerSyncService } from '../shopify/shopify-customer-sync.service';
import { ShopifyService } from '../shopify/shopify.service';

@Injectable()
export class ShopifyWebhookSyncService {
  private readonly logger = new Logger(ShopifyWebhookSyncService.name);

  constructor(
    private prisma: PrismaService,
    private shopifyCustomerSync: ShopifyCustomerSyncService,
    private shopifyService: ShopifyService,
  ) {}

  async handleOrderCreate(orderData: any, shop: string) {
    // When order created in Shopify, link to Eagle company if exists
    const merchant = await this.shopifyService.getMerchantByShopDomain(shop);

    if (!merchant || !orderData.customer) return;

    const shopifyCustomerId = BigInt(orderData.customer.id);
    
    // Find Eagle company user by Shopify customer ID
    const companyUser = await this.prisma.companyUser.findFirst({
      where: { shopifyCustomerId },
    });

    if (companyUser) {
      // Update cart status if exists
      const cart = await this.prisma.cart.findFirst({
        where: {
          companyId: companyUser.companyId,
          createdByUserId: companyUser.id,
          status: 'draft',
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (cart) {
        await this.prisma.cart.update({
          where: { id: cart.id },
          data: {
            status: 'converted',
            convertedAt: new Date(),
          },
        });

        this.logger.log(`Cart ${cart.id} marked as converted to order`);
      }
    }
  }
}

