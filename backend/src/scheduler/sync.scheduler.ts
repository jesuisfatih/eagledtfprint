import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CustomerIntelligenceService } from '../customers/customer-intelligence.service';
import { ProactiveOfferService } from '../customers/proactive-offer.service';
import { PrismaService } from '../prisma/prisma.service';
import { SyncStateService } from '../sync/sync-state.service';
import { SyncService } from '../sync/sync.service';

@Injectable()
export class SyncScheduler {
  private readonly logger = new Logger(SyncScheduler.name);

  constructor(
    private prisma: PrismaService,
    private syncService: SyncService,
    private syncState: SyncStateService,
    private customerIntelligence: CustomerIntelligenceService,
    private proactiveOffers: ProactiveOfferService,
  ) {}

  /**
   * Customers sync every 5 minutes.
   * DB-backed state prevents concurrent runs and handles failures.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCustomersSync() {
    this.logger.debug('Running scheduled customers sync...');
    await this.runSyncForAllMerchants('customers');
  }

  /**
   * Products sync every 5 minutes.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleProductsSync() {
    this.logger.debug('Running scheduled products sync...');
    await this.runSyncForAllMerchants('products');
  }

  /**
   * Orders sync every 10 minutes.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleOrdersSync() {
    this.logger.debug('Running scheduled orders sync...');
    await this.runSyncForAllMerchants('orders');
  }

  /**
   * Customer Intelligence calculation every hour.
   * Calculates CLV, RFM, health scores, churn risk for all customers.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleCustomerIntelligence() {
    this.logger.debug('Running customer intelligence calculations...');

    const merchants = await this.prisma.merchant.findMany({
      where: { status: 'active' },
    });

    for (const merchant of merchants) {
      try {
        const result = await this.customerIntelligence.calculateInsights(merchant.id);
        this.logger.log(`Customer intelligence calculated for ${merchant.shopDomain}: ${result.processed} customers`);
      } catch (error) {
        this.logger.error(
          `Failed to calculate customer intelligence for ${merchant.shopDomain}`,
          error,
        );
      }
    }
  }

  /**
   * Proactive offer generation every 6 hours.
   * Creates personalized discount offers based on customer intelligence.
   */
  @Cron('0 */6 * * *')
  async handleOfferGeneration() {
    this.logger.debug('Running proactive offer generation...');

    const merchants = await this.prisma.merchant.findMany({
      where: { status: 'active' },
    });

    for (const merchant of merchants) {
      try {
        // First expire old offers
        const expired = await this.proactiveOffers.expireOldOffers(merchant.id);
        if (expired > 0) {
          this.logger.log(`Expired ${expired} old offers for ${merchant.shopDomain}`);
        }

        // Then generate new ones
        const result = await this.proactiveOffers.generateOffers(merchant.id);
        this.logger.log(
          `Generated ${result.generated} offers for ${merchant.shopDomain}: ${JSON.stringify(result.strategies)}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to generate offers for ${merchant.shopDomain}`,
          error,
        );
      }
    }
  }

  /**
   * Run sync for all active merchants with proper DB state checks.
   * - Skips merchants where sync is already running (DB lock)
   * - Skips merchants with too many consecutive failures
   * - All state read/written from database
   */
  private async runSyncForAllMerchants(entityType: 'customers' | 'products' | 'orders') {
    const merchants = await this.prisma.merchant.findMany({
      where: { status: 'active' },
    });

    for (const merchant of merchants) {
      try {
        // Check DB state: is it already running?
        const isRunning = await this.syncState.isRunning(merchant.id, entityType);
        if (isRunning) {
          this.logger.debug(
            `Skipping ${entityType} sync for ${merchant.shopDomain}: already running`,
          );
          continue;
        }

        // Check DB state: too many failures?
        const shouldSkip = await this.syncState.shouldSkip(merchant.id, entityType);
        if (shouldSkip) {
          this.logger.debug(
            `Skipping ${entityType} sync for ${merchant.shopDomain}: too many consecutive failures`,
          );
          continue;
        }

        // Trigger sync (which will check DB state again and queue the job)
        switch (entityType) {
          case 'customers':
            await this.syncService.triggerCustomersSync(merchant.id);
            break;
          case 'products':
            await this.syncService.triggerProductsSync(merchant.id);
            break;
          case 'orders':
            await this.syncService.triggerOrdersSync(merchant.id);
            break;
        }
      } catch (error) {
        this.logger.error(
          `Failed to trigger ${entityType} sync for merchant ${merchant.shopDomain}`,
          error,
        );
      }
    }
  }
}
