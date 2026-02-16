import { Injectable, Logger } from '@nestjs/common';
import { DittofeedService } from '../../dittofeed/dittofeed.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ShopifyService } from '../../shopify/shopify.service';

@Injectable()
export class CustomersHandler {
  private readonly logger = new Logger(CustomersHandler.name);

  constructor(
    private prisma: PrismaService,
    private shopifyService: ShopifyService,
    private dittofeedService: DittofeedService,
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

      // ━━━ DITTOFEED: Identify new Shopify customer ━━━
      if (customerData.email) {
        try {
          await this.dittofeedService.identifyUser(`shopify_${customerData.id}`, {
            email: customerData.email,
            firstName: customerData.first_name || '',
            lastName: customerData.last_name || '',
            phone: customerData.phone || '',
            total_orders: customerData.orders_count || 0,
            total_spent: parseFloat(customerData.total_spent || '0'),
            merchant_id: merchant.id,
            merchant_domain: merchant.shopDomain,
            platform: 'eagle-engine',
          });
          this.logger.log(`Dittofeed: Customer identified — ${customerData.email}`);
        } catch (dfErr: any) {
          this.logger.warn(`Dittofeed identify failed for ${customerData.email}: ${dfErr.message}`);
        }
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to handle customer create', error);
      return { success: false };
    }
  }
}
