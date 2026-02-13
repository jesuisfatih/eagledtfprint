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

@Processor('products-sync')
export class ProductsSyncWorker {
  private readonly logger = new Logger(ProductsSyncWorker.name);

  constructor(
    private prisma: PrismaService,
    private shopifyService: ShopifyService,
    private shopifyGraphql: ShopifyGraphqlService,
    private syncState: SyncStateService,
  ) {}

  @Process('sync')
  async handleSync(job: Job<SyncJobData>) {
    const { merchantId, syncLogId, isInitial } = job.data;
    this.logger.log(`Starting products sync for merchant: ${merchantId} (initial: ${!!isInitial})`);

    // Acquire lock via DB
    const lockAcquired = await this.syncState.acquireLock(merchantId, 'products');
    if (!lockAcquired) {
      this.logger.warn(`Could not acquire lock for products sync (merchant: ${merchantId})`);
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
      const state = await this.syncState.getState(merchantId, 'products');
      let cursor: string | undefined = isInitial ? undefined : (state.lastCursor || undefined);
      let hasNextPage = true;
      let processed = 0;
      let lastCursor: string | null = null;

      while (hasNextPage) {
        const result: any = await this.shopifyGraphql.getProductsWithVariants(
          merchant.shopDomain,
          merchant.accessToken,
          50,
          cursor,
        );

        const products = result.products.edges;

        for (const edge of products) {
          const product = edge.node;

          // Extract images from edges
          const images = product.images?.edges?.map((e: any) => e.node) || [];

          // Extract media from edges (images, videos, 3D models)
          const media = product.media?.edges?.map((e: any) => ({
            type: e.node.mediaContentType,
            alt: e.node.alt,
            ...(e.node.image && { image: e.node.image }),
            ...(e.node.sources && { sources: e.node.sources }),
            ...(e.node.embedUrl && { embedUrl: e.node.embedUrl }),
          })) || [];

          // Extract collections from edges
          const collections = product.collections?.edges?.map((e: any) => ({
            id: e.node.id,
            title: e.node.title,
            handle: e.node.handle,
          })) || [];

          // Extract metafields from edges
          const metafields = product.metafields?.edges?.map((e: any) => ({
            namespace: e.node.namespace,
            key: e.node.key,
            value: e.node.value,
            type: e.node.type,
          })) || [];

          // Extract options
          const options = product.options?.map((opt: any) => ({
            id: opt.id,
            name: opt.name,
            values: opt.values,
            position: opt.position,
          })) || [];

          const catalogProduct = await this.prisma.catalogProduct.upsert({
            where: {
              merchantId_shopifyProductId: {
                merchantId,
                shopifyProductId: BigInt(product.legacyResourceId),
              },
            },
            create: {
              merchantId,
              shopifyProductId: BigInt(product.legacyResourceId),
              title: product.title,
              handle: product.handle,
              description: product.description,
              descriptionHtml: product.descriptionHtml,
              vendor: product.vendor,
              productType: product.productType,
              tags: product.tags?.join(', '),
              status: product.status,
              images,
              collections,
              metafields,
              seoTitle: product.seo?.title || null,
              seoDescription: product.seo?.description || null,
              options,
              media,
              templateSuffix: product.templateSuffix,
              publishedAt: product.publishedAt ? new Date(product.publishedAt) : null,
              onlineStoreUrl: product.onlineStoreUrl,
              totalInventory: product.totalInventory,
              hasOnlyDefaultVariant: product.hasOnlyDefaultVariant,
              requiresSellingPlan: product.requiresSellingPlan,
              rawData: product,
            },
            update: {
              title: product.title,
              handle: product.handle,
              description: product.description,
              descriptionHtml: product.descriptionHtml,
              vendor: product.vendor,
              productType: product.productType,
              tags: product.tags?.join(', '),
              status: product.status,
              images,
              collections,
              metafields,
              seoTitle: product.seo?.title || null,
              seoDescription: product.seo?.description || null,
              options,
              media,
              templateSuffix: product.templateSuffix,
              publishedAt: product.publishedAt ? new Date(product.publishedAt) : null,
              onlineStoreUrl: product.onlineStoreUrl,
              totalInventory: product.totalInventory,
              hasOnlyDefaultVariant: product.hasOnlyDefaultVariant,
              requiresSellingPlan: product.requiresSellingPlan,
              rawData: product,
              syncedAt: new Date(),
            },
          });

          // Sync variants with enhanced fields
          if (product.variants?.edges) {
            for (const variantEdge of product.variants.edges) {
              const variant = variantEdge.node;

              await this.prisma.catalogVariant.upsert({
                where: {
                  shopifyVariantId: BigInt(variant.legacyResourceId),
                },
                create: {
                  productId: catalogProduct.id,
                  shopifyVariantId: BigInt(variant.legacyResourceId),
                  sku: variant.sku,
                  barcode: variant.barcode,
                  title: variant.title,
                  price: variant.price ? parseFloat(variant.price) : 0,
                  compareAtPrice: variant.compareAtPrice ? parseFloat(variant.compareAtPrice) : null,
                  inventoryQuantity: variant.inventoryQuantity || 0,
                  weight: variant.weight ? parseFloat(variant.weight) : null,
                  weightUnit: variant.weightUnit,
                  option1: variant.selectedOptions?.[0]?.value,
                  option2: variant.selectedOptions?.[1]?.value,
                  option3: variant.selectedOptions?.[2]?.value,
                  imageUrl: variant.image?.url || null,
                  position: variant.position || 0,
                  taxable: variant.taxable ?? true,
                  requiresShipping: variant.requiresShipping ?? true,
                  availableForSale: variant.availableForSale ?? true,
                  inventoryPolicy: variant.inventoryPolicy || 'deny',
                  rawData: variant,
                },
                update: {
                  sku: variant.sku,
                  barcode: variant.barcode,
                  title: variant.title,
                  price: variant.price ? parseFloat(variant.price) : 0,
                  compareAtPrice: variant.compareAtPrice ? parseFloat(variant.compareAtPrice) : null,
                  inventoryQuantity: variant.inventoryQuantity || 0,
                  weight: variant.weight ? parseFloat(variant.weight) : null,
                  weightUnit: variant.weightUnit,
                  option1: variant.selectedOptions?.[0]?.value,
                  option2: variant.selectedOptions?.[1]?.value,
                  option3: variant.selectedOptions?.[2]?.value,
                  imageUrl: variant.image?.url || null,
                  position: variant.position || 0,
                  taxable: variant.taxable ?? true,
                  requiresShipping: variant.requiresShipping ?? true,
                  availableForSale: variant.availableForSale ?? true,
                  inventoryPolicy: variant.inventoryPolicy || 'deny',
                  rawData: variant,
                  syncedAt: new Date(),
                },
              });
            }
          }

          processed++;
        }

        hasNextPage = result.products.pageInfo.hasNextPage;
        lastCursor = result.products.pageInfo.endCursor || null;
        cursor = lastCursor || undefined;

        // Update cursor in DB after each page (crash recovery)
        await this.syncState.updateCursor(merchantId, 'products', lastCursor);
        await job.progress(Math.min((processed / 500) * 100, 99));
      }

      // Sync completed successfully
      await this.syncState.updateMetrics(merchantId, 'products', processed);
      await this.syncState.releaseLock(merchantId, 'products', 'completed');
      await this.syncState.updateMerchantLastSync(merchantId);

      // Update sync log if present
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

      this.logger.log(`Completed products sync. Processed ${processed} products.`);
      return { processed };
    } catch (error) {
      this.logger.error('Products sync failed', error);

      // Release lock with failure state in DB
      await this.syncState.releaseLock(merchantId, 'products', 'failed', error.message);

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
