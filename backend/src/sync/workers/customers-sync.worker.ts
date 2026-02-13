import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { ShopifyGraphqlService } from '../../shopify/shopify-graphql.service';
import { ShopifyService } from '../../shopify/shopify.service';
import { SyncStateService } from '../sync-state.service';

interface SyncJobData {
  merchantId: string;
  syncLogId?: string;
  isInitial?: boolean;
}

@Processor('customers-sync')
export class CustomersSyncWorker {
  private readonly logger = new Logger(CustomersSyncWorker.name);

  constructor(
    private prisma: PrismaService,
    private shopifyService: ShopifyService,
    private shopifyGraphql: ShopifyGraphqlService,
    private syncState: SyncStateService,
  ) {}

  @Process('sync')
  async handleSync(job: Job<SyncJobData>) {
    const { merchantId, syncLogId, isInitial } = job.data;
    this.logger.log(`Starting customers sync for merchant: ${merchantId} (initial: ${!!isInitial})`);

    // Acquire lock via DB
    const lockAcquired = await this.syncState.acquireLock(merchantId, 'customers');
    if (!lockAcquired) {
      this.logger.warn(`Could not acquire lock for customers sync (merchant: ${merchantId})`);
      return { skipped: true, reason: 'lock_not_acquired' };
    }

    try {
      const merchant = await this.prisma.merchant.findUnique({
        where: { id: merchantId },
      });

      if (!merchant) {
        throw new Error('Merchant not found');
      }

      // Get cursor from DB state for incremental sync
      const state = await this.syncState.getState(merchantId, 'customers');
      let cursor: string | undefined = isInitial ? undefined : (state.lastCursor || undefined);
      let hasNextPage = true;
      let processed = 0;
      let lastCursor: string | null = null;

      while (hasNextPage) {
        const result: any = await this.shopifyGraphql.getCustomers(
          merchant.shopDomain,
          merchant.accessToken,
          50,
          cursor,
        );

        const customers = result.customers.edges;

        for (const edge of customers) {
          const customer = edge.node;

          // Extract amount from GraphQL amountSpent object
          const totalSpent = customer.amountSpent?.amount
            ? parseFloat(customer.amountSpent.amount)
            : 0;
          // Shopify returns numberOfOrders as String, convert to Int
          const ordersCount = customer.numberOfOrders
            ? parseInt(customer.numberOfOrders, 10)
            : 0;

          // Calculate average order value
          const avgOrderValue = ordersCount > 0 ? totalSpent / ordersCount : 0;

          // Extract marketing consent
          const acceptsMarketing = customer.emailMarketingConsent?.marketingState === 'SUBSCRIBED';
          const marketingOptInLevel = customer.emailMarketingConsent?.marketingOptInLevel || null;

          // Extract metafields from edges
          const metafields = customer.metafields?.edges?.map((e: any) => ({
            namespace: e.node.namespace,
            key: e.node.key,
            value: e.node.value,
            type: e.node.type,
          })) || [];

          // Extract last order data
          const lastOrderId = customer.lastOrder?.legacyResourceId
            ? BigInt(customer.lastOrder.legacyResourceId)
            : null;
          const lastOrderAt = customer.lastOrder?.createdAt
            ? new Date(customer.lastOrder.createdAt)
            : null;

          await this.prisma.shopifyCustomer.upsert({
            where: {
              merchantId_shopifyCustomerId: {
                merchantId,
                shopifyCustomerId: BigInt(customer.legacyResourceId),
              },
            },
            create: {
              merchantId,
              shopifyCustomerId: BigInt(customer.legacyResourceId),
              email: customer.email,
              firstName: customer.firstName,
              lastName: customer.lastName,
              phone: customer.phone,
              tags: customer.tags?.join(', '),
              note: customer.note,
              totalSpent,
              ordersCount,
              addresses: customer.addresses || [],
              verifiedEmail: customer.verifiedEmail,
              acceptsMarketing,
              marketingOptInLevel,
              taxExempt: customer.taxExempt,
              state: customer.state,
              currency: customer.amountSpent?.currencyCode || null,
              locale: customer.locale,
              lastOrderId,
              lastOrderAt,
              averageOrderValue: avgOrderValue,
              metafields: metafields.length > 0 ? metafields : null,
              rawData: customer,
            },
            update: {
              email: customer.email,
              firstName: customer.firstName,
              lastName: customer.lastName,
              phone: customer.phone,
              tags: customer.tags?.join(', '),
              note: customer.note,
              totalSpent,
              ordersCount,
              addresses: customer.addresses || [],
              verifiedEmail: customer.verifiedEmail,
              acceptsMarketing,
              marketingOptInLevel,
              taxExempt: customer.taxExempt,
              state: customer.state,
              currency: customer.amountSpent?.currencyCode || null,
              locale: customer.locale,
              lastOrderId,
              lastOrderAt,
              averageOrderValue: avgOrderValue,
              metafields: metafields.length > 0 ? metafields : null,
              rawData: customer,
              syncedAt: new Date(),
            },
          });

          processed++;
        }

        hasNextPage = result.customers.pageInfo.hasNextPage;
        lastCursor = result.customers.pageInfo.endCursor || null;
        cursor = lastCursor || undefined;

        // Update cursor in DB after each page (crash recovery)
        await this.syncState.updateCursor(merchantId, 'customers', lastCursor);
        await job.progress(Math.min((processed / 1000) * 100, 99));
      }

      // Sync completed successfully
      await this.syncState.updateMetrics(merchantId, 'customers', processed);
      await this.syncState.releaseLock(merchantId, 'customers', 'completed');
      await this.syncState.updateMerchantLastSync(merchantId);

      if (syncLogId) {
        await this.prisma.syncLog.update({
          where: { id: syncLogId },
          data: {
            status: 'completed',
            recordsProcessed: processed,
            completedAt: new Date(),
          },
        });
      }

      this.logger.log(`Completed customers sync. Processed ${processed} customers.`);
      return { processed };
    } catch (error) {
      this.logger.error('Customers sync failed', error);

      // Release lock with failure state in DB
      await this.syncState.releaseLock(merchantId, 'customers', 'failed', error.message);

      if (syncLogId) {
        await this.prisma.syncLog.update({
          where: { id: syncLogId },
          data: {
            status: 'failed',
            errorMessage: error.message,
            completedAt: new Date(),
          },
        });
      }

      throw error;
    }
  }
}
