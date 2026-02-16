"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ShippingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShippingService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const axios_1 = __importDefault(require("axios"));
const dittofeed_service_1 = require("../dittofeed/dittofeed.service");
const prisma_service_1 = require("../prisma/prisma.service");
let ShippingService = ShippingService_1 = class ShippingService {
    prisma;
    dittofeed;
    logger = new common_1.Logger(ShippingService_1.name);
    easypostApiKey;
    easypostBaseUrl;
    DEFAULT_FROM_ADDRESS = {
        name: 'Eagle DTF Print',
        company: 'Eagle DTF Print',
        street1: '123 Main St',
        city: 'Paterson',
        state: 'NJ',
        zip: '07501',
        country: 'US',
    };
    constructor(prisma, dittofeed) {
        this.prisma = prisma;
        this.dittofeed = dittofeed;
        this.easypostApiKey = process.env.EASYPOST_API_KEY;
        this.easypostBaseUrl = 'https://api.easypost.com/v2';
        const testMode = process.env.EASYPOST_TEST_MODE === 'true';
        if (this.easypostApiKey) {
            this.logger.log(`EasyPost configured (${testMode ? 'test' : 'production'} mode)`);
        }
        else {
            this.logger.warn('EasyPost not configured (EASYPOST_API_KEY missing)');
        }
    }
    getEasypostClient() {
        if (!this.easypostApiKey) {
            throw new Error('EasyPost not configured');
        }
        return axios_1.default.create({
            baseURL: this.easypostBaseUrl,
            auth: { username: this.easypostApiKey, password: '' },
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000,
        });
    }
    async getRates(request) {
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
        const rates = (res.data.rates || []).map((r) => ({
            carrier: r.carrier,
            service: r.service,
            rate: parseFloat(r.rate),
            estimatedDays: r.est_delivery_days || 0,
            deliveryDate: r.delivery_date,
        }));
        return rates.sort((a, b) => a.rate - b.rate);
    }
    async createShipment(request) {
        const client = this.getEasypostClient();
        const fromAddress = request.fromAddress || this.DEFAULT_FROM_ADDRESS;
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
        let selectedRate = shipment.rates?.[0];
        if (request.serviceLevel) {
            const match = shipment.rates?.find((r) => r.service?.toLowerCase().includes(request.serviceLevel.toLowerCase()));
            if (match)
                selectedRate = match;
        }
        if (!selectedRate) {
            throw new common_1.BadRequestException('No shipping rates available for this address/parcel');
        }
        const buyRes = await client.post(`/shipments/${shipment.id}/buy`, {
            rate: { id: selectedRate.id },
        });
        const bought = buyRes.data;
        await this.prisma.orderLocal.updateMany({
            where: { id: request.orderId, merchantId: request.merchantId },
            data: {
                fulfillmentStatus: 'shipped',
                updatedAt: new Date(),
            },
        });
        const orderForEvent = await this.prisma.orderLocal.findFirst({
            where: { id: request.orderId },
            select: { email: true },
        });
        const eventUserId = orderForEvent?.email || `order_${request.orderId}`;
        await this.dittofeed.trackEvent(eventUserId, 'shipment_created', {
            orderId: request.orderId,
            trackingNumber: bought.tracking_code,
            carrier: selectedRate.carrier,
            service: selectedRate.service,
            rate: parseFloat(selectedRate.rate),
        });
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
    async createBatchShipments(merchantId, orderIds) {
        const orders = await this.prisma.orderLocal.findMany({
            where: { id: { in: orderIds }, merchantId },
        });
        if (!orders.length) {
            throw new common_1.NotFoundException('No orders found');
        }
        const addressGroups = new Map();
        for (const order of orders) {
            const addr = order.shippingAddress;
            if (!addr)
                continue;
            const key = `${(addr.address1 || '').toLowerCase().trim()}_${(addr.zip || '').trim()}_${(addr.city || '').toLowerCase().trim()}`;
            if (!addressGroups.has(key)) {
                addressGroups.set(key, []);
            }
            addressGroups.get(key).push(order);
        }
        const shipments = [];
        const errors = [];
        for (const [, groupedOrders] of addressGroups) {
            try {
                const firstOrder = groupedOrders[0];
                const addr = firstOrder.shippingAddress;
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
                for (const order of groupedOrders) {
                    await this.prisma.orderLocal.update({
                        where: { id: order.id },
                        data: {
                            fulfillmentStatus: 'shipped',
                            updatedAt: new Date(),
                        },
                    });
                }
            }
            catch (err) {
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
    async getIntelligentRouting(orderId, merchantId) {
        const order = await this.prisma.orderLocal.findFirst({
            where: { id: orderId, merchantId },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        const addr = order.shippingAddress;
        const factors = {};
        let recommendation = 'ship';
        let reason = 'Default: shipping';
        const isLocal = addr?.province_code === 'NJ' &&
            ['paterson', 'clifton', 'passaic', 'garfield', 'fair lawn', 'hackensack', 'wayne', 'totowa']
                .includes((addr?.city || '').toLowerCase());
        factors.isLocal = isLocal;
        if (isLocal) {
            recommendation = 'pickup';
            reason = 'Local customer — pickup saves shipping costs';
        }
        const orderValue = Number(order.totalPrice || 0);
        factors.orderValue = orderValue;
        if (orderValue < 20 && !isLocal) {
            recommendation = 'pickup';
            reason = 'Low order value — shipping cost would exceed margin';
        }
        const customer = await this.prisma.shopifyCustomer.findFirst({
            where: {
                email: order.email || order.customerEmail,
                merchantId,
            },
            include: { insight: true },
        });
        if (customer?.insight) {
            const insight = customer.insight;
            factors.pickupRate = Number(insight.pickupRate || 0);
            if (factors.pickupRate > 0.7) {
                recommendation = 'pickup';
                reason = 'Customer prefers pickup (70%+ pickup rate)';
            }
        }
        let shippingCost;
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
        }
        catch { }
        return {
            recommendation,
            reason,
            shippingCost,
            pickupSavings: shippingCost || 0,
            factors,
        };
    }
    async handleTrackingWebhook(payload) {
        const event = payload.result;
        if (!event)
            return;
        const trackingCode = event.tracking_code;
        const status = event.status;
        const statusDetail = event.status_detail;
        this.logger.log(`Tracking update: ${trackingCode} → ${status} (${statusDetail})`);
        const statusMap = {
            pre_transit: 'label_created',
            in_transit: 'in_transit',
            out_for_delivery: 'out_for_delivery',
            delivered: 'delivered',
            return_to_sender: 'returned',
            failure: 'delivery_failed',
            unknown: 'unknown',
        };
        const internalStatus = statusMap[status] || status;
        if (['delivered', 'out_for_delivery', 'delivery_failed'].includes(internalStatus)) {
            try {
                const orderForTracking = await this.prisma.orderLocal.findFirst({
                    where: { trackingNumber: trackingCode },
                    select: { email: true },
                });
                const trackingUserId = orderForTracking?.email || `tracking_${trackingCode}`;
                await this.dittofeed.trackEvent(trackingUserId, `shipment_${internalStatus}`, {
                    trackingNumber: trackingCode,
                    status: internalStatus,
                    statusDetail,
                    carrier: event.carrier,
                    estimatedDelivery: event.est_delivery_date,
                });
            }
            catch (err) {
                this.logger.warn(`Dittofeed tracking event failed: ${err.message}`);
            }
        }
        return { processed: true, status: internalStatus };
    }
    async getShelfCapacity(merchantId) {
        const shelves = await this.prisma.pickupShelf.findMany({
            where: { merchantId, isActive: true },
            include: {
                pickupOrders: {
                    where: { status: { in: ['READY', 'ON_SHELF', 'ready', 'on_shelf'] } },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
        const maxSlotsPerShelf = 20;
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
    async getStalePickupOrders(merchantId, staleDays = 5) {
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
    async getShippingStats(merchantId) {
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
    async checkStalePickups() {
        this.logger.log('Checking for stale pickup orders...');
        try {
            const merchants = await this.prisma.merchant.findMany({
                select: { id: true },
            });
            for (const merchant of merchants) {
                const staleOrders = await this.getStalePickupOrders(merchant.id);
                for (const order of staleOrders) {
                    const daysSinceReady = Math.floor((Date.now() - order.createdAt.getTime()) / (1000 * 60 * 60 * 24));
                    const eventUserId = order.customerEmail || order.email || `order_${order.orderId}`;
                    await this.dittofeed.trackEvent(eventUserId, 'pickup_reminder_needed', {
                        orderId: order.orderId,
                        orderNumber: order.orderNumber || 'N/A',
                        daysWaiting: daysSinceReady,
                        shelfCode: order.shelf?.code,
                    });
                }
                if (staleOrders.length > 0) {
                    this.logger.log(`Merchant ${merchant.id}: ${staleOrders.length} stale pickup orders`);
                }
            }
        }
        catch (err) {
            this.logger.error(`Stale pickup check failed: ${err.message}`);
        }
    }
    async getPendingOrders(merchantId) {
        const orders = await this.prisma.orderLocal.findMany({
            where: {
                merchantId,
                fulfillmentStatus: { in: ['READY_TO_SHIP', 'READY_FOR_PICKUP'] },
            },
            select: {
                id: true,
                shopifyOrderNumber: true,
                email: true,
                shippingAddress: true,
                fulfillmentStatus: true,
                lineItems: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return orders.map(o => {
            const addr = o.shippingAddress || {};
            return {
                id: o.id,
                shopifyOrderNumber: o.shopifyOrderNumber,
                customerName: o.email,
                address: addr.address1 || '',
                city: addr.city || '',
                state: addr.province_code || addr.province || '',
                zip: addr.zip || '',
                totalItems: Array.isArray(o.lineItems) ? o.lineItems.length : 0,
                status: o.fulfillmentStatus,
                trackingNumber: null,
                labelUrl: null,
            };
        });
    }
};
exports.ShippingService = ShippingService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_9AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ShippingService.prototype, "checkStalePickups", null);
exports.ShippingService = ShippingService = ShippingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        dittofeed_service_1.DittofeedService])
], ShippingService);
//# sourceMappingURL=shipping.service.js.map