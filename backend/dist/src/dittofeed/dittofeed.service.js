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
var DittofeedService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DittofeedService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const axios_1 = __importDefault(require("axios"));
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
let DittofeedService = DittofeedService_1 = class DittofeedService {
    prisma;
    logger = new common_1.Logger(DittofeedService_1.name);
    client = null;
    initialized = false;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async onModuleInit() {
        const writeKey = process.env.DITTOFEED_WRITE_KEY;
        const host = process.env.DITTOFEED_HOST || 'http://multiservice-dittofeed:3000';
        if (!writeKey) {
            this.logger.warn('DITTOFEED_WRITE_KEY not set — Dittofeed integration disabled');
            return;
        }
        const authHeader = writeKey.includes(':')
            ? `Basic ${Buffer.from(writeKey).toString('base64')}`
            : `Basic ${writeKey}`;
        const createClient = () => axios_1.default.create({
            baseURL: host,
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
            },
            timeout: 10000,
        });
        try {
            this.client = createClient();
            await this.client.get('/api/public/health');
            this.initialized = true;
            this.logger.log(`Dittofeed HTTP client initialized → ${host}`);
        }
        catch (err) {
            const status = err.response?.status;
            const data = err.response?.data;
            this.logger.error(`Failed to init Dittofeed HTTP client [${status}]: ${err.message}. Data: ${JSON.stringify(data)}`);
            this.client = createClient();
            this.initialized = true;
            this.logger.warn('Dittofeed initialized with retry mode (health check failed)');
        }
    }
    isReady() {
        return this.initialized && this.client !== null;
    }
    async identifyUser(userId, traits) {
        if (!this.isReady())
            return;
        try {
            await this.client.post('/api/public/apps/identify', {
                messageId: (0, crypto_1.randomUUID)(),
                timestamp: new Date().toISOString(),
                userId,
                traits,
            });
        }
        catch (err) {
            const status = err.response?.status;
            const data = err.response?.data;
            this.logger.error(`Failed to identify user ${userId}: ${err.message} [${status}] ${JSON.stringify(data)}`);
        }
    }
    async trackEvent(userId, event, properties = {}) {
        if (!this.isReady())
            return;
        try {
            await this.client.post('/api/public/apps/track', {
                messageId: (0, crypto_1.randomUUID)(),
                timestamp: new Date().toISOString(),
                userId,
                event,
                properties,
            });
        }
        catch (err) {
            const status = err.response?.status;
            const data = err.response?.data;
            this.logger.error(`Failed to track event ${event} for user ${userId}: ${err.message} [${status}] ${JSON.stringify(data)}`);
        }
    }
    async trackPage(userId, pageName, properties = {}) {
        if (!this.isReady())
            return;
        try {
            await this.client.post('/api/public/apps/page', {
                userId,
                name: pageName,
                properties,
            });
        }
        catch (err) {
            this.logger.error(`Failed to track page ${pageName}: ${err.message}`);
        }
    }
    async batch(events) {
        if (!this.isReady() || events.length === 0)
            return;
        try {
            await this.client.post('/api/public/apps/batch', {
                batch: events.map(e => ({
                    messageId: (0, crypto_1.randomUUID)(),
                    timestamp: new Date().toISOString(),
                    ...e,
                })),
            });
        }
        catch (err) {
            const status = err.response?.status;
            const data = err.response?.data;
            this.logger.error(`Failed to send batch (${events.length} events): ${err.message} [${status}] ${JSON.stringify(data)}`);
        }
    }
    async trackOrderPlaced(orderData) {
        const productAnalysis = this.analyzeOrderProducts(orderData.lineItems);
        await this.trackEvent(orderData.userId, 'order_placed', {
            orderId: orderData.orderId,
            orderNumber: orderData.orderNumber,
            totalPrice: orderData.totalPrice,
            financialStatus: orderData.financialStatus,
            fulfillmentStatus: orderData.fulfillmentStatus || '',
            companyId: orderData.companyId || '',
            companyName: orderData.companyName || '',
            currency: orderData.currency || 'USD',
            lineItemCount: orderData.lineItems.length,
            ...productAnalysis,
        });
        await this.identifyUser(orderData.userId, {
            email: orderData.email,
            last_order_at: new Date().toISOString(),
            favorite_product_type: productAnalysis.dominantProductType || undefined,
            preferred_transfer_type: productAnalysis.dominantTransferType || undefined,
        });
    }
    async trackOrderPaid(userId, orderId, orderNumber, totalPrice) {
        await this.trackEvent(userId, 'order_paid', {
            orderId,
            orderNumber,
            totalPrice,
        });
    }
    async trackOrderFulfilled(userId, orderId, orderNumber, trackingInfo) {
        await this.trackEvent(userId, 'order_fulfilled', {
            orderId,
            orderNumber,
            ...trackingInfo,
        });
    }
    async trackPickupReady(userId, data) {
        await this.trackEvent(userId, 'pickup_ready', data);
    }
    async trackPickupCompleted(userId, data) {
        await this.trackEvent(userId, 'pickup_completed', data);
    }
    async trackGangSheetEvent(userId, data) {
        await this.trackEvent(userId, 'gang_sheet_created', data);
        if (data.fillRate < 0.7) {
            await this.trackEvent(userId, 'gang_sheet_fill_rate_low', {
                ...data,
                optimizationTip: 'Consider adding more designs to fill your gang sheet and save costs!',
            });
        }
    }
    async trackDesignEvent(userId, event, designData) {
        await this.trackEvent(userId, event, {
            category: 'design',
            ...designData,
        });
        if (designData.dpi && designData.dpi < 300) {
            await this.trackEvent(userId, 'design_low_resolution', {
                designProjectId: designData.designProjectId,
                orderId: designData.orderId,
                dpi: designData.dpi,
                recommendation: 'For best print quality, use 300 DPI or higher.',
            });
        }
    }
    async trackPriceTierChange(userId, data) {
        const event = this.tierRank(data.newTier) > this.tierRank(data.previousTier)
            ? 'price_tier_upgraded'
            : 'price_tier_downgraded';
        await this.trackEvent(userId, event, data);
    }
    async identifyCompanyUser(user) {
        await this.identifyUser(user.id, {
            email: user.email,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            company_id: user.companyId,
            company_name: user.companyName || '',
            company_status: user.companyStatus || 'active',
            merchant_id: user.merchantId || '',
            merchant_domain: user.merchantDomain || '',
            platform: 'eagle-engine',
        });
    }
    async syncAllCompanies(merchantId) {
        if (!this.isReady())
            return { synced: 0 };
        const merchant = await this.prisma.merchant.findUnique({
            where: { id: merchantId },
            select: { shopDomain: true },
        });
        const companies = await this.prisma.company.findMany({
            where: { merchantId },
            include: { users: true },
        });
        let synced = 0;
        const batchEvents = [];
        for (const company of companies) {
            for (const user of company.users) {
                batchEvents.push({
                    type: 'identify',
                    userId: user.id,
                    traits: {
                        email: user.email,
                        firstName: user.firstName || '',
                        lastName: user.lastName || '',
                        company_id: company.id,
                        company_name: company.name,
                        company_status: company.status,
                        merchant_id: merchantId,
                        merchant_domain: merchant?.shopDomain || '',
                        platform: 'eagle-engine',
                    },
                });
                synced++;
                if (batchEvents.length >= 50) {
                    await this.batch(batchEvents.splice(0));
                }
            }
        }
        if (batchEvents.length > 0) {
            await this.batch(batchEvents);
        }
        this.logger.log(`Synced ${synced} company users to Dittofeed for merchant ${merchantId}`);
        return { synced };
    }
    async syncCompanyIntelligence(merchantId) {
        if (!this.isReady())
            return { synced: 0 };
        const intels = await this.prisma.companyIntelligence.findMany({
            where: { merchantId },
            include: {
                company: { include: { users: true } },
            },
        });
        let synced = 0;
        const batchEvents = [];
        for (const intel of intels) {
            const segment = intel.segment || 'new';
            const companyTier = this.segmentToTier(segment);
            for (const user of intel.company.users) {
                batchEvents.push({
                    type: 'identify',
                    userId: user.id,
                    traits: {
                        health_score: Math.round(Number(intel.engagementScore) * 10),
                        rfm_segment: segment,
                        company_tier: companyTier,
                        total_orders: intel.totalOrders,
                        total_spent: Number(intel.totalRevenue),
                        churn_risk_score: Math.round(Number(intel.churnRisk) * 100),
                        churn_risk_level: this.churnRiskLevel(Number(intel.churnRisk)),
                        days_since_last_order: intel.daysSinceLastOrder || 0,
                        avg_order_interval_days: intel.orderFrequencyDays || 0,
                        predicted_next_order_date: this.predictNextOrderDate(intel.lastOrderAt, intel.orderFrequencyDays),
                        purchase_probability_30d: this.purchaseProbability30d(intel.daysSinceLastOrder, intel.orderFrequencyDays),
                        is_wholesale: intel.totalOrders >= 5 || Number(intel.totalRevenue) >= 500,
                    },
                });
                synced++;
                if (batchEvents.length >= 50) {
                    await this.batch(batchEvents.splice(0));
                }
            }
        }
        if (batchEvents.length > 0) {
            await this.batch(batchEvents);
        }
        this.logger.log(`Synced ${synced} intelligence profiles to Dittofeed for merchant ${merchantId}`);
        return { synced };
    }
    async syncOrders(merchantId, sinceHours = 24) {
        if (!this.isReady())
            return { synced: 0 };
        const since = new Date(Date.now() - sinceHours * 3600 * 1000);
        const orders = await this.prisma.orderLocal.findMany({
            where: { merchantId, createdAt: { gte: since } },
            include: { company: { include: { users: true } } },
        });
        let synced = 0;
        const batchEvents = [];
        for (const order of orders) {
            if (!order.company?.users?.length)
                continue;
            const userId = order.company.users[0].id;
            const lineItems = Array.isArray(order.lineItems) ? order.lineItems : [];
            const productAnalysis = this.analyzeOrderProducts(lineItems);
            batchEvents.push({
                type: 'track',
                userId,
                event: 'order_placed',
                properties: {
                    orderId: order.id,
                    orderNumber: order.shopifyOrderNumber || '',
                    totalPrice: Number(order.totalPrice || 0),
                    financialStatus: order.financialStatus || '',
                    fulfillmentStatus: order.fulfillmentStatus || '',
                    companyId: order.companyId || '',
                    companyName: order.company.name || '',
                    lineItemCount: lineItems.length,
                    ...productAnalysis,
                },
            });
            synced++;
            if (batchEvents.length >= 50) {
                await this.batch(batchEvents.splice(0));
            }
        }
        if (batchEvents.length > 0) {
            await this.batch(batchEvents);
        }
        this.logger.log(`Synced ${synced} order events to Dittofeed`);
        return { synced };
    }
    async syncVisitorEvents(merchantId, sinceHours = 24) {
        if (!this.isReady())
            return { synced: 0 };
        const since = new Date(Date.now() - sinceHours * 3600 * 1000);
        const events = await this.prisma.visitorEvent.findMany({
            where: {
                merchantId,
                createdAt: { gte: since },
                eventType: { in: ['product_view', 'add_to_cart', 'page_view', 'collection_view'] },
                companyUserId: { not: null },
            },
            take: 500,
        });
        let synced = 0;
        const batchEvents = [];
        const eventMap = {
            product_view: 'Product Viewed',
            add_to_cart: 'Added to Cart',
            page_view: 'Page Viewed',
            collection_view: 'Collection Viewed',
        };
        for (const event of events) {
            const userId = event.companyUserId;
            if (!userId)
                continue;
            batchEvents.push({
                type: 'track',
                userId,
                event: eventMap[event.eventType] || event.eventType,
                properties: {
                    ...(event.metadata || {}),
                    pageUrl: event.pageUrl || '',
                    productTitle: event.productTitle || '',
                    sessionId: event.sessionId || '',
                },
            });
            synced++;
            if (batchEvents.length >= 50) {
                await this.batch(batchEvents.splice(0));
            }
        }
        if (batchEvents.length > 0) {
            await this.batch(batchEvents);
        }
        this.logger.log(`Synced ${synced} visitor events to Dittofeed`);
        return { synced };
    }
    async syncCustomerInsights(merchantId) {
        if (!this.isReady())
            return { synced: 0 };
        const customers = await this.prisma.shopifyCustomer.findMany({
            where: { merchantId },
            include: { insight: true },
        });
        let synced = 0;
        const batchEvents = [];
        for (const customer of customers) {
            if (!customer.email || !customer.insight)
                continue;
            const insight = customer.insight;
            batchEvents.push({
                type: 'identify',
                userId: `shopify_${customer.shopifyCustomerId}`,
                traits: {
                    email: customer.email,
                    firstName: customer.firstName || '',
                    lastName: customer.lastName || '',
                    phone: customer.phone || '',
                    clv_score: Number(insight.clvScore || 0),
                    clv_tier: insight.clvTier || 'unknown',
                    predicted_clv: Number(insight.projectedClv || insight.clvScore || 0),
                    rfm_recency: insight.rfmRecency || 0,
                    rfm_frequency: insight.rfmFrequency || 0,
                    rfm_monetary: insight.rfmMonetary || 0,
                    rfm_score: `${insight.rfmRecency || 0}-${insight.rfmFrequency || 0}-${insight.rfmMonetary || 0}`,
                    rfm_segment: insight.rfmSegment || 'unknown',
                    health_score: insight.healthScore || 0,
                    churn_risk_level: insight.churnRisk || 'unknown',
                    churn_risk_score: this.churnRiskToScore(insight.churnRisk),
                    purchase_frequency: insight.purchaseFrequency || 'unknown',
                    order_trend: insight.orderTrend || 'unknown',
                    is_returning: insight.isReturning,
                    days_since_last_order: insight.daysSinceLastOrder || 0,
                    avg_order_interval_days: insight.avgDaysBetweenOrders || 0,
                    predicted_next_order_date: this.predictNextOrderDate(insight.lastOrderAt, insight.avgDaysBetweenOrders),
                    purchase_probability_30d: this.purchaseProbability30d(insight.daysSinceLastOrder, insight.avgDaysBetweenOrders),
                    first_order_at: insight.firstOrderAt?.toISOString() || '',
                    last_order_at: insight.lastOrderAt?.toISOString() || '',
                    total_spent: Number(customer.totalSpent || 0),
                    total_orders: customer.ordersCount,
                    merchant_id: merchantId,
                },
            });
            synced++;
            if (batchEvents.length >= 50) {
                await this.batch(batchEvents.splice(0));
            }
        }
        if (batchEvents.length > 0) {
            await this.batch(batchEvents);
        }
        this.logger.log(`Synced ${synced} customer insights to Dittofeed`);
        return { synced };
    }
    async syncDtfProductTraits(merchantId) {
        if (!this.isReady())
            return { synced: 0 };
        const orders = await this.prisma.orderLocal.findMany({
            where: { merchantId, companyId: { not: null } },
            include: { company: { include: { users: true } } },
            orderBy: { createdAt: 'desc' },
        });
        const userOrders = new Map();
        for (const order of orders) {
            if (!order.company?.users?.length)
                continue;
            const userId = order.company.users[0].id;
            if (!userOrders.has(userId))
                userOrders.set(userId, []);
            userOrders.get(userId).push(order);
        }
        let synced = 0;
        const batchEvents = [];
        for (const [userId, userOrderList] of userOrders) {
            const analysis = this.analyzeCustomerOrderHistory(userOrderList);
            batchEvents.push({
                type: 'identify',
                userId,
                traits: {
                    favorite_product_type: analysis.favoriteProductType,
                    preferred_transfer_type: analysis.preferredTransferType,
                    gang_sheet_fill_rate: analysis.lastGangSheetFillRate,
                    avg_gang_sheet_fill_rate: analysis.avgGangSheetFillRate,
                    typical_order_size_sqft: analysis.typicalOrderSizeSqft,
                    last_gang_sheet_size: analysis.lastGangSheetSize,
                    design_uploads_count: analysis.designUploadsCount,
                    is_supply_buyer: analysis.isSupplyBuyer,
                    supply_types: analysis.supplyTypes,
                },
            });
            synced++;
            if (batchEvents.length >= 50) {
                await this.batch(batchEvents.splice(0));
            }
        }
        if (batchEvents.length > 0) {
            await this.batch(batchEvents);
        }
        this.logger.log(`Synced ${synced} DTF product traits to Dittofeed`);
        return { synced };
    }
    async syncPickupTraits(merchantId) {
        if (!this.isReady())
            return { synced: 0 };
        const pickupOrders = await this.prisma.pickupOrder.findMany({
            where: { merchantId },
            include: {
                order: { include: { company: { include: { users: true } } } },
            },
        });
        const userPickups = new Map();
        for (const pickup of pickupOrders) {
            if (!pickup.order?.company?.users?.length)
                continue;
            const userId = pickup.order.company.users[0].id;
            if (!userPickups.has(userId)) {
                userPickups.set(userId, { pickupCount: 0, shipCount: 0 });
            }
            const stats = userPickups.get(userId);
            if (pickup.status === 'PICKED_UP') {
                stats.pickupCount++;
            }
        }
        let synced = 0;
        const batchEvents = [];
        for (const [userId, stats] of userPickups) {
            batchEvents.push({
                type: 'identify',
                userId,
                traits: {
                    pickup_count: stats.pickupCount,
                    pickup_preferred: stats.pickupCount > stats.shipCount,
                },
            });
            synced++;
            if (batchEvents.length >= 50) {
                await this.batch(batchEvents.splice(0));
            }
        }
        if (batchEvents.length > 0) {
            await this.batch(batchEvents);
        }
        this.logger.log(`Synced ${synced} pickup traits to Dittofeed`);
        return { synced };
    }
    async handleWebhookCallback(payload) {
        this.logger.log(`Dittofeed webhook callback: ${payload.type} for user ${payload.userId}`);
        switch (payload.type) {
            case 'pickup_reminder_sent':
                await this.logMarketingAction(payload.userId, 'pickup_reminder', payload.data);
                break;
            case 'escalation_needed':
                await this.logMarketingAction(payload.userId, 'escalation', payload.data);
                break;
            case 'review_request_sent':
                await this.logMarketingAction(payload.userId, 'review_request', payload.data);
                break;
            case 'reorder_reminder_sent':
                await this.logMarketingAction(payload.userId, 'reorder_reminder', payload.data);
                break;
            default:
                this.logger.warn(`Unknown webhook callback type: ${payload.type}`);
        }
        return { received: true };
    }
    async autoSync() {
        if (!this.isReady())
            return;
        this.logger.log('Running Dittofeed auto-sync...');
        const merchants = await this.prisma.merchant.findMany({
            where: { status: 'active' },
            select: { id: true },
        });
        for (const m of merchants) {
            try {
                await this.syncCompanyIntelligence(m.id);
                await this.syncOrders(m.id, 1);
                await this.syncVisitorEvents(m.id, 1);
                await this.syncCustomerInsights(m.id);
                await this.syncDtfProductTraits(m.id);
                await this.syncPickupTraits(m.id);
            }
            catch (err) {
                this.logger.error(`Auto-sync failed for merchant ${m.id}: ${err.message}`);
            }
        }
        this.logger.log('Dittofeed auto-sync completed');
    }
    analyzeOrderProducts(lineItems) {
        let hasDesignFiles = false;
        let hasGangSheet = false;
        let hasUvDtf = false;
        let hasSupplies = false;
        let hasGlitter = false;
        let hasGlowInDark = false;
        let totalSqft = 0;
        let gangSheetSize = null;
        for (const item of lineItems) {
            const title = ((item.title || '') + ' ' + (item.variant_title || '')).toLowerCase();
            const props = item.properties || [];
            if (props.some((p) => {
                const name = (p.name || '').toLowerCase();
                return name.includes('preview') || name.includes('upload') || name.includes('file');
            })) {
                hasDesignFiles = true;
            }
            if (title.includes('gang sheet') || title.includes('gang-sheet')) {
                hasGangSheet = true;
                const sizeMatch = title.match(/(\d+["']?\s*x\s*\d+["']?)/i);
                if (sizeMatch)
                    gangSheetSize = sizeMatch[1].replace(/['"]/g, '"');
            }
            if (title.includes('uv dtf') || title.includes('uv-dtf'))
                hasUvDtf = true;
            if (title.includes('glitter'))
                hasGlitter = true;
            if (title.includes('glow'))
                hasGlowInDark = true;
            if (title.includes('ink') || title.includes('film') || title.includes('powder') || title.includes('supply') || title.includes('supplies')) {
                hasSupplies = true;
            }
            const dimMatch = (item.variant_title || '').match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
            if (dimMatch) {
                const w = parseFloat(dimMatch[1]);
                const h = parseFloat(dimMatch[2]);
                totalSqft += (w * h) / 144;
            }
        }
        let dominantProductType = null;
        if (hasGangSheet)
            dominantProductType = 'gang_sheet';
        else if (hasUvDtf)
            dominantProductType = 'uv_dtf';
        else if (hasGlitter)
            dominantProductType = 'glitter_dtf';
        else if (hasGlowInDark)
            dominantProductType = 'glow_dtf';
        else if (hasSupplies)
            dominantProductType = 'supplies';
        else
            dominantProductType = 'by_size';
        let dominantTransferType = null;
        if (hasUvDtf)
            dominantTransferType = 'uv_dtf';
        else if (hasGlitter)
            dominantTransferType = 'glitter';
        else if (hasGlowInDark)
            dominantTransferType = 'glow_in_dark';
        else
            dominantTransferType = 'dtf';
        return {
            hasDesignFiles,
            hasGangSheet,
            hasUvDtf,
            hasSupplies,
            hasGlitter,
            hasGlowInDark,
            dominantProductType,
            dominantTransferType,
            totalSqft: Math.round(totalSqft * 100) / 100,
            gangSheetSize,
        };
    }
    analyzeCustomerOrderHistory(orders) {
        const typeCounts = {};
        const transferCounts = {};
        const sqftValues = [];
        let lastGangSheetSize = '';
        let designUploadsCount = 0;
        let isSupplyBuyer = false;
        const supplyTypes = new Set();
        for (const order of orders) {
            const lineItems = Array.isArray(order.lineItems) ? order.lineItems : [];
            const analysis = this.analyzeOrderProducts(lineItems);
            if (analysis.dominantProductType) {
                typeCounts[analysis.dominantProductType] = (typeCounts[analysis.dominantProductType] || 0) + 1;
            }
            if (analysis.dominantTransferType) {
                transferCounts[analysis.dominantTransferType] = (transferCounts[analysis.dominantTransferType] || 0) + 1;
            }
            if (analysis.totalSqft > 0)
                sqftValues.push(analysis.totalSqft);
            if (analysis.gangSheetSize)
                lastGangSheetSize = analysis.gangSheetSize;
            if (analysis.hasDesignFiles)
                designUploadsCount++;
            if (analysis.hasSupplies) {
                isSupplyBuyer = true;
                for (const item of lineItems) {
                    const title = (item.title || '').toLowerCase();
                    if (title.includes('ink'))
                        supplyTypes.add('ink');
                    if (title.includes('film'))
                        supplyTypes.add('film');
                    if (title.includes('powder'))
                        supplyTypes.add('powder');
                    if (title.includes('clean'))
                        supplyTypes.add('cleaning');
                }
            }
        }
        const favoriteProductType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';
        const preferredTransferType = Object.entries(transferCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'dtf';
        const avgSqft = sqftValues.length > 0 ? sqftValues.reduce((a, b) => a + b, 0) / sqftValues.length : 0;
        return {
            favoriteProductType,
            preferredTransferType,
            lastGangSheetFillRate: 0,
            avgGangSheetFillRate: 0,
            typicalOrderSizeSqft: Math.round(avgSqft * 100) / 100,
            lastGangSheetSize,
            designUploadsCount,
            isSupplyBuyer,
            supplyTypes: Array.from(supplyTypes),
        };
    }
    predictNextOrderDate(lastOrderAt, avgDays) {
        if (!lastOrderAt || !avgDays || avgDays <= 0)
            return '';
        const next = new Date(lastOrderAt.getTime() + avgDays * 86400000);
        return next.toISOString().split('T')[0];
    }
    purchaseProbability30d(daysSinceLast, avgDays) {
        if (!daysSinceLast || !avgDays || avgDays <= 0)
            return 0;
        const ratio = daysSinceLast / avgDays;
        if (ratio < 0.5)
            return 0.9;
        if (ratio < 1.0)
            return 0.7;
        if (ratio < 1.5)
            return 0.4;
        if (ratio < 2.0)
            return 0.2;
        if (ratio < 3.0)
            return 0.1;
        return 0.05;
    }
    churnRiskToScore(risk) {
        switch (risk) {
            case 'low': return 15;
            case 'medium': return 45;
            case 'high': return 75;
            case 'critical': return 95;
            default: return 50;
        }
    }
    churnRiskLevel(risk) {
        if (risk < 0.25)
            return 'low';
        if (risk < 0.5)
            return 'medium';
        if (risk < 0.75)
            return 'high';
        return 'critical';
    }
    segmentToTier(segment) {
        switch (segment) {
            case 'loyal': return 'platinum';
            case 'active': return 'gold';
            case 'new': return 'silver';
            case 'at_risk': return 'bronze';
            case 'churned': return 'inactive';
            default: return 'silver';
        }
    }
    tierRank(tier) {
        const ranks = {
            inactive: 0, bronze: 1, silver: 2, gold: 3, platinum: 4,
        };
        return ranks[tier] ?? 0;
    }
    async logMarketingAction(userId, action, data) {
        try {
            const user = await this.prisma.companyUser.findUnique({
                where: { id: userId },
                select: { companyId: true, company: { select: { merchantId: true } } },
            });
            if (user) {
                await this.prisma.marketingSync.upsert({
                    where: {
                        merchantId_entityType_entityId: {
                            merchantId: user.company.merchantId,
                            entityType: `dittofeed_${action}`,
                            entityId: userId,
                        },
                    },
                    create: {
                        merchantId: user.company.merchantId,
                        entityType: `dittofeed_${action}`,
                        entityId: userId,
                        syncStatus: 'synced',
                        lastSyncedAt: new Date(),
                        lastTraits: data || {},
                    },
                    update: {
                        syncStatus: 'synced',
                        lastSyncedAt: new Date(),
                        lastTraits: data || {},
                    },
                });
            }
        }
        catch (err) {
            this.logger.error(`Failed to log marketing action: ${err.message}`);
        }
    }
};
exports.DittofeedService = DittofeedService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DittofeedService.prototype, "autoSync", null);
exports.DittofeedService = DittofeedService = DittofeedService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DittofeedService);
//# sourceMappingURL=dittofeed.service.js.map