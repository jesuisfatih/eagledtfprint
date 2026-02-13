import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ShopifyService } from '../../shopify/shopify.service';

@Injectable()
export class CustomersHandler {
  private readonly logger = new Logger(CustomersHandler.name);

  constructor(
    private prisma: PrismaService,
    private shopifyService: ShopifyService,
  ) {}

  async handleCustomerCreate(customerData: any, headers: any) {
    try {
      const shop = headers['x-shopify-shop-domain'];
      
      const merchant = await this.shopifyService.getMerchantByShopDomain(shop);

      if (!merchant) {
        this.logger.warn(`Merchant not found for shop: ${shop}`);
        return { success: false };
      }

      // Create or update Shopify customer
      await this.prisma.shopifyCustomer.upsert({
        where: {
          merchantId_shopifyCustomerId: {
            merchantId: merchant.id,
            shopifyCustomerId: BigInt(customerData.id),
          },
        },
        create: {
          merchantId: merchant.id,
          shopifyCustomerId: BigInt(customerData.id),
          email: customerData.email,
          firstName: customerData.first_name,
          lastName: customerData.last_name,
          phone: customerData.phone,
          tags: customerData.tags,
          note: customerData.note,
          totalSpent: parseFloat(customerData.total_spent || '0'),
          ordersCount: customerData.orders_count || 0,
          addresses: customerData.addresses || [],
          rawData: customerData,
        },
        update: {
          email: customerData.email,
          firstName: customerData.first_name,
          lastName: customerData.last_name,
          phone: customerData.phone,
          tags: customerData.tags,
          note: customerData.note,
          totalSpent: parseFloat(customerData.total_spent || '0'),
          ordersCount: customerData.orders_count || 0,
          addresses: customerData.addresses || [],
          rawData: customerData,
          syncedAt: new Date(),
        },
      });

      this.logger.log(`Customer synced: ${customerData.email}`);
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to handle customer create', error);
      return { success: false };
    }
  }
}




