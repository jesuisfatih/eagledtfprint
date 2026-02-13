import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import type { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { SyncEntityType, SyncStateService } from './sync-state.service';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private prisma: PrismaService,
    private syncState: SyncStateService,
    @InjectQueue('customers-sync') private customersQueue: Queue,
    @InjectQueue('products-sync') private productsQueue: Queue,
    @InjectQueue('orders-sync') private ordersQueue: Queue,
  ) {}

  /**
   * Trigger a full initial sync for all entity types.
   * Resets all cursors and re-syncs everything from scratch.
   */
  async triggerInitialSync(merchantId: string) {
    this.logger.log(`Triggering initial sync for merchant: ${merchantId}`);

    // Reset all states for fresh sync
    await this.syncState.resetAll(merchantId);

    const syncLog = await this.prisma.syncLog.create({
      data: {
        merchantId,
        syncType: 'initial_sync',
        status: 'running',
      },
    });

    // Queue all entity syncs
    await this.customersQueue.add('sync', {
      merchantId,
      syncLogId: syncLog.id,
      isInitial: true,
    });
    await this.productsQueue.add('sync', {
      merchantId,
      syncLogId: syncLog.id,
      isInitial: true,
    });
    await this.ordersQueue.add('sync', {
      merchantId,
      syncLogId: syncLog.id,
      isInitial: true,
    });

    return { message: 'Initial sync started', syncLogId: syncLog.id };
  }

  /**
   * Trigger incremental sync for customers.
   * Checks DB state to prevent concurrent runs.
   */
  async triggerCustomersSync(merchantId: string) {
    return this.triggerEntitySync(merchantId, 'customers', this.customersQueue);
  }

  /**
   * Trigger incremental sync for products.
   */
  async triggerProductsSync(merchantId: string) {
    return this.triggerEntitySync(merchantId, 'products', this.productsQueue);
  }

  /**
   * Trigger incremental sync for orders.
   */
  async triggerOrdersSync(merchantId: string) {
    return this.triggerEntitySync(merchantId, 'orders', this.ordersQueue);
  }

  /**
   * Generic entity sync trigger with full DB state validation.
   */
  private async triggerEntitySync(
    merchantId: string,
    entityType: SyncEntityType,
    queue: Queue,
  ) {
    // Check if already running (from DB, not memory)
    const isRunning = await this.syncState.isRunning(merchantId, entityType);
    if (isRunning) {
      this.logger.debug(
        `${entityType} sync already running for merchant ${merchantId}, skipping`,
      );
      return { message: `${entityType} sync already running`, skipped: true };
    }

    // Check if too many consecutive failures
    const shouldSkip = await this.syncState.shouldSkip(merchantId, entityType);
    if (shouldSkip) {
      this.logger.warn(
        `${entityType} sync has too many consecutive failures for merchant ${merchantId}. ` +
        `Use reset endpoint to re-enable.`,
      );
      return {
        message: `${entityType} sync disabled due to consecutive failures. Use reset to re-enable.`,
        skipped: true,
      };
    }

    await queue.add('sync', { merchantId });
    return { message: `${entityType} sync queued` };
  }

  /**
   * Get comprehensive sync status from database.
   */
  async getSyncStatus(merchantId: string) {
    return this.syncState.getComprehensiveStatus(merchantId);
  }

  /**
   * Reset failures for a specific entity type (manual intervention).
   */
  async resetEntitySync(merchantId: string, entityType: SyncEntityType) {
    await this.syncState.resetFailures(merchantId, entityType);
    return { message: `${entityType} sync reset successfully` };
  }

  /**
   * Reset all sync states (for full re-sync).
   */
  async resetAllSync(merchantId: string) {
    await this.syncState.resetAll(merchantId);
    return { message: 'All sync states reset successfully' };
  }
}
