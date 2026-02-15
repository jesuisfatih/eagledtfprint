import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  // ===================================================
  // EXTRACT DESIGN/UPLOAD FILES FROM LINE ITEM PROPERTIES
  // ===================================================
  private extractDesignFiles(lineItems: any[]): any[] {
    if (!Array.isArray(lineItems)) return [];

    const files: any[] = [];
    for (const item of lineItems) {
      const properties = item.properties || [];
      if (!Array.isArray(properties) || properties.length === 0) continue;

      const fileInfo: any = {
        lineItemTitle: item.title || item.name,
        variantTitle: item.variant_title,
        quantity: item.quantity,
        price: item.price,
        imageUrl: item.image_url || null,
      };

      for (const prop of properties) {
        const name = (prop.name || '').toLowerCase();
        const value = prop.value || '';

        // Skip internal/hidden properties
        if (name.startsWith('_') && !name.includes('preview') && !name.includes('upload') && !name.includes('thumbnail')) continue;

        // File URL detection — match common upload app patterns
        if (name.includes('preview') || name === '_preview') fileInfo.previewUrl = value;
        if (name.includes('print') && name.includes('ready')) fileInfo.printReadyUrl = value;
        if ((name.includes('uploaded') || name.includes('file_url') || name.includes('file url')) && this.isUrl(value)) fileInfo.uploadedFileUrl = value;
        if ((name.includes('upload_id') || name === '_ul_upload_id')) fileInfo.uploadId = value;
        if (name.includes('thumbnail') || name === '_ul_thumbnail') fileInfo.thumbnailUrl = value;
        if (name.includes('design_type') || name === 'design type') fileInfo.designType = value;
        if (name.includes('file_name') || name === 'file name' || name === 'filename') fileInfo.fileName = value;
        if (name.includes('edit') && !name.includes('admin')) fileInfo.editUrl = value;
        if (name.includes('admin') && name.includes('edit')) fileInfo.adminEditUrl = value;

        // Generic URL detection for any property with a URL value
        if (!fileInfo.uploadedFileUrl && this.isUrl(value) && (
          name.includes('image') || name.includes('file') || name.includes('artwork') ||
          name.includes('design') || name.includes('photo') || name.includes('logo') ||
          name.includes('graphic') || name.includes('attachment')
        )) {
          fileInfo.uploadedFileUrl = value;
        }
      }

      // Also capture all raw properties for transparency
      fileInfo.allProperties = properties.filter(
        (p: any) => !(p.name || '').startsWith('_') || (p.name || '').includes('preview') || (p.name || '').includes('upload')
      );

      // Only include items that have actual file references
      if (fileInfo.previewUrl || fileInfo.printReadyUrl || fileInfo.uploadedFileUrl ||
          fileInfo.editUrl || fileInfo.thumbnailUrl) {
        files.push(fileInfo);
      }
    }

    return files;
  }

  private isUrl(value: string): boolean {
    if (!value || typeof value !== 'string') return false;
    return value.startsWith('http://') || value.startsWith('https://') || value.startsWith('//');
  }

  // ===================================================
  // DETECT IF ORDER IS A PICKUP ORDER
  // ===================================================
  private detectPickup(order: any): boolean {
    // Check fulfillment status tags
    const tags = (order.tags || '').toLowerCase();
    if (tags.includes('pickup') || tags.includes('local_pickup') || tags.includes('store_pickup')) return true;

    // Check raw line items for shipping method indicators
    const rawData = order.rawData || {};
    const shippingLines = rawData.shipping_lines || rawData.shippingLines || [];
    if (Array.isArray(shippingLines)) {
      for (const sl of shippingLines) {
        const title = ((sl.title || sl.code || '') as string).toLowerCase();
        if (title.includes('pickup')) return true;
      }
    }

    // Check GraphQL shippingLine
    if (rawData.shippingLine) {
      const title = ((rawData.shippingLine.title || rawData.shippingLine.code || '') as string).toLowerCase();
      if (title.includes('pickup')) return true;
    }

    return false;
  }

  // ===================================================
  // MAP ORDER TO FRONTEND FORMAT
  // ===================================================
  private mapOrder(order: any, pickupOrder?: any) {
    const lineItems = Array.isArray(order.lineItems) ? order.lineItems : [];
    const designFiles = this.extractDesignFiles(lineItems);
    const isPickup = this.detectPickup(order);

    return {
      id: order.id,
      orderNumber: order.shopifyOrderNumber || order.shopifyOrderId?.toString() || order.id,
      shopifyOrderNumber: order.shopifyOrderNumber,
      shopifyOrderId: order.shopifyOrderId ? Number(order.shopifyOrderId) : null,
      status: this.mapFinancialToStatus(order.financialStatus),
      paymentStatus: this.mapPaymentStatus(order.financialStatus),
      financialStatus: order.financialStatus,
      fulfillmentStatus: order.fulfillmentStatus || 'unfulfilled',

      // Pricing
      totalPrice: order.totalPrice,
      subtotal: order.subtotal,
      totalTax: order.totalTax,
      totalDiscounts: order.totalDiscounts,
      totalShipping: order.totalShipping || 0,
      totalRefunded: order.totalRefunded || 0,
      currency: order.currency || 'USD',

      // Customer
      email: order.email,
      phone: order.phone,

      // Items & Addresses
      lineItems,
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      discountCodes: order.discountCodes,

      // Fulfillment & Tracking
      fulfillments: order.fulfillments || [],
      refunds: order.refunds || [],

      // Metadata
      notes: order.notes,
      tags: order.tags,
      riskLevel: order.riskLevel,

      // Design files extracted from line item properties
      designFiles,
      hasDesignFiles: designFiles.length > 0,

      // Pickup
      isPickup,
      pickupOrder: pickupOrder ? {
        id: pickupOrder.id,
        status: pickupOrder.status,
        qrCode: pickupOrder.qrCode,
        shelfCode: pickupOrder.shelf?.code || null,
        shelfName: pickupOrder.shelf?.name || null,
        assignedAt: pickupOrder.assignedAt,
        readyAt: pickupOrder.readyAt,
        pickedUpAt: pickupOrder.pickedUpAt,
      } : null,

      // Lifecycle timestamps
      processedAt: order.processedAt,
      cancelledAt: order.cancelledAt,
      closedAt: order.closedAt,

      // Relations
      company: order.company,
      companyUser: order.companyUser,

      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  private mapFinancialToStatus(financialStatus: string): string {
    const statusMap: Record<string, string> = {
      pending: 'pending',
      authorized: 'confirmed',
      partially_paid: 'processing',
      paid: 'confirmed',
      partially_refunded: 'confirmed',
      refunded: 'cancelled',
      voided: 'cancelled',
    };
    return statusMap[financialStatus] || 'pending';
  }

  private mapPaymentStatus(financialStatus: string): string {
    const statusMap: Record<string, string> = {
      pending: 'pending',
      authorized: 'pending',
      partially_paid: 'pending',
      paid: 'paid',
      partially_refunded: 'refunded',
      refunded: 'refunded',
      voided: 'failed',
    };
    return statusMap[financialStatus] || 'pending';
  }

  // ===================================================
  // FIND ALL ORDERS — with pickup filter
  // ===================================================
  async findAll(merchantId: string, filters?: {
    companyId?: string;
    status?: string;
    pickupOnly?: boolean;
    hasDesignFiles?: boolean;
  }) {
    const where: any = { merchantId };

    if (filters?.companyId) {
      where.companyId = filters.companyId;
    }

    if (filters?.status) {
      where.financialStatus = filters.status;
    }

    const orders = await this.prisma.orderLocal.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        companyUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        pickupOrders: {
          include: {
            shelf: { select: { id: true, code: true, name: true } },
          },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    let mapped = orders.map(order => {
      const pickupOrder = (order as any).pickupOrders?.[0] || null;
      return this.mapOrder(order, pickupOrder);
    });

    // Post-filter: pickup only
    if (filters?.pickupOnly) {
      mapped = mapped.filter(o => o.isPickup || o.pickupOrder);
    }

    // Post-filter: has design files
    if (filters?.hasDesignFiles) {
      mapped = mapped.filter(o => o.hasDesignFiles);
    }

    return mapped;
  }

  // ===================================================
  // FIND ONE ORDER — with full detail
  // ===================================================
  async findOne(id: string, merchantId: string, companyId?: string) {
    const where: any = { id, merchantId };

    if (companyId) {
      where.companyId = companyId;
    }

    const order = await this.prisma.orderLocal.findFirst({
      where,
      include: {
        company: true,
        companyUser: true,
        pickupOrders: {
          include: {
            shelf: true,
          },
        },
      },
    });

    if (!order) return null;

    const pickupOrder = (order as any).pickupOrders?.[0] || null;
    return this.mapOrder(order, pickupOrder);
  }

  // ===================================================
  // ORDER STATS — with pickup count
  // ===================================================
  async getStats(merchantId: string, companyId?: string) {
    const where: any = { merchantId };

    if (companyId) {
      where.companyId = companyId;
    }

    const [total, totalRevenue, refundedCount, fulfilledCount, pickupCount] = await Promise.all([
      this.prisma.orderLocal.count({ where }),
      this.prisma.orderLocal.aggregate({
        where,
        _sum: { totalPrice: true, totalRefunded: true, totalShipping: true },
      }),
      this.prisma.orderLocal.count({
        where: { ...where, financialStatus: { in: ['refunded', 'partially_refunded'] } },
      }),
      this.prisma.orderLocal.count({
        where: { ...where, fulfillmentStatus: 'fulfilled' },
      }),
      this.prisma.pickupOrder.count({
        where: { merchantId },
      }),
    ]);

    return {
      total,
      totalRevenue: totalRevenue._sum.totalPrice || 0,
      totalRefunded: totalRevenue._sum.totalRefunded || 0,
      totalShipping: totalRevenue._sum.totalShipping || 0,
      refundedCount,
      fulfilledCount,
      fulfillmentRate: total > 0 ? ((fulfilledCount / total) * 100).toFixed(1) : '0',
      pickupCount,
    };
  }

  // ===================================================
  // CUSTOMER JOURNEY — Full lifecycle for a customer
  // ===================================================
  async getCustomerJourney(merchantId: string, shopifyCustomerId: string) {
    const custId = BigInt(shopifyCustomerId);

    // 1. All sessions for this customer
    const sessions = await this.prisma.visitorSession.findMany({
      where: { merchantId, shopifyCustomerId: custId },
      include: {
        events: {
          orderBy: { createdAt: 'asc' },
          take: 100,
        },
        fingerprint: { select: { platform: true, userAgent: true } },
      },
      orderBy: { startedAt: 'asc' },
      take: 50,
    });

    // 2. All orders for this customer
    const orders = await this.prisma.orderLocal.findMany({
      where: { merchantId, shopifyCustomerId: custId },
      include: { pickupOrders: { take: 1 } },
      orderBy: { createdAt: 'asc' },
    });

    // 3. ShopifyCustomer profile
    const customer = await this.prisma.shopifyCustomer.findFirst({
      where: { merchantId, shopifyCustomerId: custId },
      include: { insight: true },
    });

    // 4. Carts (via company user link)
    let carts: any[] = [];
    if (customer) {
      const companyUser = await this.prisma.companyUser.findFirst({
        where: { shopifyCustomerId: custId },
      });
      if (companyUser) {
        carts = await this.prisma.cart.findMany({
          where: { merchantId, createdByUserId: companyUser.id },
          include: { items: { take: 10 } },
          orderBy: { createdAt: 'asc' },
          take: 20,
        });
      }
    }

    // 5. Build journey timeline
    const timeline: any[] = [];

    // First visit
    if (sessions.length > 0) {
      const firstSession = sessions[0];
      timeline.push({
        type: 'first_visit',
        timestamp: firstSession.startedAt,
        data: {
          landingPage: firstSession.landingPage,
          referrer: firstSession.referrer,
          utmSource: firstSession.utmSource,
          utmCampaign: firstSession.utmCampaign,
          trafficChannel: firstSession.trafficChannel,
          platform: firstSession.fingerprint?.platform,
        },
      });
    }

    // Session events (browse, product view, add to cart, search)
    for (const session of sessions) {
      // Logged in event
      if (session.isLoggedIn) {
        timeline.push({
          type: 'logged_in',
          timestamp: session.startedAt,
          data: { sessionId: session.sessionId },
        });
      }

      // Browse sessions
      if (session.pageViews > 0) {
        timeline.push({
          type: 'browse_session',
          timestamp: session.startedAt,
          data: {
            pageViews: session.pageViews,
            productViews: session.productViews,
            addToCarts: session.addToCarts,
            searchCount: session.searchCount,
            duration: session.durationSeconds,
            landingPage: session.landingPage,
            exitPage: session.exitPage,
          },
        });
      }

      // Product views from events
      const productViewEvents = session.events.filter((e: any) => e.eventType === 'product_view');
      for (const pv of productViewEvents.slice(0, 5)) {
        timeline.push({
          type: 'product_view',
          timestamp: pv.createdAt,
          data: {
            productTitle: pv.productTitle,
            productPrice: pv.productPrice,
            pagePath: pv.pagePath,
          },
        });
      }

      // Add to cart events
      const atcEvents = session.events.filter((e: any) => e.eventType === 'add_to_cart');
      for (const atc of atcEvents) {
        timeline.push({
          type: 'add_to_cart',
          timestamp: atc.createdAt,
          data: {
            productTitle: atc.productTitle,
            quantity: atc.quantity,
            cartValue: atc.cartValue,
          },
        });
      }
    }

    // Cart created/completed
    for (const cart of carts) {
      timeline.push({
        type: 'cart_created',
        timestamp: cart.createdAt,
        data: {
          status: cart.status,
          total: cart.total,
          itemCount: cart.items.length,
          hasCheckout: !!cart.shopifyCheckoutUrl,
        },
      });

      if (cart.convertedAt) {
        timeline.push({
          type: 'cart_converted',
          timestamp: cart.convertedAt,
          data: { total: cart.total },
        });
      }
    }

    // Orders
    for (const order of orders) {
      const designFiles = this.extractDesignFiles(order.lineItems as any || []);
      timeline.push({
        type: 'order_placed',
        timestamp: order.createdAt,
        data: {
          orderNumber: order.shopifyOrderNumber,
          totalPrice: order.totalPrice,
          financialStatus: order.financialStatus,
          fulfillmentStatus: order.fulfillmentStatus,
          lineItemCount: Array.isArray(order.lineItems) ? (order.lineItems as any[]).length : 0,
          hasDesignFiles: designFiles.length > 0,
          designFileCount: designFiles.length,
          isPickup: this.detectPickup(order),
          hasPickupOrder: (order as any).pickupOrders?.length > 0,
        },
      });

      if (order.processedAt) {
        timeline.push({
          type: 'order_processed',
          timestamp: order.processedAt,
          data: { orderNumber: order.shopifyOrderNumber },
        });
      }

      if (order.cancelledAt) {
        timeline.push({
          type: 'order_cancelled',
          timestamp: order.cancelledAt,
          data: { orderNumber: order.shopifyOrderNumber },
        });
      }
    }

    // Sort by timestamp
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Journey metrics
    const firstVisit = sessions.length > 0 ? sessions[0].startedAt : null;
    const firstOrder = orders.length > 0 ? orders[0].createdAt : null;
    const timeToFirstOrder = firstVisit && firstOrder
      ? Math.floor((new Date(firstOrder).getTime() - new Date(firstVisit).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const totalSessionDuration = sessions.reduce((sum, s) => sum + s.durationSeconds, 0);
    const totalPageViews = sessions.reduce((sum, s) => sum + s.pageViews, 0);
    const totalProductViews = sessions.reduce((sum, s) => sum + s.productViews, 0);
    const totalAddToCarts = sessions.reduce((sum, s) => sum + s.addToCarts, 0);
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);
    const designFileOrders = orders.filter(o => this.extractDesignFiles(o.lineItems as any || []).length > 0);

    return {
      customer: customer ? {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        ordersCount: customer.ordersCount,
        totalSpent: customer.totalSpent,
        tags: customer.tags,
        insight: customer.insight,
      } : null,

      journey: {
        timeline,
        metrics: {
          totalSessions: sessions.length,
          totalPageViews,
          totalProductViews,
          totalAddToCarts,
          totalOrders: orders.length,
          totalCarts: carts.length,
          totalRevenue,
          totalSessionDuration,
          avgSessionDuration: sessions.length > 0 ? Math.round(totalSessionDuration / sessions.length) : 0,
          timeToFirstOrderDays: timeToFirstOrder,
          conversionRate: sessions.length > 0 ? ((orders.length / sessions.length) * 100).toFixed(1) : '0',
          designFileOrderCount: designFileOrders.length,
          designFileRate: orders.length > 0 ? ((designFileOrders.length / orders.length) * 100).toFixed(0) : '0',
          firstVisit,
          firstOrder,
          lastOrder: orders.length > 0 ? orders[orders.length - 1].createdAt : null,
          lastSession: sessions.length > 0 ? sessions[sessions.length - 1].startedAt : null,
        },
      },
    };
  }

  // ===================================================
  // JOURNEY FUNNEL — Aggregate for all customers
  // ===================================================
  async getJourneyFunnel(merchantId: string) {
    const [
      totalVisitors,
      identifiedVisitors,
      cartCreators,
      orderPlacers,
      repeatBuyers,
      pickupOrders,
      designFileOrderCount,
    ] = await Promise.all([
      // Total unique visitors (by fingerprint)
      this.prisma.visitorSession.groupBy({
        by: ['fingerprintId'],
        where: { merchantId, isBot: false },
        _count: true,
      }).then(r => r.length),

      // Visitors who logged in or were identified
      this.prisma.visitorSession.groupBy({
        by: ['fingerprintId'],
        where: { merchantId, isBot: false, isLoggedIn: true },
        _count: true,
      }).then(r => r.length),

      // Visitors who created a cart (via addToCarts > 0)
      this.prisma.visitorSession.groupBy({
        by: ['fingerprintId'],
        where: { merchantId, isBot: false, addToCarts: { gt: 0 } },
        _count: true,
      }).then(r => r.length),

      // Customers who placed at least 1 order
      this.prisma.orderLocal.groupBy({
        by: ['shopifyCustomerId'],
        where: { merchantId, shopifyCustomerId: { not: null } },
        _count: true,
      }).then(r => r.length),

      // Repeat buyers (2+ orders)
      this.prisma.orderLocal.groupBy({
        by: ['shopifyCustomerId'],
        where: { merchantId, shopifyCustomerId: { not: null } },
        having: { shopifyCustomerId: { _count: { gte: 2 } } },
        _count: true,
      }).then(r => r.length),

      // Pickup orders total
      this.prisma.pickupOrder.count({ where: { merchantId } }),

      // Orders with design files (approximate via rawData check — we check lineItems JSON)
      this.prisma.orderLocal.count({ where: { merchantId } }),
    ]);

    return {
      funnel: [
        { stage: 'visitors', label: 'Total Visitors', count: totalVisitors, icon: 'eye' },
        { stage: 'identified', label: 'Identified / Logged In', count: identifiedVisitors, icon: 'user-check' },
        { stage: 'add_to_cart', label: 'Added to Cart', count: cartCreators, icon: 'shopping-cart' },
        { stage: 'ordered', label: 'Placed Order', count: orderPlacers, icon: 'receipt' },
        { stage: 'repeat', label: 'Repeat Buyers', count: repeatBuyers, icon: 'repeat' },
      ],
      conversionRates: {
        visitorToIdentified: totalVisitors > 0 ? ((identifiedVisitors / totalVisitors) * 100).toFixed(1) : '0',
        identifiedToCart: identifiedVisitors > 0 ? ((cartCreators / identifiedVisitors) * 100).toFixed(1) : '0',
        cartToOrder: cartCreators > 0 ? ((orderPlacers / cartCreators) * 100).toFixed(1) : '0',
        orderToRepeat: orderPlacers > 0 ? ((repeatBuyers / orderPlacers) * 100).toFixed(1) : '0',
        overallConversion: totalVisitors > 0 ? ((orderPlacers / totalVisitors) * 100).toFixed(2) : '0',
      },
      totalOrders: designFileOrderCount,
      pickupOrders,
    };
  }
}
