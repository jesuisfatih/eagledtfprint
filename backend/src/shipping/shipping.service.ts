import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { DittofeedService } from '../dittofeed/dittofeed.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Shipping Service (Phase 4)
 *
 * Gelişmiş sevkiyat yönetimi:
 * - EasyPost / Shipstation label generation
 * - Batch shipping optimization (combine orders to same address)
 * - Pickup vs Ship intelligent routing
 * - Delivery tracking sync
 * - Shelf capacity management
 * - Shipping events → Dittofeed
 *
 * ENV: EASYPOST_API_KEY, EASYPOST_TEST_MODE
 *      SHIPSTATION_API_KEY, SHIPSTATION_API_SECRET
 */

interface ShipmentRequest {
  orderId: string;
  merchantId: string;
  toAddress: {
    name: string;
    company?: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    zip: string;
    country?: string;
    phone?: string;
    email?: string;
  };
  fromAddress?: {
    name: string;
    company?: string;
    street1: string;
    city: string;
    state: string;
    zip: string;
    country?: string;
  };
  parcel: {
    weightOz: number;
    lengthIn?: number;
    widthIn?: number;
    heightIn?: number;
  };
  serviceLevel?: string; // 'Priority' | 'First' | 'Express' | 'Ground'
}

export interface ShipmentResult {
  id: string;
  trackingNumber: string;
  trackingUrl: string;
  labelUrl: string;
  carrier: string;
  service: string;
  rate: number;
  estimatedDelivery?: string;
}

export interface ShippingRate {
  carrier: string;
  service: string;
  rate: number;
  estimatedDays: number;
  deliveryDate?: string;
}

export interface BatchShipmentResult {
  totalOrders: number;
  grouped: number;
  shipments: ShipmentResult[];
  errors: string[];
}

export interface ShelfCapacity {
  totalSlots: number;
  occupied: number;
  available: number;
  utilizationPercent: number;
  shelves: Array<{
    id: string;
    code: string;
    name: string;
    ordersCount: number;
    oldest?: string;
  }>;
}

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);
  private easypostApiKey: string | undefined;
  private easypostBaseUrl: string;
  private readonly DEFAULT_FROM_ADDRESS = {
    name: 'Eagle DTF Print',
    company: 'Eagle DTF Print',
    street1: '123 Main St', // Override in .env: COMPANY_ADDRESS
    city: 'Paterson',
    state: 'NJ',
    zip: '07501',
    country: 'US',
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly dittofeed: DittofeedService,
  ) {
    this.easypostApiKey = process.env.EASYPOST_API_KEY;
    // EasyPost uses single API URL; test vs production is determined by the API key
    this.easypostBaseUrl = 'https://api.easypost.com/v2';

    const testMode = process.env.EASYPOST_TEST_MODE === 'true';
    if (this.easypostApiKey) {
      this.logger.log(`EasyPost configured (${testMode ? 'test' : 'production'} mode)`);
    } else {
      this.logger.warn('EasyPost not configured (EASYPOST_API_KEY missing)');
    }
  }

  private getEasypostClient() {
    if (!this.easypostApiKey) {
      throw new Error('EasyPost not configured');
    }
    return axios.create({
      baseURL: this.easypostBaseUrl,
      auth: { username: this.easypostApiKey, password: '' },
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RATE SHOPPING — Get best rates
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getRates(request: ShipmentRequest): Promise<ShippingRate[]> {
    const client = this.getEasypostClient();

    const fromAddress = request.fromAddress || this.DEFAULT_FROM_ADDRESS;

    const res = await client.post('/shipments', {
      shipment: {
        to_address: {
          name: request.toAddress.name,
          company: request.toAddress.company,
          street1: request.toAddress.street1,
          street2: request.toAddress.street2,
          city: request.toAddress.city,
          state: request.toAddress.state,
          zip: request.toAddress.zip,
          country: request.toAddress.country || 'US',
          phone: request.toAddress.phone,
          email: request.toAddress.email,
        },
        from_address: fromAddress,
        parcel: {
          weight: request.parcel.weightOz,
          length: request.parcel.lengthIn,
          width: request.parcel.widthIn,
          height: request.parcel.heightIn,
        },
      },
    });

    const rates: ShippingRate[] = (res.data.rates || []).map((r: any) => ({
      carrier: r.carrier,
      service: r.service,
      rate: parseFloat(r.rate),
      estimatedDays: r.est_delivery_days || 0,
      deliveryDate: r.delivery_date,
    }));

    // Sort by cheapest first
    return rates.sort((a, b) => a.rate - b.rate);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LABEL GENERATION — Buy & print
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async createShipment(request: ShipmentRequest): Promise<ShipmentResult> {
    const client = this.getEasypostClient();
    const fromAddress = request.fromAddress || this.DEFAULT_FROM_ADDRESS;

    // Create shipment
    const shipmentRes = await client.post('/shipments', {
      shipment: {
        to_address: {
          name: request.toAddress.name,
          company: request.toAddress.company,
          street1: request.toAddress.street1,
          street2: request.toAddress.street2,
          city: request.toAddress.city,
          state: request.toAddress.state,
          zip: request.toAddress.zip,
          country: request.toAddress.country || 'US',
          phone: request.toAddress.phone,
          email: request.toAddress.email,
        },
        from_address: fromAddress,
        parcel: {
          weight: request.parcel.weightOz,
          length: request.parcel.lengthIn,
          width: request.parcel.widthIn,
          height: request.parcel.heightIn,
        },
      },
    });

    const shipment = shipmentRes.data;

    // Select cheapest rate or requested service level
    let selectedRate = shipment.rates?.[0];
    if (request.serviceLevel) {
      const match = shipment.rates?.find(
        (r: any) => r.service?.toLowerCase().includes(request.serviceLevel!.toLowerCase()),
      );
      if (match) selectedRate = match;
    }

    if (!selectedRate) {
      throw new BadRequestException('No shipping rates available for this address/parcel');
    }

    // Buy the label
    const buyRes = await client.post(`/shipments/${shipment.id}/buy`, {
      rate: { id: selectedRate.id },
    });

    const bought = buyRes.data;

    // Store shipping record
    await this.prisma.orderLocal.updateMany({
      where: { id: request.orderId, merchantId: request.merchantId },
      data: {
        fulfillmentStatus: 'shipped',
        updatedAt: new Date(),
      } as any,
    });

    // Fire Dittofeed event — use real customer email as userId
    const orderForEvent = await this.prisma.orderLocal.findFirst({
      where: { id: request.orderId },
      select: { email: true },
    });
    const eventUserId = orderForEvent?.email || `order_${request.orderId}`;
    await this.dittofeed.trackEvent(
      eventUserId,
      'shipment_created',
      {
        orderId: request.orderId,
        trackingNumber: bought.tracking_code,
        carrier: selectedRate.carrier,
        service: selectedRate.service,
        rate: parseFloat(selectedRate.rate),
      },
    );

    return {
      id: bought.id,
      trackingNumber: bought.tracking_code,
      trackingUrl: bought.tracker?.public_url || `https://track.easypost.com/${bought.tracking_code}`,
      labelUrl: bought.postage_label?.label_url,
      carrier: selectedRate.carrier,
      service: selectedRate.service,
      rate: parseFloat(selectedRate.rate),
      estimatedDelivery: selectedRate.delivery_date,
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BATCH SHIPPING — Combine orders going to same address
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async createBatchShipments(
    merchantId: string,
    orderIds: string[],
  ): Promise<BatchShipmentResult> {
    const orders = await this.prisma.orderLocal.findMany({
      where: { id: { in: orderIds }, merchantId },
    });

    if (!orders.length) {
      throw new NotFoundException('No orders found');
    }

    // Group orders by shipping address (normalize for matching)
    const addressGroups = new Map<string, typeof orders>();

    for (const order of orders) {
      const addr = order.shippingAddress as any;
      if (!addr) continue;

      const key = `${(addr.address1 || '').toLowerCase().trim()}_${(addr.zip || '').trim()}_${(addr.city || '').toLowerCase().trim()}`;

      if (!addressGroups.has(key)) {
        addressGroups.set(key, []);
      }
      addressGroups.get(key)!.push(order);
    }

    const shipments: ShipmentResult[] = [];
    const errors: string[] = [];

    for (const [, groupedOrders] of addressGroups) {
      try {
        const firstOrder = groupedOrders[0];
        const addr = firstOrder.shippingAddress as any;

        // Calculate combined weight (estimate: each order ~8oz for DTF transfers)
        const totalWeightOz = groupedOrders.length * 8;

        const result = await this.createShipment({
          orderId: firstOrder.id,
          merchantId,
          toAddress: {
            name: addr.name || `${addr.first_name || ''} ${addr.last_name || ''}`.trim(),
            company: addr.company,
            street1: addr.address1,
            street2: addr.address2,
            city: addr.city,
            state: addr.province_code || addr.province,
            zip: addr.zip,
            country: addr.country_code || 'US',
            phone: addr.phone,
          },
          parcel: {
            weightOz: totalWeightOz,
            lengthIn: 15,
            widthIn: 12,
            heightIn: Math.max(1, groupedOrders.length),
          },
        });

        shipments.push(result);

        // Update all orders in group
        for (const order of groupedOrders) {
          await this.prisma.orderLocal.update({
            where: { id: order.id },
            data: {
              fulfillmentStatus: 'shipped',
              updatedAt: new Date(),
            } as any,
          });
        }
      } catch (err: any) {
        errors.push(`Group failed: ${err.message}`);
      }
    }

    return {
      totalOrders: orders.length,
      grouped: addressGroups.size,
      shipments,
      errors,
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // INTELLIGENT ROUTING — Pickup vs Ship
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Sipariş için en iyi fulfillment yöntemini belirle:
   * - Aynı şehir/county → Pickup öner
   * - Müşteri pickup_preferred trait'ine sahipse → Pickup
   * - Tutarı düşük ($20 altı) → Pickup (shipping maliyetinden kaçın)
   * - Aksi halde → Ship
   */
  async getIntelligentRouting(
    orderId: string,
    merchantId: string,
  ): Promise<{
    recommendation: 'pickup' | 'ship';
    reason: string;
    shippingCost?: number;
    pickupSavings?: number;
    factors: Record<string, any>;
  }> {
    const order = await this.prisma.orderLocal.findFirst({
      where: { id: orderId, merchantId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const addr = order.shippingAddress as any;
    const factors: Record<string, any> = {};
    let recommendation: 'pickup' | 'ship' = 'ship';
    let reason = 'Default: shipping';

    // Factor 1: Same city/state — local customer
    const isLocal =
      addr?.province_code === 'NJ' &&
      ['paterson', 'clifton', 'passaic', 'garfield', 'fair lawn', 'hackensack', 'wayne', 'totowa']
        .includes((addr?.city || '').toLowerCase());
    factors.isLocal = isLocal;

    if (isLocal) {
      recommendation = 'pickup';
      reason = 'Local customer — pickup saves shipping costs';
    }

    // Factor 2: Order value (low value → pickup saves margins)
    const orderValue = Number(order.totalPrice || 0);
    factors.orderValue = orderValue;

    if (orderValue < 20 && !isLocal) {
      recommendation = 'pickup';
      reason = 'Low order value — shipping cost would exceed margin';
    }

    // Factor 3: Customer's pickup preference trait
    const customer = await this.prisma.shopifyCustomer.findFirst({
      where: {
        email: (order as any).email || (order as any).customerEmail,
        merchantId,
      },
      include: { insight: true },
    });

    if (customer?.insight) {
      const insight = customer.insight;
      factors.pickupRate = Number((insight as any).pickupRate || 0);

      if (factors.pickupRate > 0.7) {
        recommendation = 'pickup';
        reason = 'Customer prefers pickup (70%+ pickup rate)';
      }
    }

    // Factor 4: Estimate shipping cost for comparison
    let shippingCost: number | undefined;
    try {
      if (addr && this.easypostApiKey) {
        const rates = await this.getRates({
          orderId,
          merchantId,
          toAddress: {
            name: addr.name || 'Customer',
            street1: addr.address1,
            city: addr.city,
            state: addr.province_code,
            zip: addr.zip,
          },
          parcel: { weightOz: 8, lengthIn: 12, widthIn: 10, heightIn: 1 },
        });
        shippingCost = rates[0]?.rate;
        factors.cheapestShippingRate = shippingCost;
      }
    } catch { /* ignore rate errors for routing */ }

    return {
      recommendation,
      reason,
      shippingCost,
      pickupSavings: shippingCost || 0,
      factors,
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TRACKING — Delivery sync
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** EasyPost tracking webhook handler */
  async handleTrackingWebhook(payload: any) {
    const event = payload.result;
    if (!event) return;

    const trackingCode = event.tracking_code;
    const status = event.status;
    const statusDetail = event.status_detail;

    this.logger.log(`Tracking update: ${trackingCode} → ${status} (${statusDetail})`);

    // Map EasyPost status to internal status
    const statusMap: Record<string, string> = {
      pre_transit: 'label_created',
      in_transit: 'in_transit',
      out_for_delivery: 'out_for_delivery',
      delivered: 'delivered',
      return_to_sender: 'returned',
      failure: 'delivery_failed',
      unknown: 'unknown',
    };

    const internalStatus = statusMap[status] || status;

    // Fire Dittofeed event for delivery notifications
    if (['delivered', 'out_for_delivery', 'delivery_failed'].includes(internalStatus)) {
      try {
        // Look up the order by tracking number to get real customer email
        const orderForTracking = await this.prisma.orderLocal.findFirst({
          where: { trackingNumber: trackingCode } as any,
          select: { email: true },
        });
        const trackingUserId = orderForTracking?.email || `tracking_${trackingCode}`;
        await this.dittofeed.trackEvent(
          trackingUserId,
          `shipment_${internalStatus}`,
          {
            trackingNumber: trackingCode,
            status: internalStatus,
            statusDetail,
            carrier: event.carrier,
            estimatedDelivery: event.est_delivery_date,
          },
        );
      } catch (err: any) {
        this.logger.warn(`Dittofeed tracking event failed: ${err.message}`);
      }
    }

    return { processed: true, status: internalStatus };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SHELF CAPACITY MANAGEMENT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Shelf doluluk durumu */
  async getShelfCapacity(merchantId: string): Promise<ShelfCapacity> {
    const shelves = await this.prisma.pickupShelf.findMany({
      where: { merchantId, isActive: true },
      include: {
        pickupOrders: {
          where: { status: { in: ['READY', 'ON_SHELF', 'ready', 'on_shelf'] } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const maxSlotsPerShelf = 20; // configurable per merchant
    const totalSlots = shelves.length * maxSlotsPerShelf;
    let occupied = 0;

    const shelfData = shelves.map((shelf) => {
      const orderCount = shelf.pickupOrders.length;
      occupied += orderCount;

      return {
        id: shelf.id,
        code: shelf.code,
        name: shelf.name || shelf.code,
        ordersCount: orderCount,
        oldest: shelf.pickupOrders[0]?.createdAt?.toISOString(),
      };
    });

    return {
      totalSlots,
      occupied,
      available: Math.max(0, totalSlots - occupied),
      utilizationPercent: totalSlots > 0 ? Math.round((occupied / totalSlots) * 10000) / 100 : 0,
      shelves: shelfData,
    };
  }

  /** Eski pickup orders temizleme önerisi (5+ gün shelf'te bekleyenler) */
  async getStalePickupOrders(merchantId: string, staleDays: number = 5) {
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - staleDays);

    return this.prisma.pickupOrder.findMany({
      where: {
        merchantId,
        status: { in: ['READY', 'ON_SHELF', 'ready', 'on_shelf'] },
        createdAt: { lt: staleDate },
      },
      include: {
        shelf: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SHIPPING ANALYTICS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Shipping vs Pickup dağılımı */
  async getShippingStats(merchantId: string) {
    const [totalOrders, shippedOrders, pickupOrders] = await Promise.all([
      this.prisma.orderLocal.count({ where: { merchantId } }),
      this.prisma.orderLocal.count({
        where: { merchantId, fulfillmentStatus: { in: ['shipped', 'fulfilled'] } },
      }),
      this.prisma.pickupOrder.count({ where: { merchantId } }),
    ]);

    const pickupRate = totalOrders > 0 ? Math.round((pickupOrders / totalOrders) * 10000) / 100 : 0;
    const shipRate = totalOrders > 0 ? Math.round((shippedOrders / totalOrders) * 10000) / 100 : 0;

    return {
      totalOrders,
      shippedOrders,
      pickupOrders,
      pickupRate,
      shipRate,
      otherRate: Math.max(0, 100 - pickupRate - shipRate),
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DAILY CRON — Stale pickup alerts
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkStalePickups() {
    this.logger.log('Checking for stale pickup orders...');

    try {
      const merchants = await this.prisma.merchant.findMany({
        select: { id: true },
      });

      for (const merchant of merchants) {
        const staleOrders = await this.getStalePickupOrders(merchant.id);

        for (const order of staleOrders) {
          const daysSinceReady = Math.floor(
            (Date.now() - order.createdAt.getTime()) / (1000 * 60 * 60 * 24),
          );

          // Fire event for customer notification — use real email as userId
          const eventUserId = (order as any).customerEmail || (order as any).email || `order_${order.orderId}`;
          await this.dittofeed.trackEvent(
            eventUserId,
            'pickup_reminder_needed',
            {
              orderId: order.orderId,
              orderNumber: order.orderNumber || 'N/A',
              daysWaiting: daysSinceReady,
              shelfCode: (order as any).shelf?.code,
            },
          );
        }

        if (staleOrders.length > 0) {
          this.logger.log(
            `Merchant ${merchant.id}: ${staleOrders.length} stale pickup orders`,
          );
        }
      }
    } catch (err: any) {
      this.logger.error(`Stale pickup check failed: ${err.message}`);
    }
  }
}
