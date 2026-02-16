import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private prisma: PrismaClient;
  private pool: Pool;

  constructor(private config: ConfigService) {
    const dbUrl = this.config.get<string>('DATABASE_URL') || process.env.DATABASE_URL;
    this.pool = new Pool({ connectionString: dbUrl });
    const adapter = new PrismaPg(this.pool);
    this.prisma = new PrismaClient({ adapter } as any);
  }

  async $connect() {
    return this.prisma.$connect();
  }

  async $disconnect() {
    return this.prisma.$disconnect();
  }

  $queryRaw(query: TemplateStringsArray, ...values: any[]) {
    return this.prisma.$queryRaw(query, ...values);
  }

  $executeRaw(query: TemplateStringsArray, ...values: any[]) {
    return this.prisma.$executeRaw(query, ...values);
  }

  $queryRawUnsafe(query: string, ...values: any[]) {
    return this.prisma.$queryRawUnsafe(query, ...values);
  }

  $transaction(fn: any) {
    return this.prisma.$transaction(fn);
  }

  get merchant() {
    return this.prisma.merchant;
  }

  get shopifyCustomer() {
    return this.prisma.shopifyCustomer;
  }

  get company() {
    return this.prisma.company;
  }

  get companyUser() {
    return this.prisma.companyUser;
  }

  get catalogProduct() {
    return this.prisma.catalogProduct;
  }

  get catalogVariant() {
    return this.prisma.catalogVariant;
  }

  get pricingRule() {
    return this.prisma.pricingRule;
  }

  get cart() {
    return this.prisma.cart;
  }

  get cartItem() {
    return this.prisma.cartItem;
  }

  get orderLocal() {
    return this.prisma.orderLocal;
  }

  get activityLog() {
    return this.prisma.activityLog;
  }

  get discountCode() {
    return this.prisma.discountCode;
  }

  get syncLog() {
    return this.prisma.syncLog;
  }

  get syncState() {
    return this.prisma.syncState;
  }

  get wishlist() {
    return this.prisma.wishlist;
  }

  get wishlistItem() {
    return this.prisma.wishlistItem;
  }

  get address() {
    return this.prisma.address;
  }

  get supportTicket() {
    return this.prisma.supportTicket;
  }

  get ticketResponse() {
    return this.prisma.ticketResponse;
  }

  get visitorFingerprint() {
    return this.prisma.visitorFingerprint;
  }

  get visitorIdentity() {
    return this.prisma.visitorIdentity;
  }

  get visitorSession() {
    return this.prisma.visitorSession;
  }

  get visitorEvent() {
    return this.prisma.visitorEvent;
  }

  get companyIntelligence() {
    return this.prisma.companyIntelligence;
  }

  get trafficAttribution() {
    return this.prisma.trafficAttribution;
  }

  get invoice() {
    return this.prisma.invoice;
  }

  get quote() {
    return this.prisma.quote;
  }

  get pickupShelf() {
    return (this.prisma as any).pickupShelf;
  }

  get pickupOrder() {
    return (this.prisma as any).pickupOrder;
  }

  get customerInsight() {
    return this.prisma.customerInsight;
  }

  get proactiveOffer() {
    return this.prisma.proactiveOffer;
  }

  get customerList() {
    return this.prisma.customerList;
  }

  get customerListItem() {
    return this.prisma.customerListItem;
  }

  get designProject() {
    return (this.prisma as any).designProject;
  }

  get marketingSync() {
    return (this.prisma as any).marketingSync;
  }

  get productionJob() {
    return this.prisma.productionJob;
  }

  get printer() {
    return this.prisma.printer;
  }

  get gangSheetBatch() {
    return this.prisma.gangSheetBatch;
  }

  get environmentalLog() {
    return this.prisma.environmentalLog;
  }

  get printerMaintenanceLog() {
    return this.prisma.printerMaintenanceLog;
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Database connected successfully');

      const envToken = this.config.get<string>('SHOPIFY_ACCESS_TOKEN');
      const envDomain = this.config.get<string>('SHOPIFY_STORE_DOMAIN');
      const isPlaceholder = !envToken || ['PLACEHOLDER', 'temp', 'YOUR_TOKEN_HERE'].includes(envToken);

      // Auto-seed merchant if none exists in DB
      // This ensures the system works immediately after migration
      const existingMerchant = await this.prisma.merchant.findFirst();
      if (!existingMerchant && envDomain) {
        try {
          const tokenToUse = isPlaceholder ? 'awaiting-oauth' : envToken;
          await this.prisma.merchant.create({
            data: {
              shopDomain: envDomain,
              accessToken: tokenToUse,
              scope: this.config.get<string>('SHOPIFY_SCOPES', ''),
              status: 'active',
              settings: {},
            },
          });
          this.logger.log(`🏪 Auto-seeded merchant for ${envDomain} (token: ${isPlaceholder ? 'awaiting OAuth' : 'from env'})`);
        } catch (seedErr) {
          this.logger.warn('⚠️ Could not auto-seed merchant', seedErr);
        }
      } else if (existingMerchant && !isPlaceholder && envDomain) {
        // Auto-sync merchant access token from env (env is source of truth)
        try {
          const merchant = await this.prisma.merchant.findFirst({
            where: { shopDomain: envDomain },
          });
          if (merchant && merchant.accessToken !== envToken) {
            await this.prisma.merchant.update({
              where: { id: merchant.id },
              data: { accessToken: envToken },
            });
            // Also reset sync failure counters so sync can resume
            await this.prisma.syncState.updateMany({
              where: { merchantId: merchant.id },
              data: { consecutiveFailures: 0, lastError: null, status: 'idle' },
            });
            this.logger.log(`🔑 Merchant access token synced from env for ${envDomain}`);
          }
        } catch (tokenErr) {
          this.logger.warn('⚠️ Could not sync merchant token from env', tokenErr);
        }
      } else if (isPlaceholder && existingMerchant) {
        this.logger.log('ℹ️ Skipping env token sync — env token is placeholder, using DB token');
      }
    } catch (error) {
      this.logger.error('❌ Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }

    const models = Object.keys(this)
      .filter((key) => !key.startsWith('_') && !key.startsWith('$'))
      .filter((key) => typeof this[key] === 'object');

    return Promise.all(models.map((modelKey) => this[modelKey].deleteMany()));
  }
}
