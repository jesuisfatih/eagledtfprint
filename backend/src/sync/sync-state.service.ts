import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type SyncEntityType = 'customers' | 'products' | 'orders';
export type SyncStatus = 'idle' | 'running' | 'completed' | 'failed';

const LOCK_TTL_MS = 10 * 60 * 1000; // 10 minutes - max time a sync can hold the lock
const MAX_CONSECUTIVE_FAILURES = 5; // After this many failures, require manual intervention

@Injectable()
export class SyncStateService {
  private readonly logger = new Logger(SyncStateService.name);

  constructor(private prisma: PrismaService) {}

  // ============================================
  // STATE GET OPERATIONS (always from DB)
  // ============================================

  /**
   * Get or create sync state for a merchant + entity type.
   * Always reads from database - no caching.
   */
  async getState(merchantId: string, entityType: SyncEntityType) {
    return this.prisma.syncState.upsert({
      where: {
        merchantId_entityType: { merchantId, entityType },
      },
      create: {
        merchantId,
        entityType,
        status: 'idle',
      },
      update: {}, // No-op update, just ensure it exists
    });
  }

  /**
   * Get ALL sync states for a merchant.
   */
  async getAllStates(merchantId: string) {
    // Ensure all entity types exist
    const entityTypes: SyncEntityType[] = ['customers', 'products', 'orders'];

    for (const entityType of entityTypes) {
      await this.prisma.syncState.upsert({
        where: {
          merchantId_entityType: { merchantId, entityType },
        },
        create: {
          merchantId,
          entityType,
          status: 'idle',
        },
        update: {},
      });
    }

    return this.prisma.syncState.findMany({
      where: { merchantId },
      orderBy: { entityType: 'asc' },
    });
  }

  /**
   * Check if a sync is currently running for this entity type.
   * Also handles stale locks (expired TTL).
   */
  async isRunning(merchantId: string, entityType: SyncEntityType): Promise<boolean> {
    const state = await this.getState(merchantId, entityType);

    if (!state.isLocked) return false;

    // Check if lock has expired (stale lock recovery)
    if (state.lockExpiresAt && new Date() > state.lockExpiresAt) {
      this.logger.warn(
        `Stale lock detected for ${entityType} sync (merchant: ${merchantId}). ` +
        `Lock expired at ${state.lockExpiresAt.toISOString()}. Releasing...`
      );
      await this.releaseLock(merchantId, entityType, 'failed', 'Stale lock auto-released');
      return false;
    }

    return true;
  }

  /**
   * Check if sync should be skipped due to too many consecutive failures.
   */
  async shouldSkip(merchantId: string, entityType: SyncEntityType): Promise<boolean> {
    const state = await this.getState(merchantId, entityType);
    return state.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES;
  }

  // ============================================
  // STATE SET OPERATIONS (always to DB)
  // ============================================

  /**
   * Acquire a distributed lock for syncing. Returns true if lock acquired.
   * Uses optimistic locking pattern via unique constraint.
   */
  async acquireLock(merchantId: string, entityType: SyncEntityType): Promise<boolean> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + LOCK_TTL_MS);

      // Try to acquire lock atomically
      const result = await this.prisma.syncState.updateMany({
        where: {
          merchantId,
          entityType,
          isLocked: false, // Only if not already locked
        },
        data: {
          isLocked: true,
          lockedAt: now,
          lockExpiresAt: expiresAt,
          status: 'running',
          lastStartedAt: now,
          lastError: null,
        },
      });

      if (result.count === 0) {
        // Check if lock is expired and force-acquire
        const state = await this.getState(merchantId, entityType);
        if (state.isLocked && state.lockExpiresAt && new Date() > state.lockExpiresAt) {
          this.logger.warn(`Force-acquiring expired lock for ${entityType} (merchant: ${merchantId})`);
          await this.prisma.syncState.update({
            where: { merchantId_entityType: { merchantId, entityType } },
            data: {
              isLocked: true,
              lockedAt: now,
              lockExpiresAt: expiresAt,
              status: 'running',
              lastStartedAt: now,
              lastError: null,
            },
          });
          return true;
        }
        return false;
      }

      this.logger.debug(`Lock acquired for ${entityType} sync (merchant: ${merchantId})`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to acquire lock for ${entityType}`, error);
      return false;
    }
  }

  /**
   * Release a sync lock and update final state.
   */
  async releaseLock(
    merchantId: string,
    entityType: SyncEntityType,
    finalStatus: 'completed' | 'failed',
    error?: string,
  ): Promise<void> {
    const now = new Date();
    const updateData: any = {
      isLocked: false,
      lockedAt: null,
      lockExpiresAt: null,
      status: finalStatus === 'completed' ? 'completed' : 'failed',
    };

    if (finalStatus === 'completed') {
      updateData.lastCompletedAt = now;
      updateData.consecutiveFailures = 0;
      updateData.lastError = null;
    } else {
      updateData.lastFailedAt = now;
      updateData.lastError = error || 'Unknown error';
      // Increment consecutive failures
      const state = await this.getState(merchantId, entityType);
      updateData.consecutiveFailures = state.consecutiveFailures + 1;
    }

    await this.prisma.syncState.update({
      where: { merchantId_entityType: { merchantId, entityType } },
      data: updateData,
    });

    this.logger.debug(
      `Lock released for ${entityType} sync (merchant: ${merchantId}), status: ${finalStatus}`
    );
  }

  /**
   * Update cursor position for incremental sync.
   */
  async updateCursor(
    merchantId: string,
    entityType: SyncEntityType,
    cursor: string | null,
    lastSyncedId?: bigint,
  ): Promise<void> {
    await this.prisma.syncState.update({
      where: { merchantId_entityType: { merchantId, entityType } },
      data: {
        lastCursor: cursor,
        ...(lastSyncedId !== undefined ? { lastSyncedId } : {}),
      },
    });
  }

  /**
   * Update record count metrics.
   */
  async updateMetrics(
    merchantId: string,
    entityType: SyncEntityType,
    recordsProcessed: number,
  ): Promise<void> {
    const state = await this.getState(merchantId, entityType);
    await this.prisma.syncState.update({
      where: { merchantId_entityType: { merchantId, entityType } },
      data: {
        lastRunRecords: recordsProcessed,
        totalRecordsSynced: state.totalRecordsSynced + recordsProcessed,
      },
    });
  }

  /**
   * Update Merchant.lastSyncAt whenever any entity sync completes.
   */
  async updateMerchantLastSync(merchantId: string): Promise<void> {
    await this.prisma.merchant.update({
      where: { id: merchantId },
      data: { lastSyncAt: new Date() },
    });
  }

  /**
   * Reset consecutive failures (for manual retry).
   */
  async resetFailures(merchantId: string, entityType: SyncEntityType): Promise<void> {
    await this.prisma.syncState.update({
      where: { merchantId_entityType: { merchantId, entityType } },
      data: {
        consecutiveFailures: 0,
        lastError: null,
        status: 'idle',
      },
    });
    this.logger.log(`Reset failures for ${entityType} sync (merchant: ${merchantId})`);
  }

  /**
   * Reset all sync states for a merchant (for full re-sync).
   */
  async resetAll(merchantId: string): Promise<void> {
    await this.prisma.syncState.updateMany({
      where: { merchantId },
      data: {
        isLocked: false,
        lockedAt: null,
        lockExpiresAt: null,
        status: 'idle',
        lastCursor: null,
        lastSyncedId: null,
        consecutiveFailures: 0,
        lastError: null,
      },
    });
    this.logger.log(`Reset all sync states for merchant: ${merchantId}`);
  }

  // ============================================
  // COMPREHENSIVE STATUS (for API responses)
  // ============================================

  /**
   * Get comprehensive sync status for a merchant,
   * including state for all entity types + recent logs.
   */
  async getComprehensiveStatus(merchantId: string) {
    const [states, recentLogs, merchant] = await Promise.all([
      this.getAllStates(merchantId),
      this.prisma.syncLog.findMany({
        where: { merchantId },
        orderBy: { startedAt: 'desc' },
        take: 20,
      }),
      this.prisma.merchant.findUnique({
        where: { id: merchantId },
        select: { lastSyncAt: true },
      }),
    ]);

    const isAnySyncing = states.some(s => s.isLocked);
    const hasErrors = states.some(s => s.consecutiveFailures > 0);

    return {
      merchantLastSyncAt: merchant?.lastSyncAt,
      isAnySyncing,
      hasErrors,
      entities: states.reduce((acc, state) => {
        acc[state.entityType] = {
          status: state.status,
          isRunning: state.isLocked,
          lastCompletedAt: state.lastCompletedAt,
          lastFailedAt: state.lastFailedAt,
          lastError: state.lastError,
          totalRecordsSynced: state.totalRecordsSynced,
          lastRunRecords: state.lastRunRecords,
          consecutiveFailures: state.consecutiveFailures,
          lastCursor: state.lastCursor,
        };
        return acc;
      }, {} as Record<string, any>),
      recentLogs,
    };
  }
}
