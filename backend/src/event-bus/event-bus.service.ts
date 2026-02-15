import { Injectable, Logger } from '@nestjs/common';
import { DittofeedService } from '../dittofeed/dittofeed.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * EventBusService — Central event distributor.
 *
 * Every business event is fanned out to:
 *   1. Database (ActivityLog / VisitorEvent) — for analytics & audit
 *   2. Dittofeed — for marketing automation & segmentation
 *   3. Redis (future) — for real-time dashboard updates
 *
 * This is the SINGLE POINT where events should be emitted.
 * Other services should call EventBus instead of writing directly.
 */
@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);

  constructor(
    private prisma: PrismaService,
    private dittofeed: DittofeedService,
  ) {}

  // ─── COMPANY APPROVED: Company activated by merchant ───
  async companyApproved(data: {
    merchantId: string;
    companyId: string;
    companyName: string;
    users: Array<{ id: string; email: string; firstName?: string; lastName?: string; role?: string }>;
  }) {
    this.logger.log(`Event: company_approved → ${data.companyName}`);

    // 1. Write to ActivityLog
    await this.prisma.activityLog.create({
      data: {
        merchantId: data.merchantId,
        companyId: data.companyId,
        eventType: 'company_approved',
        payload: { companyName: data.companyName } as any,
      },
    });

    // 2. Identify all users in Dittofeed
    for (const user of data.users) {
      await this.dittofeed.identifyCompanyUser({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: data.companyId,
        companyName: data.companyName,
        companyStatus: 'active',
        merchantId: data.merchantId,
      });

      // 3. Track the event
      await this.dittofeed.trackEvent(user.id, 'Company Approved', {
        companyId: data.companyId,
        companyName: data.companyName,
      });
    }
  }

  // ─── ORDER CREATED: New order processed via webhook ───
  async orderCreated(data: {
    merchantId: string;
    orderId: string;
    orderNumber: string;
    companyId?: string;
    companyUserId?: string;
    totalPrice: number;
    lineItemCount: number;
    hasDesignFiles: boolean;
    designFileCount: number;
    isPickup: boolean;
  }) {
    this.logger.log(`Event: order_created → #${data.orderNumber}`);

    // 1. ActivityLog
    await this.prisma.activityLog.create({
      data: {
        merchantId: data.merchantId,
        companyId: data.companyId,
        companyUserId: data.companyUserId,
        eventType: 'order_created',
        payload: {
          orderId: data.orderId,
          orderNumber: data.orderNumber,
          totalPrice: data.totalPrice,
          hasDesignFiles: data.hasDesignFiles,
          designFileCount: data.designFileCount,
          isPickup: data.isPickup,
        } as any,
      },
    });

    // 2. Dittofeed
    if (data.companyUserId) {
      await this.dittofeed.trackEvent(data.companyUserId, 'Order Placed', {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        totalPrice: data.totalPrice,
        lineItemCount: data.lineItemCount,
        hasDesignFiles: data.hasDesignFiles,
        designFileCount: data.designFileCount,
        isPickup: data.isPickup,
      });
    }
  }

  // ─── CART ABANDONED: Cart inactive for 2+ hours ───
  async cartAbandoned(data: {
    merchantId: string;
    cartId: string;
    companyUserId?: string;
    companyId?: string;
    total: number;
    itemCount: number;
    abandonedMinutes: number;
  }) {
    this.logger.log(`Event: cart_abandoned → Cart ${data.cartId}`);

    // 1. ActivityLog
    await this.prisma.activityLog.create({
      data: {
        merchantId: data.merchantId,
        companyId: data.companyId,
        companyUserId: data.companyUserId,
        eventType: 'cart_abandoned',
        payload: {
          cartId: data.cartId,
          total: data.total,
          itemCount: data.itemCount,
          abandonedMinutes: data.abandonedMinutes,
        } as any,
      },
    });

    // 2. Dittofeed
    if (data.companyUserId) {
      await this.dittofeed.trackEvent(data.companyUserId, 'Cart Abandoned', {
        cartId: data.cartId,
        total: data.total,
        itemCount: data.itemCount,
        abandonedMinutes: data.abandonedMinutes,
      });
    }
  }

  // ─── DESIGN UPLOADED: Customer uploaded design file with order ───
  async designUploaded(data: {
    merchantId: string;
    orderId: string;
    orderNumber: string;
    companyUserId?: string;
    companyId?: string;
    fileCount: number;
    dimensions: Array<{ width: number; height: number; unit: string }>;
  }) {
    this.logger.log(`Event: design_uploaded → Order #${data.orderNumber} (${data.fileCount} files)`);

    // 1. ActivityLog
    await this.prisma.activityLog.create({
      data: {
        merchantId: data.merchantId,
        companyId: data.companyId,
        companyUserId: data.companyUserId,
        eventType: 'design_uploaded',
        payload: {
          orderId: data.orderId,
          orderNumber: data.orderNumber,
          fileCount: data.fileCount,
          dimensions: data.dimensions,
        } as any,
      },
    });

    // 2. Dittofeed
    if (data.companyUserId) {
      await this.dittofeed.trackDesignEvent(data.companyUserId, 'Design Uploaded', {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        fileCount: data.fileCount,
        dimensions: data.dimensions[0], // Primary file dimensions
      });
    }
  }

  // ─── DESIGN ABANDONED: Design opened but not completed in 48 hours ───
  async designAbandoned(data: {
    merchantId: string;
    designProjectId: string;
    orderId?: string;
    companyUserId?: string;
    companyId?: string;
    hoursInactive: number;
  }) {
    this.logger.log(`Event: design_abandoned → Project ${data.designProjectId}`);

    // 1. ActivityLog
    await this.prisma.activityLog.create({
      data: {
        merchantId: data.merchantId,
        companyId: data.companyId,
        companyUserId: data.companyUserId,
        eventType: 'design_abandoned',
        payload: {
          designProjectId: data.designProjectId,
          orderId: data.orderId,
          hoursInactive: data.hoursInactive,
        } as any,
      },
    });

    // 2. Dittofeed
    if (data.companyUserId) {
      await this.dittofeed.trackDesignEvent(data.companyUserId, 'Design Abandoned', {
        designProjectId: data.designProjectId,
        orderId: data.orderId,
      });
    }
  }

  // ─── PRINT READY: Pickup order is ready for collection ───
  async printReady(data: {
    merchantId: string;
    pickupOrderId: string;
    orderId: string;
    orderNumber: string;
    companyUserId?: string;
    companyId?: string;
    shelfCode?: string;
    qrCode?: string;
  }) {
    this.logger.log(`Event: print_ready → Order #${data.orderNumber}`);

    // 1. ActivityLog
    await this.prisma.activityLog.create({
      data: {
        merchantId: data.merchantId,
        companyId: data.companyId,
        companyUserId: data.companyUserId,
        eventType: 'print_ready',
        payload: {
          pickupOrderId: data.pickupOrderId,
          orderId: data.orderId,
          orderNumber: data.orderNumber,
          shelfCode: data.shelfCode,
          qrCode: data.qrCode,
        } as any,
      },
    });

    // 2. Dittofeed
    if (data.companyUserId) {
      await this.dittofeed.trackEvent(data.companyUserId, 'Print Ready', {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        shelfCode: data.shelfCode,
        qrCode: data.qrCode,
      });
    }
  }

  // ─── CHURN RISK DETECTED: Customer health score dropped ───
  async churnRiskDetected(data: {
    merchantId: string;
    companyId: string;
    companyUserId?: string;
    companyName: string;
    healthScore: number;
    churnRisk: string;
    daysSinceLastOrder: number;
  }) {
    this.logger.log(`Event: churn_risk → ${data.companyName} (risk: ${data.churnRisk})`);

    // 1. ActivityLog
    await this.prisma.activityLog.create({
      data: {
        merchantId: data.merchantId,
        companyId: data.companyId,
        eventType: 'churn_risk_detected',
        payload: {
          companyName: data.companyName,
          healthScore: data.healthScore,
          churnRisk: data.churnRisk,
          daysSinceLastOrder: data.daysSinceLastOrder,
        } as any,
      },
    });

    // 2. Dittofeed
    if (data.companyUserId) {
      await this.dittofeed.trackEvent(data.companyUserId, 'Churn Risk Detected', {
        companyId: data.companyId,
        companyName: data.companyName,
        healthScore: data.healthScore,
        churnRisk: data.churnRisk,
        daysSinceLastOrder: data.daysSinceLastOrder,
      });
    }
  }

  // ─── GENERIC EVENT: For any custom event ───
  async emit(data: {
    merchantId: string;
    eventType: string;
    companyId?: string;
    companyUserId?: string;
    payload?: Record<string, any>;
    dittofeedEventName?: string;
  }) {
    // 1. ActivityLog
    await this.prisma.activityLog.create({
      data: {
        merchantId: data.merchantId,
        companyId: data.companyId,
        companyUserId: data.companyUserId,
        eventType: data.eventType,
        payload: (data.payload || {}) as any,
      },
    });

    // 2. Dittofeed (only if userId is available)
    if (data.companyUserId && data.dittofeedEventName) {
      await this.dittofeed.trackEvent(data.companyUserId, data.dittofeedEventName, data.payload || {});
    }
  }
}
