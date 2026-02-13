import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AbandonedCartsService {
  private readonly logger = new Logger(AbandonedCartsService.name);

  constructor(private prisma: PrismaService) {}

  async getAbandonedCarts(merchantId: string, companyId?: string, includeRecent: boolean = false) {
    // Get carts that aren't converted to orders
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    // Find Anonymous Customers company for this merchant
    const anonymousCompany = await this.prisma.company.findFirst({
      where: {
        merchantId,
        name: 'Anonymous Customers',
      },
    });
    
    const where: any = {
      merchantId,
      convertedToOrderId: null, // Only show carts that haven't been converted to orders
      // Remove status filter - show all non-converted carts regardless of status
    };

    // If companyId provided, filter by company, otherwise show all (including anonymous)
    if (companyId) {
      where.companyId = companyId;
    } else {
      // For admin view, show ALL carts (all companies + anonymous)
      // Don't filter by companyId - show everything
      // Anonymous carts will be identified by company.name === 'Anonymous Customers'
    }

    // For admin view with includeRecent, show all carts. Otherwise show old carts
    // IMPORTANT: Admin panel always wants to see all carts, so if includeRecent is true, don't filter by time
    if (includeRecent === true) {
      // Admin view - show all carts (including recent)
      // Don't add updatedAt filter - show everything
      this.logger.log('✅ Admin view: Showing ALL carts (including recent) - no time filter');
    } else {
      // Show only old carts (older than 1 hour) - for user view
      where.updatedAt = { lt: oneHourAgo };
      this.logger.log(`⏰ User view: Filtering carts older than ${oneHourAgo.toISOString()}`);
    }
    
    this.logger.log(`Querying abandoned carts: merchantId=${merchantId}, companyId=${companyId}, includeRecent=${includeRecent}, anonymousCompanyId=${anonymousCompany?.id}`);
    this.logger.log(`Where clause: ${JSON.stringify(where, null, 2)}`);
    
    const carts = await this.prisma.cart.findMany({
      where,
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    
    const anonymousCount = carts.filter(c => c.company?.name === 'Anonymous Customers').length;
    this.logger.log(`Found ${carts.length} abandoned carts. Anonymous: ${anonymousCount}, Regular: ${carts.length - anonymousCount}`);
    
    return carts;
  }

  /**
   * Get cart activity logs
   */
  async getCartActivityLogs(cartId: string) {
    // First get the cart to find merchant ID
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      select: { merchantId: true },
    });
    
    if (!cart) {
      return [];
    }
    
    const logs = await this.prisma.activityLog.findMany({
      where: {
        merchantId: cart.merchantId,
        eventType: {
          in: ['cart_created', 'cart_items_added', 'cart_item_added', 'cart_item_removed', 'cart_item_updated', 'cart_company_updated'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1000,
    });

    // Filter by cartId in payload
    return logs.filter(log => {
      const payload = log.payload as any;
      return payload?.cartId === cartId;
    });
  }

  /**
   * Get all cart activity logs for merchant
   */
  async getAllCartActivityLogs(merchantId: string, limit = 100) {
    return this.prisma.activityLog.findMany({
      where: {
        merchantId,
        eventType: {
          in: ['cart_created', 'cart_items_added', 'cart_item_added', 'cart_item_removed', 'cart_item_updated', 'cart_company_updated'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async syncShopifyCart(data: any) {
    // Get merchant by shop domain - this is critical for multi-tenant support
    let merchantId: string | null = null;
    
    if (data.shop) {
      const merchant = await this.prisma.merchant.findFirst({
        where: { shopDomain: data.shop },
      });
      if (merchant) {
        merchantId = merchant.id;
      }
    }
    
    // Fallback: if no shop provided, try to get merchant from user email or customer
    if (!merchantId && data.customerEmail) {
      const user = await this.prisma.companyUser.findUnique({
        where: { email: data.customerEmail },
        include: { company: { include: { merchant: true } } },
      });
      if (user?.company?.merchantId) {
        merchantId = user.company.merchantId;
      }
    }
    
    if (!merchantId) {
      throw new Error('Could not determine merchant for cart sync');
    }
    
    // Try to find user by email or shopifyCustomerId
    let companyId = data.companyId || null;
    let userId = data.userId || null;

    if (data.customerEmail && !userId) {
      // Try to find user by email
      const user = await this.prisma.companyUser.findUnique({
        where: { email: data.customerEmail },
        include: { company: true },
      });
      if (user) {
        userId = user.id;
        companyId = user.companyId;
      }
    }

    if (data.shopifyCustomerId && !userId) {
      // Try to find user by Shopify customer ID
      const user = await this.prisma.companyUser.findFirst({
        where: { shopifyCustomerId: BigInt(data.shopifyCustomerId) },
        include: { company: true },
      });
      if (user) {
        userId = user.id;
        companyId = user.companyId;
      }
    }
    
    // Clean cart token (remove query params like ?key=...)
    const cleanCartToken = (data.cartToken || data.shopifyCartId || '').split('?')[0];
    
    // Find or create cart by shopifyCartId or cartToken
    let cart = await this.prisma.cart.findFirst({
      where: {
        merchantId,
        OR: [
          { shopifyCartId: cleanCartToken },
          { shopifyCartId: data.cartToken || data.shopifyCartId },
        ],
      },
    });

    const isNewCart = !cart;
    const previousItemCount = cart ? (await this.prisma.cartItem.count({ where: { cartId: cart.id } })) : 0;

    if (!cart) {
      // Create new cart (can be anonymous if no userId)
      // For anonymous users, we need a valid companyId - use a special anonymous company or create one
      let finalCompanyId = companyId;
      if (!finalCompanyId) {
        // Find or create anonymous company for this merchant
        const anonymousCompany = await this.prisma.company.findFirst({
          where: {
            merchantId,
            name: 'Anonymous Customers',
          },
        });
        
        if (anonymousCompany) {
          finalCompanyId = anonymousCompany.id;
        } else {
          // Create anonymous company
          const newAnonymousCompany = await this.prisma.company.create({
            data: {
              merchantId,
              name: 'Anonymous Customers',
              status: 'active',
            },
          });
          finalCompanyId = newAnonymousCompany.id;
        }
      }

      // For anonymous users, createdByUserId must be null (foreign key constraint)
      const cartData: any = {
        merchantId,
        companyId: finalCompanyId,
        shopifyCartId: cleanCartToken, // Use cleaned token
        status: 'draft',
        metadata: {
          isAnonymous: !userId,
          customerEmail: data.customerEmail || null,
          shopifyCustomerId: data.shopifyCustomerId || null,
          source: 'shopify_snippet',
        },
      };
      
      // Only set createdByUserId if we have a valid user ID
      if (userId) {
        cartData.createdByUserId = userId;
      }
      // For anonymous users, createdByUserId will be null (schema allows this)
      
      cart = await this.prisma.cart.create({
        data: cartData,
      });
      
      this.logger.log(`Cart created: id=${cart.id}, companyId=${cart.companyId}, isAnonymous=${!userId}`);

      // Log cart creation
      await this.logCartActivity(cart.id, merchantId, finalCompanyId, 'cart_created', {
        isAnonymous: !userId,
        customerEmail: data.customerEmail,
        itemCount: data.items?.length || 0,
      });
    } else {
      // Update existing cart
      const oldCompanyId = cart.companyId;
      await this.prisma.cart.update({
        where: { id: cart.id },
        data: {
          companyId: companyId || cart.companyId,
          createdByUserId: userId || cart.createdByUserId,
          updatedAt: new Date(),
          metadata: {
            ...((cart.metadata as any) || {}),
            isAnonymous: !userId,
            customerEmail: data.customerEmail || (cart.metadata as any)?.customerEmail || null,
            shopifyCustomerId: data.shopifyCustomerId || (cart.metadata as any)?.shopifyCustomerId || null,
            lastSyncAt: new Date().toISOString(),
          },
        },
      });

      // Log cart update if company changed
      if (oldCompanyId !== (companyId || cart.companyId)) {
        await this.logCartActivity(cart.id, merchantId, companyId || cart.companyId, 'cart_company_updated', {
          oldCompanyId,
          newCompanyId: companyId || cart.companyId,
        });
      }
    }

    // Get current items before update
    const currentItems = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
    });

    // Update cart items
    // Clear existing items
    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    const newItems: any[] = [];
    // Add new items
    for (const item of data.items || []) {
      try {
        const variantId = item.variant_id || item.variantId;
        const productId = item.product_id || item.productId;
        const price = item.price ? (typeof item.price === 'string' ? parseFloat(item.price) : item.price) : 0;
        
        if (!variantId || !productId) {
          this.logger.warn(`Skipping item: missing variantId or productId`, { item });
          continue;
        }

        // Convert to BigInt safely
        let variantIdBigInt: bigint;
        let productIdBigInt: bigint;
        try {
          variantIdBigInt = BigInt(variantId);
          productIdBigInt = BigInt(productId);
        } catch (e) {
          this.logger.error(`Failed to convert to BigInt:`, { variantId, productId, error: e });
          continue;
        }
        
        // Try to find variant in catalog
        const variant = await this.prisma.catalogVariant.findUnique({
          where: { shopifyVariantId: variantIdBigInt },
          include: { product: true },
        });

        const cartItem = await this.prisma.cartItem.create({
          data: {
            cartId: cart.id,
            variantId: variant?.id,
            shopifyVariantId: variantIdBigInt,
            shopifyProductId: productIdBigInt,
            sku: item.sku || variant?.sku || '',
            title: item.title || variant?.title || '',
            quantity: item.quantity || 1,
            listPrice: price > 1000 ? price / 100 : price, // Handle cents
            unitPrice: price > 1000 ? price / 100 : price,
          },
        });
        newItems.push(cartItem);
      } catch (itemError: any) {
        this.logger.error(`Failed to process cart item:`, {
          item,
          error: itemError.message,
          stack: itemError.stack,
        });
        // Continue with next item instead of failing entire cart
      }
    }

    // Log cart item changes
    const newItemCount = newItems.length;
    if (isNewCart) {
      await this.logCartActivity(cart.id, merchantId, cart.companyId, 'cart_items_added', {
        itemCount: newItemCount,
        items: newItems.map(i => ({ sku: i.sku, title: i.title, quantity: i.quantity })),
      });
    } else if (previousItemCount !== newItemCount) {
      // Items changed
      const addedItems = newItems.filter(ni => 
        ni.shopifyVariantId && !currentItems.some(ci => 
          ci.shopifyVariantId && ci.shopifyVariantId.toString() === ni.shopifyVariantId.toString()
        )
      );
      const removedItems = currentItems.filter(ci => {
        const ciVariantId = ci.shopifyVariantId;
        if (!ciVariantId) return false;
        return !newItems.some(ni => {
          if (!ni.shopifyVariantId) return false;
          return ni.shopifyVariantId.toString() === ciVariantId.toString();
        });
      });
      const updatedItems = newItems.filter(ni => {
        if (!ni.shopifyVariantId) return false;
        const oldItem = currentItems.find(ci => 
          ci.shopifyVariantId && ci.shopifyVariantId.toString() === ni.shopifyVariantId.toString()
        );
        return oldItem && oldItem.quantity !== ni.quantity;
      });

      if (addedItems.length > 0) {
        await this.logCartActivity(cart.id, merchantId, cart.companyId, 'cart_item_added', {
          items: addedItems.map(i => ({ sku: i.sku, title: i.title, quantity: i.quantity })),
        });
      }
      if (removedItems.length > 0) {
        await this.logCartActivity(cart.id, merchantId, cart.companyId, 'cart_item_removed', {
          items: removedItems.map(i => ({ sku: i.sku, title: i.title })),
        });
      }
      if (updatedItems.length > 0) {
        await this.logCartActivity(cart.id, merchantId, cart.companyId, 'cart_item_updated', {
          items: updatedItems.map(i => {
            const oldItem = i.shopifyVariantId ? currentItems.find(ci => 
              ci.shopifyVariantId && ci.shopifyVariantId.toString() === i.shopifyVariantId.toString()
            ) : null;
            return {
              sku: i.sku,
              title: i.title,
              oldQuantity: oldItem?.quantity,
              newQuantity: i.quantity,
            };
          }),
        });
      }
    }

    return cart;
  }

  /**
   * Log cart activity
   */
  private async logCartActivity(
    cartId: string,
    merchantId: string,
    companyId: string | null,
    eventType: string,
    data: any,
  ) {
    try {
      await this.prisma.activityLog.create({
        data: {
          merchantId,
          companyId: companyId || undefined,
          eventType,
          payload: {
            cartId,
            ...data,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      this.logger.error('Failed to log cart activity', error);
      // Don't throw - logging failure shouldn't break cart sync
    }
  }

  async trackCart(data: any) {
    // This is called from snippet - same as sync but with different data structure
    try {
      this.logger.log(`📦 Tracking cart: token=${data.cartToken}, items=${data.items?.length || 0}, email=${data.customerEmail || 'anonymous'}, shop=${data.shop || 'unknown'}`);
      
      const result = await this.syncShopifyCart({
        shop: data.shop, // Pass shop domain for merchant lookup
        cartToken: data.cartToken || data.shopifyCartId,
        shopifyCartId: data.cartToken || data.shopifyCartId,
        customerEmail: data.customerEmail,
        shopifyCustomerId: data.shopifyCustomerId || data.customerId,
        items: data.items || [],
      });
      
      this.logger.log(`✅ Cart tracked successfully: id=${result.id}, companyId=${result.companyId}`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Failed to track cart: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Mark an abandoned cart as restored
   */
  async markAsRestored(cartId: string, merchantId: string) {
    const cart = await this.prisma.cart.findFirst({
      where: { id: cartId, merchantId },
    });

    if (!cart) {
      throw new Error('Cart not found');
    }

    await this.prisma.cart.update({
      where: { id: cartId },
      data: { status: 'restored' },
    });

    this.logger.log(`Cart ${cartId} marked as restored`);
    return { success: true, message: 'Cart restored' };
  }

  /**
   * Delete an abandoned cart
   */
  async deleteCart(cartId: string, merchantId: string) {
    const cart = await this.prisma.cart.findFirst({
      where: { id: cartId, merchantId },
    });

    if (!cart) {
      throw new Error('Cart not found');
    }

    // Delete cart items first
    await this.prisma.cartItem.deleteMany({
      where: { cartId },
    });

    // Delete the cart
    await this.prisma.cart.delete({
      where: { id: cartId },
    });

    this.logger.log(`Cart ${cartId} deleted`);
    return { success: true, message: 'Cart deleted' };
  }
}

