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
var FingerprintService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FingerprintService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let FingerprintService = FingerprintService_1 = class FingerprintService {
    prisma;
    logger = new common_1.Logger(FingerprintService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async collectFingerprint(dto, ipAddress) {
        const merchant = await this.prisma.merchant.findUnique({
            where: { shopDomain: dto.shop },
        });
        if (!merchant) {
            this.logger.warn(`Unknown shop: ${dto.shop}`);
            return { success: false, error: 'Unknown shop' };
        }
        const merchantId = merchant.id;
        const botScore = this.calculateBotScore(dto);
        const isBot = botScore > 0.7;
        if (isBot) {
            this.logger.debug(`Bot detected: ${dto.fingerprintHash} (score: ${botScore})`);
        }
        const fingerprint = await this.prisma.visitorFingerprint.upsert({
            where: {
                merchantId_fingerprintHash: {
                    merchantId,
                    fingerprintHash: dto.fingerprintHash,
                },
            },
            create: {
                merchantId,
                fingerprintHash: dto.fingerprintHash,
                canvasHash: dto.canvasHash,
                webglHash: dto.webglHash,
                audioHash: dto.audioHash,
                userAgent: dto.userAgent,
                platform: dto.platform,
                language: dto.language,
                languages: dto.languages,
                timezone: dto.timezone,
                timezoneOffset: dto.timezoneOffset,
                screenWidth: dto.screenWidth,
                screenHeight: dto.screenHeight,
                colorDepth: dto.colorDepth,
                pixelRatio: dto.pixelRatio,
                touchSupport: dto.touchSupport,
                hardwareConcurrency: dto.hardwareConcurrency,
                deviceMemory: dto.deviceMemory,
                maxTouchPoints: dto.maxTouchPoints,
                gpuVendor: dto.gpuVendor,
                gpuRenderer: dto.gpuRenderer,
                cookiesEnabled: dto.cookiesEnabled,
                doNotTrack: dto.doNotTrack,
                adBlockDetected: dto.adBlockDetected,
                pluginCount: dto.pluginCount,
                fontCount: dto.fontCount,
                connectionType: dto.connectionType,
                ipAddress,
                isBot,
                botScore,
                signalCount: dto.signalCount || 0,
                confidence: this.calculateConfidence(dto),
                thumbmarkHash: dto.thumbmarkHash || null,
            },
            update: {
                lastSeenAt: new Date(),
                visitCount: { increment: 1 },
                ipAddress,
                ...(dto.gpuVendor && { gpuVendor: dto.gpuVendor }),
                ...(dto.gpuRenderer && { gpuRenderer: dto.gpuRenderer }),
                ...(dto.connectionType && { connectionType: dto.connectionType }),
                ...(dto.signalCount && { signalCount: dto.signalCount }),
                ...(dto.thumbmarkHash && { thumbmarkHash: dto.thumbmarkHash }),
            },
        });
        const identity = await this.resolveIdentity(merchantId, fingerprint.id, dto, ipAddress);
        if (dto.sessionId) {
            await this.upsertSession(merchantId, fingerprint.id, dto, ipAddress, identity, isBot);
        }
        return {
            success: true,
            fingerprintId: fingerprint.id,
            isReturning: fingerprint.visitCount > 1,
            visitCount: fingerprint.visitCount,
            isBot,
        };
    }
    async resolveIdentity(merchantId, fingerprintId, dto, ipAddress) {
        const matchType = this.determineMatchType(dto);
        const matchConfidence = this.calculateMatchConfidence(matchType, dto);
        let companyUserId = null;
        let companyId = null;
        let shopifyCustomerIdBigInt = null;
        if (dto.eagleToken) {
            const existingIdentity = await this.prisma.visitorIdentity.findFirst({
                where: { merchantId, eagleToken: dto.eagleToken },
                select: { companyUserId: true, companyId: true },
            });
            if (existingIdentity) {
                companyUserId = existingIdentity.companyUserId;
                companyId = existingIdentity.companyId;
            }
        }
        if (!companyUserId && dto.email) {
            const user = await this.prisma.companyUser.findUnique({
                where: { email: dto.email },
                select: { id: true, companyId: true, shopifyCustomerId: true },
            });
            if (user) {
                companyUserId = user.id;
                companyId = user.companyId;
                shopifyCustomerIdBigInt = user.shopifyCustomerId;
            }
        }
        if (dto.shopifyCustomerId) {
            try {
                shopifyCustomerIdBigInt = BigInt(dto.shopifyCustomerId);
                if (!companyUserId) {
                    const user = await this.prisma.companyUser.findFirst({
                        where: { shopifyCustomerId: shopifyCustomerIdBigInt, company: { merchantId } },
                        select: { id: true, companyId: true },
                    });
                    if (user) {
                        companyUserId = user.id;
                        companyId = user.companyId;
                    }
                }
            }
            catch {
            }
        }
        if (!companyUserId) {
            const previousIdentity = await this.prisma.visitorIdentity.findFirst({
                where: {
                    fingerprintId,
                    companyUserId: { not: null },
                },
                orderBy: { matchConfidence: 'desc' },
                select: { companyUserId: true, companyId: true, shopifyCustomerId: true, email: true },
            });
            if (previousIdentity) {
                companyUserId = previousIdentity.companyUserId;
                companyId = previousIdentity.companyId;
                shopifyCustomerIdBigInt = previousIdentity.shopifyCustomerId;
            }
        }
        const identity = await this.prisma.visitorIdentity.upsert({
            where: {
                merchantId_fingerprintId_matchType: {
                    merchantId,
                    fingerprintId,
                    matchType,
                },
            },
            create: {
                merchantId,
                fingerprintId,
                shopifyCustomerId: shopifyCustomerIdBigInt,
                companyUserId,
                companyId,
                email: dto.email,
                sessionId: dto.sessionId,
                eagleToken: dto.eagleToken,
                matchType,
                matchConfidence,
                buyerIntent: 'cold',
            },
            update: {
                ...(companyUserId && { companyUserId }),
                ...(companyId && { companyId }),
                ...(shopifyCustomerIdBigInt && { shopifyCustomerId: shopifyCustomerIdBigInt }),
                ...(dto.email && { email: dto.email }),
                ...(dto.sessionId && { sessionId: dto.sessionId }),
                matchConfidence: Math.max(matchConfidence),
            },
        });
        return { companyUserId, companyId, identityId: identity.id };
    }
    async upsertSession(merchantId, fingerprintId, dto, ipAddress, identity, isBot = false) {
        try {
            const ts = dto.trafficSource;
            await this.prisma.visitorSession.upsert({
                where: {
                    merchantId_sessionId: { merchantId, sessionId: dto.sessionId },
                },
                create: {
                    merchantId,
                    fingerprintId,
                    sessionId: dto.sessionId,
                    companyUserId: identity?.companyUserId,
                    companyId: identity?.companyId,
                    ipAddress,
                    userAgent: dto.userAgent,
                    platform: dto.platform,
                    language: dto.language,
                    timezone: dto.timezone,
                    isLoggedIn: !!dto.eagleToken || !!dto.email,
                    isBot,
                    utmSource: ts?.utmSource || null,
                    utmMedium: ts?.utmMedium || null,
                    utmCampaign: ts?.utmCampaign || null,
                    utmContent: ts?.utmContent || null,
                    utmTerm: ts?.utmTerm || null,
                    gclid: ts?.gclid || null,
                    fbclid: ts?.fbclid || null,
                    ttclid: ts?.ttclid || null,
                    msclkid: ts?.msclkid || null,
                    trafficChannel: ts?.channel || null,
                    referrerDomain: ts?.referrerDomain || null,
                    referrer: ts?.referrer || null,
                    landingPage: ts?.landingPage || null,
                },
                update: {
                    lastActivityAt: new Date(),
                    ...(identity?.companyUserId && { companyUserId: identity.companyUserId }),
                    ...(identity?.companyId && { companyId: identity.companyId }),
                    isLoggedIn: !!dto.eagleToken || !!dto.email,
                },
            });
        }
        catch (error) {
            this.logger.debug(`Session upsert error: ${error}`);
        }
    }
    async trackEvent(merchantId, sessionId, fingerprintHash, eventType, payload) {
        const fingerprint = await this.prisma.visitorFingerprint.findUnique({
            where: { merchantId_fingerprintHash: { merchantId, fingerprintHash } },
        });
        if (!fingerprint)
            return;
        let session = await this.prisma.visitorSession.findUnique({
            where: { merchantId_sessionId: { merchantId, sessionId } },
            select: { id: true, companyUserId: true, companyId: true },
        });
        if (!session) {
            try {
                const created = await this.prisma.visitorSession.create({
                    data: {
                        merchantId,
                        fingerprintId: fingerprint.id,
                        sessionId,
                    },
                    select: { id: true, companyUserId: true, companyId: true },
                });
                session = created;
            }
            catch {
                return;
            }
        }
        try {
            await this.prisma.visitorEvent.create({
                data: {
                    merchantId,
                    sessionId: session.id,
                    fingerprintId: fingerprint.id,
                    companyUserId: session?.companyUserId,
                    companyId: session?.companyId,
                    eventType,
                    pageUrl: payload?.url,
                    pagePath: payload?.path,
                    pageTitle: payload?.title,
                    referrer: payload?.referrer,
                    shopifyProductId: payload?.productId ? BigInt(payload.productId) : undefined,
                    shopifyVariantId: payload?.variantId ? BigInt(payload.variantId) : undefined,
                    productTitle: payload?.productTitle,
                    productPrice: payload?.productPrice,
                    quantity: payload?.quantity,
                    searchQuery: payload?.searchQuery,
                    cartValue: payload?.cartValue,
                    metadata: payload,
                },
            });
        }
        catch (error) {
            this.logger.debug(`Event archive error: ${error}`);
        }
        if (session) {
            const updateData = { lastActivityAt: new Date() };
            if (eventType === 'page_view')
                updateData.pageViews = { increment: 1 };
            if (eventType === 'product_view')
                updateData.productViews = { increment: 1 };
            if (eventType === 'add_to_cart')
                updateData.addToCarts = { increment: 1 };
            if (eventType === 'search')
                updateData.searchCount = { increment: 1 };
            if (payload?.url)
                updateData.exitPage = payload.url;
            try {
                await this.prisma.visitorSession.update({
                    where: { id: session.id },
                    data: updateData,
                });
            }
            catch (e) { }
        }
        await this.updateBehavior(merchantId, fingerprintHash, eventType, payload);
        if (session?.companyId) {
            this.updateCompanyIntelligence(merchantId, session.companyId).catch(() => { });
        }
    }
    async updateBehavior(merchantId, fingerprintHash, eventType, payload) {
        const fingerprint = await this.prisma.visitorFingerprint.findUnique({
            where: { merchantId_fingerprintHash: { merchantId, fingerprintHash } },
        });
        if (!fingerprint)
            return;
        const updateData = {};
        switch (eventType) {
            case 'page_view':
                updateData.totalPageViews = { increment: 1 };
                if (payload?.url)
                    updateData.lastPageUrl = payload.url;
                break;
            case 'product_view':
                updateData.totalProductViews = { increment: 1 };
                if (payload?.productId)
                    updateData.lastProductViewed = payload.productId;
                break;
            case 'add_to_cart':
                updateData.totalAddToCarts = { increment: 1 };
                break;
        }
        if (Object.keys(updateData).length > 0) {
            await this.prisma.visitorIdentity.updateMany({
                where: { fingerprintId: fingerprint.id },
                data: updateData,
            });
            await this.recalculateEngagement(fingerprint.id);
        }
    }
    async recalculateEngagement(fingerprintId) {
        const identities = await this.prisma.visitorIdentity.findMany({
            where: { fingerprintId },
        });
        for (const identity of identities) {
            const score = Math.min(100, identity.totalPageViews * 1 +
                identity.totalProductViews * 3 +
                identity.totalAddToCarts * 10 +
                identity.totalOrders * 25);
            let buyerIntent = 'cold';
            if (identity.totalOrders > 0)
                buyerIntent = 'converting';
            else if (identity.totalAddToCarts > 0)
                buyerIntent = 'hot';
            else if (identity.totalProductViews >= 3)
                buyerIntent = 'warm';
            let segment = 'new_visitor';
            if (identity.totalOrders > 5)
                segment = 'VIP';
            else if (identity.totalOrders > 0)
                segment = 'customer';
            else if (identity.totalAddToCarts > 0)
                segment = 'abandoned_cart';
            else if (identity.totalProductViews > 0)
                segment = 'browser';
            await this.prisma.visitorIdentity.update({
                where: { id: identity.id },
                data: { engagementScore: score, buyerIntent, segment },
            });
        }
    }
    async updateCompanyIntelligence(merchantId, companyId) {
        try {
            const [sessions, identities, orders] = await Promise.all([
                this.prisma.visitorSession.aggregate({
                    where: { merchantId, companyId },
                    _count: { id: true },
                    _avg: { durationSeconds: true },
                }),
                this.prisma.visitorIdentity.aggregate({
                    where: { merchantId, companyId },
                    _count: { id: true },
                    _sum: {
                        totalPageViews: true,
                        totalProductViews: true,
                        totalAddToCarts: true,
                        totalOrders: true,
                        totalRevenue: true,
                    },
                }),
                this.prisma.orderLocal.aggregate({
                    where: { merchantId, companyId },
                    _count: { id: true },
                    _avg: { totalPrice: true },
                    _max: { createdAt: true },
                    _min: { createdAt: true },
                }),
            ]);
            const totalOrders = orders._count.id || 0;
            const totalRevenue = Number(identities._sum?.totalRevenue || 0);
            const avgOrderValue = orders._avg?.totalPrice ? Number(orders._avg.totalPrice) : 0;
            const lastOrderAt = orders._max?.createdAt;
            const firstOrderAt = orders._min?.createdAt;
            const daysSinceLastOrder = lastOrderAt
                ? Math.floor((Date.now() - new Date(lastOrderAt).getTime()) / 86400000)
                : null;
            const totalPageViews = identities._sum?.totalPageViews || 0;
            const totalProductViews = identities._sum?.totalProductViews || 0;
            const totalAddToCarts = identities._sum?.totalAddToCarts || 0;
            const engagementScore = Math.min(100, totalPageViews * 0.5 +
                totalProductViews * 2 +
                totalAddToCarts * 5 +
                totalOrders * 15 +
                (totalRevenue / 100) * 3);
            let buyerIntent = 'cold';
            if (totalOrders > 0)
                buyerIntent = 'converting';
            else if (totalAddToCarts > 0)
                buyerIntent = 'hot';
            else if (totalProductViews >= 5)
                buyerIntent = 'warm';
            let segment = 'new';
            if (totalOrders > 10)
                segment = 'loyal';
            else if (totalOrders > 3)
                segment = 'active';
            else if (totalOrders > 0)
                segment = 'interested';
            else if (daysSinceLastOrder && daysSinceLastOrder > 60)
                segment = 'at_risk';
            else if (daysSinceLastOrder && daysSinceLastOrder > 120)
                segment = 'churned';
            let churnRisk = 0;
            if (daysSinceLastOrder) {
                if (daysSinceLastOrder > 90)
                    churnRisk = 0.9;
                else if (daysSinceLastOrder > 60)
                    churnRisk = 0.7;
                else if (daysSinceLastOrder > 30)
                    churnRisk = 0.4;
                else
                    churnRisk = 0.1;
            }
            const upsellPotential = Math.min(1, (totalProductViews > totalOrders * 5 ? 0.3 : 0) +
                (totalAddToCarts > totalOrders * 2 ? 0.3 : 0) +
                (engagementScore > 50 ? 0.2 : 0) +
                (buyerIntent === 'hot' ? 0.2 : 0));
            let suggestedDiscount = null;
            if (segment === 'at_risk')
                suggestedDiscount = 15;
            else if (segment === 'churned')
                suggestedDiscount = 20;
            else if (buyerIntent === 'hot' && totalOrders === 0)
                suggestedDiscount = 10;
            const topProducts = await this.prisma.visitorEvent.groupBy({
                by: ['shopifyProductId'],
                where: { merchantId, companyId, eventType: 'product_view', shopifyProductId: { not: null } },
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
                take: 10,
            });
            await this.prisma.companyIntelligence.upsert({
                where: { companyId },
                create: {
                    merchantId,
                    companyId,
                    totalVisitors: sessions._count.id,
                    totalSessions: sessions._count.id,
                    totalPageViews,
                    totalProductViews,
                    totalAddToCarts,
                    totalOrders,
                    totalRevenue,
                    avgSessionDuration: sessions._avg?.durationSeconds ? Math.round(sessions._avg.durationSeconds) : 0,
                    avgOrderValue,
                    engagementScore,
                    buyerIntent,
                    segment,
                    lastActiveAt: new Date(),
                    firstOrderAt,
                    lastOrderAt,
                    daysSinceLastOrder,
                    suggestedDiscount,
                    churnRisk,
                    upsellPotential,
                    topViewedProducts: topProducts.map(p => ({
                        productId: p.shopifyProductId?.toString(),
                        views: p._count.id,
                    })),
                },
                update: {
                    totalVisitors: sessions._count.id,
                    totalSessions: sessions._count.id,
                    totalPageViews,
                    totalProductViews,
                    totalAddToCarts,
                    totalOrders,
                    totalRevenue,
                    avgSessionDuration: sessions._avg?.durationSeconds ? Math.round(sessions._avg.durationSeconds) : 0,
                    avgOrderValue,
                    engagementScore,
                    buyerIntent,
                    segment,
                    lastActiveAt: new Date(),
                    firstOrderAt,
                    lastOrderAt,
                    daysSinceLastOrder,
                    suggestedDiscount,
                    churnRisk,
                    upsellPotential,
                    topViewedProducts: topProducts.map(p => ({
                        productId: p.shopifyProductId?.toString(),
                        views: p._count.id,
                    })),
                },
            });
        }
        catch (error) {
            this.logger.error(`Company intelligence update failed for ${companyId}: ${error}`);
        }
    }
    async getDashboard(merchantId) {
        const [totalVisitors, returningVisitors, identifiedVisitors, botCount, intentDistribution, segmentDistribution, recentVisitors, topEngaged,] = await Promise.all([
            this.prisma.visitorFingerprint.count({ where: { merchantId } }),
            this.prisma.visitorFingerprint.count({ where: { merchantId, visitCount: { gt: 1 } } }),
            this.prisma.visitorIdentity.count({ where: { merchantId, companyUserId: { not: null } } }),
            this.prisma.visitorFingerprint.count({ where: { merchantId, isBot: true } }),
            this.prisma.visitorIdentity.groupBy({
                by: ['buyerIntent'],
                where: { merchantId },
                _count: { id: true },
            }),
            this.prisma.visitorIdentity.groupBy({
                by: ['segment'],
                where: { merchantId, segment: { not: null } },
                _count: { id: true },
            }),
            this.prisma.visitorFingerprint.findMany({
                where: { merchantId, isBot: false },
                include: {
                    identities: {
                        include: {
                            companyUser: { select: { email: true, firstName: true, lastName: true } },
                            company: { select: { name: true } },
                        },
                        take: 1,
                        orderBy: { matchConfidence: 'desc' },
                    },
                },
                orderBy: { lastSeenAt: 'desc' },
                take: 20,
            }),
            this.prisma.visitorIdentity.findMany({
                where: { merchantId, engagementScore: { gt: 0 } },
                include: {
                    fingerprint: { select: { platform: true, lastSeenAt: true, visitCount: true } },
                    companyUser: { select: { email: true, firstName: true, lastName: true } },
                    company: { select: { name: true } },
                },
                orderBy: { engagementScore: 'desc' },
                take: 20,
            }),
        ]);
        const identificationRate = totalVisitors > 0
            ? ((identifiedVisitors / totalVisitors) * 100).toFixed(1)
            : 0;
        return {
            stats: {
                totalVisitors,
                returningVisitors,
                identifiedVisitors,
                botCount,
                identificationRate,
            },
            intentDistribution: intentDistribution.map(d => ({
                intent: d.buyerIntent,
                count: d._count.id,
            })),
            segmentDistribution: segmentDistribution.map(d => ({
                segment: d.segment,
                count: d._count.id,
            })),
            recentVisitors: recentVisitors.map(v => ({
                id: v.id,
                fingerprintHash: v.fingerprintHash.substring(0, 12) + '...',
                platform: v.platform,
                visitCount: v.visitCount,
                lastSeenAt: v.lastSeenAt,
                firstSeenAt: v.firstSeenAt,
                isIdentified: v.identities.length > 0 && v.identities[0].companyUserId !== null,
                identity: v.identities[0] ? {
                    email: v.identities[0].companyUser?.email,
                    name: v.identities[0].companyUser
                        ? `${v.identities[0].companyUser.firstName || ''} ${v.identities[0].companyUser.lastName || ''}`.trim()
                        : null,
                    company: v.identities[0].company?.name,
                    buyerIntent: v.identities[0].buyerIntent,
                    engagementScore: v.identities[0].engagementScore,
                } : null,
            })),
            topEngaged: topEngaged.map(e => ({
                id: e.id,
                email: e.companyUser?.email || e.email,
                name: e.companyUser
                    ? `${e.companyUser.firstName || ''} ${e.companyUser.lastName || ''}`.trim()
                    : null,
                company: e.company?.name,
                buyerIntent: e.buyerIntent,
                segment: e.segment,
                engagementScore: e.engagementScore,
                totalPageViews: e.totalPageViews,
                totalProductViews: e.totalProductViews,
                totalAddToCarts: e.totalAddToCarts,
                totalOrders: e.totalOrders,
                totalRevenue: Number(e.totalRevenue),
                platform: e.fingerprint?.platform,
                visitCount: e.fingerprint?.visitCount,
                lastSeenAt: e.fingerprint?.lastSeenAt,
            })),
        };
    }
    async getHotLeads(merchantId) {
        const leads = await this.prisma.visitorIdentity.findMany({
            where: {
                merchantId,
                buyerIntent: { in: ['hot', 'warm'] },
                totalOrders: 0,
            },
            include: {
                fingerprint: {
                    select: { platform: true, lastSeenAt: true, visitCount: true, timezone: true },
                },
                companyUser: { select: { email: true, firstName: true, lastName: true } },
                company: { select: { name: true } },
            },
            orderBy: { engagementScore: 'desc' },
            take: 50,
        });
        return {
            leads: leads.map(l => ({
                id: l.id,
                email: l.companyUser?.email || l.email,
                name: l.companyUser
                    ? `${l.companyUser.firstName || ''} ${l.companyUser.lastName || ''}`.trim()
                    : null,
                company: l.company?.name,
                buyerIntent: l.buyerIntent,
                engagementScore: l.engagementScore,
                totalProductViews: l.totalProductViews,
                totalAddToCarts: l.totalAddToCarts,
                lastProductViewed: l.lastProductViewed,
                platform: l.fingerprint?.platform,
                timezone: l.fingerprint?.timezone,
                visitCount: l.fingerprint?.visitCount,
                lastSeenAt: l.fingerprint?.lastSeenAt,
            })),
            total: leads.length,
        };
    }
    async getCompanyIntelligence(merchantId, companyId) {
        if (companyId) {
            const intel = await this.prisma.companyIntelligence.findUnique({
                where: { companyId },
                include: {
                    company: { select: { name: true, email: true, status: true } },
                },
            });
            return intel;
        }
        return this.prisma.companyIntelligence.findMany({
            where: { merchantId },
            include: {
                company: { select: { name: true, email: true, status: true } },
            },
            orderBy: { engagementScore: 'desc' },
            take: 50,
        });
    }
    async getSessionHistory(merchantId, filters) {
        const where = { merchantId };
        if (filters.companyId)
            where.companyId = filters.companyId;
        if (filters.companyUserId)
            where.companyUserId = filters.companyUserId;
        if (filters.fingerprintId)
            where.fingerprintId = filters.fingerprintId;
        const sessions = await this.prisma.visitorSession.findMany({
            where,
            include: {
                companyUser: { select: { email: true, firstName: true, lastName: true } },
                company: { select: { name: true } },
                events: {
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                },
            },
            orderBy: { startedAt: 'desc' },
            take: filters.limit || 20,
        });
        return sessions;
    }
    activePresence = new Map();
    mouseData = new Map();
    async processHeartbeat(merchantId, data) {
        const key = `${merchantId}:${data.sessionId}`;
        if (data.status === 'offline') {
            this.activePresence.delete(key);
            return;
        }
        let companyId;
        let companyName;
        let companyUserId;
        let userName;
        let userEmail;
        let platform;
        try {
            if (data.fingerprintHash) {
                const identity = await this.prisma.visitorIdentity.findFirst({
                    where: { merchantId, fingerprint: { fingerprintHash: data.fingerprintHash } },
                    include: {
                        companyUser: { include: { company: true } },
                        fingerprint: { select: { platform: true } },
                    },
                    orderBy: { updatedAt: 'desc' },
                });
                if (identity) {
                    companyUserId = identity.companyUserId || undefined;
                    companyId = identity.companyId || identity.companyUser?.companyId || undefined;
                    companyName = identity.companyUser?.company?.name || undefined;
                    userName = identity.companyUser ? `${identity.companyUser.firstName} ${identity.companyUser.lastName}` : undefined;
                    userEmail = identity.email || identity.companyUser?.email || undefined;
                    platform = identity.fingerprint?.platform || undefined;
                }
            }
        }
        catch { }
        this.activePresence.set(key, {
            merchantId,
            sessionId: data.sessionId,
            fingerprintHash: data.fingerprintHash,
            status: data.status,
            companyId,
            companyName,
            companyUserId,
            userName,
            userEmail,
            page: data.page || {},
            viewport: data.viewport || {},
            platform,
            lastSeen: Date.now(),
        });
        try {
            await this.prisma.visitorSession.updateMany({
                where: { merchantId, sessionId: data.sessionId },
                data: {
                    lastActivityAt: new Date(),
                    exitPage: data.page?.path,
                },
            });
        }
        catch { }
        const now = Date.now();
        for (const [k, v] of this.activePresence.entries()) {
            if (now - v.lastSeen > 60000) {
                this.activePresence.delete(k);
            }
        }
    }
    async processMouseData(merchantId, data) {
        const key = `${merchantId}:${data.sessionId}`;
        const eventTypes = data.events.map((e) => e.type);
        const typeCounts = {};
        eventTypes.forEach((t) => { typeCounts[t] = (typeCounts[t] || 0) + 1; });
        console.log(`[rrweb] processMouseData key=${key} events=${data.events.length} types=${JSON.stringify(typeCounts)} payloadSize=${JSON.stringify(data).length}`);
        if (!this.mouseData.has(key)) {
            this.mouseData.set(key, []);
        }
        const batches = this.mouseData.get(key);
        batches.push({
            pageUrl: data.pageUrl,
            viewport: data.viewport,
            events: data.events,
            timestamp: Date.now(),
        });
        const cutoff = Date.now() - 900000;
        const filtered = batches.filter(b => b.timestamp > cutoff);
        this.mouseData.set(key, filtered);
        console.log(`[rrweb] After save: key=${key} totalBatches=${filtered.length} totalEvents=${filtered.reduce((s, b) => s + b.events.length, 0)}`);
        if (filtered.length === 0) {
            this.mouseData.delete(key);
        }
    }
    async getActiveVisitors(merchantId) {
        const now = Date.now();
        const active = [];
        for (const [, presence] of this.activePresence.entries()) {
            if (presence.merchantId !== merchantId)
                continue;
            if (now - presence.lastSeen > 60000)
                continue;
            active.push({
                sessionId: presence.sessionId,
                status: presence.status,
                companyId: presence.companyId,
                companyName: presence.companyName,
                companyUserId: presence.companyUserId,
                userName: presence.userName,
                userEmail: presence.userEmail,
                platform: presence.platform,
                currentPage: presence.page,
                viewport: presence.viewport,
                isIdentified: !!(presence.companyUserId || presence.userEmail),
                lastSeen: new Date(presence.lastSeen),
                secondsAgo: Math.round((now - presence.lastSeen) / 1000),
            });
        }
        active.sort((a, b) => {
            if (a.isIdentified && !b.isIdentified)
                return -1;
            if (!a.isIdentified && b.isIdentified)
                return 1;
            return b.lastSeen - a.lastSeen;
        });
        const totalOnline = active.filter(a => a.status === 'online').length;
        const totalAway = active.filter(a => a.status === 'away').length;
        const identifiedCount = active.filter(a => a.isIdentified).length;
        const companies = [...new Set(active.filter(a => a.companyId).map(a => a.companyId))];
        return {
            totalOnline,
            totalAway,
            totalVisitors: active.length,
            identifiedCount,
            activeCompanyCount: companies.length,
            visitors: active,
        };
    }
    async getSessionReplay(merchantId, sessionId) {
        const key = `${merchantId}:${sessionId}`;
        const batches = this.mouseData.get(key) || [];
        const session = await this.prisma.visitorSession.findFirst({
            where: { merchantId, sessionId },
            include: {
                companyUser: true,
                company: true,
                fingerprint: { select: { platform: true, userAgent: true } },
            },
        });
        const allEvents = [];
        for (const batch of batches) {
            for (const event of batch.events) {
                allEvents.push(event);
            }
        }
        allEvents.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        const typeCounts = {};
        allEvents.forEach((e) => { typeCounts[e.type] = (typeCounts[e.type] || 0) + 1; });
        console.log(`[rrweb] getSessionReplay key=${key} batches=${batches.length} totalEvents=${allEvents.length} types=${JSON.stringify(typeCounts)}`);
        const durationMs = allEvents.length > 1
            ? (allEvents[allEvents.length - 1].timestamp || 0) - (allEvents[0].timestamp || 0)
            : 0;
        return {
            session: session ? {
                id: session.id,
                sessionId: session.sessionId,
                companyName: session.company?.name,
                userName: session.companyUser ? `${session.companyUser.firstName} ${session.companyUser.lastName}` : 'Anonymous',
                platform: session.fingerprint?.platform,
                userAgent: session.fingerprint?.userAgent,
                startedAt: session.startedAt,
                pageViews: session.pageViews,
            } : null,
            events: allEvents,
            totalEvents: allEvents.length,
            durationMs,
        };
    }
    async processAttribution(merchantId, data) {
        try {
            const currentTouch = data.currentTouch;
            const firstTouch = data.firstTouch;
            if (!currentTouch?.channel)
                return;
            const fingerprintHash = data.fingerprintHash;
            if (!fingerprintHash)
                return;
            const fingerprint = await this.prisma.visitorFingerprint.findFirst({
                where: { merchantId, fingerprintHash },
            });
            if (!fingerprint)
                return;
            const existingTouches = await this.prisma.trafficAttribution.count({
                where: { merchantId, fingerprintId: fingerprint.id },
            });
            const touchNumber = existingTouches + 1;
            const isFirstTouch = touchNumber === 1;
            if (existingTouches > 0) {
                await this.prisma.trafficAttribution.updateMany({
                    where: { merchantId, fingerprintId: fingerprint.id, isLastTouch: true },
                    data: { isLastTouch: false },
                });
            }
            await this.prisma.trafficAttribution.create({
                data: {
                    merchantId,
                    fingerprintId: fingerprint.id,
                    sessionId: data.sessionId,
                    touchNumber,
                    isFirstTouch,
                    isLastTouch: true,
                    channel: currentTouch.channel,
                    utmSource: currentTouch.utmSource || null,
                    utmMedium: currentTouch.utmMedium || null,
                    utmCampaign: currentTouch.utmCampaign || null,
                    utmContent: currentTouch.utmContent || null,
                    utmTerm: currentTouch.utmTerm || null,
                    gclid: currentTouch.gclid || null,
                    fbclid: currentTouch.fbclid || null,
                    ttclid: currentTouch.ttclid || null,
                    msclkid: currentTouch.msclkid || null,
                    referrer: currentTouch.referrer || null,
                    referrerDomain: currentTouch.referrerDomain || null,
                    landingPage: currentTouch.landingPage || null,
                },
            });
            this.logger.debug(`Attribution recorded: ${currentTouch.channel} (touch #${touchNumber}) for ${fingerprintHash}`);
        }
        catch (error) {
            this.logger.debug(`Attribution error: ${error}`);
        }
    }
    async getTrafficAnalytics(merchantId, filters) {
        const where = { merchantId };
        if (filters.startDate || filters.endDate) {
            where.createdAt = {};
            if (filters.startDate)
                where.createdAt.gte = filters.startDate;
            if (filters.endDate)
                where.createdAt.lte = filters.endDate;
        }
        const sessionWhere = { merchantId, isBot: false };
        if (filters.startDate || filters.endDate) {
            sessionWhere.startedAt = {};
            if (filters.startDate)
                sessionWhere.startedAt.gte = filters.startDate;
            if (filters.endDate)
                sessionWhere.startedAt.lte = filters.endDate;
        }
        if (filters.channel)
            sessionWhere.trafficChannel = filters.channel;
        if (filters.utmSource)
            sessionWhere.utmSource = filters.utmSource;
        if (filters.utmCampaign)
            sessionWhere.utmCampaign = filters.utmCampaign;
        const channelBreakdown = await this.prisma.visitorSession.groupBy({
            by: ['trafficChannel'],
            where: sessionWhere,
            _count: { id: true },
            _avg: { durationSeconds: true, pageViews: true },
            _sum: { addToCarts: true, productViews: true },
            orderBy: { _count: { id: 'desc' } },
        });
        const campaignPerformance = await this.prisma.visitorSession.groupBy({
            by: ['utmCampaign', 'utmSource', 'utmMedium', 'trafficChannel'],
            where: { ...sessionWhere, utmCampaign: { not: null } },
            _count: { id: true },
            _avg: { durationSeconds: true, pageViews: true },
            _sum: { addToCarts: true, productViews: true },
            orderBy: { _count: { id: 'desc' } },
            take: 50,
        });
        const totalSessions = await this.prisma.visitorSession.count({ where: sessionWhere });
        const uniqueFingerprints = await this.prisma.visitorSession.groupBy({
            by: ['fingerprintId'],
            where: sessionWhere,
        });
        const avgMetrics = await this.prisma.visitorSession.aggregate({
            where: sessionWhere,
            _avg: { durationSeconds: true, pageViews: true, productViews: true },
            _sum: { addToCarts: true, productViews: true, pageViews: true },
        });
        const funnelByChannel = await this.prisma.$queryRawUnsafe(`
      SELECT
        traffic_channel as channel,
        COUNT(DISTINCT id) as sessions,
        COUNT(DISTINCT fingerprint_id) as unique_visitors,
        SUM(page_views) as total_page_views,
        SUM(product_views) as total_product_views,
        SUM(add_to_carts) as total_add_to_carts,
        AVG(duration_seconds) as avg_duration,
        AVG(page_views) as avg_pages_per_session
      FROM visitor_sessions
      WHERE merchant_id = $1
        AND is_bot = false
        ${filters.startDate ? `AND started_at >= $2` : ''}
        ${filters.endDate ? `AND started_at <= $3` : ''}
      GROUP BY traffic_channel
      ORDER BY sessions DESC
    `, merchantId, ...(filters.startDate ? [filters.startDate] : []), ...(filters.endDate ? [filters.endDate] : []));
        const topLandingPages = await this.prisma.visitorSession.groupBy({
            by: ['landingPage'],
            where: { ...sessionWhere, landingPage: { not: null } },
            _count: { id: true },
            _avg: { durationSeconds: true, pageViews: true },
            _sum: { addToCarts: true },
            orderBy: { _count: { id: 'desc' } },
            take: 20,
        });
        const attributionPaths = await this.prisma.$queryRawUnsafe(`
      SELECT
        fingerprint_id,
        json_agg(
          json_build_object(
            'touchNumber', touch_number,
            'channel', channel,
            'utmSource', utm_source,
            'utmCampaign', utm_campaign,
            'landingPage', landing_page,
            'createdAt', created_at
          ) ORDER BY touch_number
        ) as journey,
        COUNT(*) as touch_count,
        bool_or(has_conversion) as has_conversion
      FROM traffic_attributions
      WHERE merchant_id = $1
        ${filters.startDate ? `AND created_at >= $2` : ''}
        ${filters.endDate ? `AND created_at <= $3` : ''}
      GROUP BY fingerprint_id
      HAVING COUNT(*) > 1
      ORDER BY touch_count DESC
      LIMIT 50
    `, merchantId, ...(filters.startDate ? [filters.startDate] : []), ...(filters.endDate ? [filters.endDate] : []));
        const referrerDomains = await this.prisma.visitorSession.groupBy({
            by: ['referrerDomain'],
            where: { ...sessionWhere, referrerDomain: { not: null } },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 20,
        });
        const dailyTrend = await this.prisma.$queryRawUnsafe(`
      SELECT
        DATE(started_at) as date,
        traffic_channel as channel,
        COUNT(*) as sessions,
        COUNT(DISTINCT fingerprint_id) as unique_visitors,
        SUM(page_views) as page_views,
        SUM(add_to_carts) as add_to_carts
      FROM visitor_sessions
      WHERE merchant_id = $1
        AND is_bot = false
        ${filters.startDate ? `AND started_at >= $2` : ''}
        ${filters.endDate ? `AND started_at <= $3` : ''}
      GROUP BY DATE(started_at), traffic_channel
      ORDER BY date DESC
      LIMIT 500
    `, merchantId, ...(filters.startDate ? [filters.startDate] : []), ...(filters.endDate ? [filters.endDate] : []));
        return {
            summary: {
                totalSessions,
                uniqueVisitors: uniqueFingerprints.length,
                avgDuration: Math.round(avgMetrics._avg?.durationSeconds || 0),
                avgPagesPerSession: Math.round((avgMetrics._avg?.pageViews || 0) * 10) / 10,
                totalPageViews: avgMetrics._sum?.pageViews || 0,
                totalProductViews: avgMetrics._sum?.productViews || 0,
                totalAddToCarts: avgMetrics._sum?.addToCarts || 0,
            },
            channelBreakdown: channelBreakdown.map(c => ({
                channel: c.trafficChannel || 'unknown',
                sessions: c._count.id,
                avgDuration: Math.round(c._avg?.durationSeconds || 0),
                avgPages: Math.round((c._avg?.pageViews || 0) * 10) / 10,
                addToCarts: c._sum?.addToCarts || 0,
                productViews: c._sum?.productViews || 0,
            })),
            campaignPerformance: campaignPerformance.map(c => ({
                campaign: c.utmCampaign,
                source: c.utmSource,
                medium: c.utmMedium,
                channel: c.trafficChannel,
                sessions: c._count.id,
                avgDuration: Math.round(c._avg?.durationSeconds || 0),
                avgPages: Math.round((c._avg?.pageViews || 0) * 10) / 10,
                addToCarts: c._sum?.addToCarts || 0,
                productViews: c._sum?.productViews || 0,
            })),
            funnelByChannel,
            topLandingPages: topLandingPages.map(l => ({
                page: l.landingPage,
                sessions: l._count.id,
                avgDuration: Math.round(l._avg?.durationSeconds || 0),
                avgPages: Math.round((l._avg?.pageViews || 0) * 10) / 10,
                addToCarts: l._sum?.addToCarts || 0,
            })),
            attributionPaths,
            referrerDomains: referrerDomains.map(r => ({
                domain: r.referrerDomain,
                sessions: r._count.id,
            })),
            dailyTrend,
        };
    }
    calculateBotScore(dto) {
        let score = 0;
        let signals = 0;
        if (!dto.canvasHash) {
            score += 0.3;
            signals++;
        }
        if (!dto.webglHash) {
            score += 0.2;
            signals++;
        }
        if (!dto.audioHash) {
            score += 0.1;
            signals++;
        }
        if (!dto.timezone) {
            score += 0.1;
            signals++;
        }
        if (dto.hardwareConcurrency === 0) {
            score += 0.2;
            signals++;
        }
        if (dto.userAgent?.includes('HeadlessChrome')) {
            score += 0.8;
            signals++;
        }
        if (dto.userAgent?.includes('PhantomJS')) {
            score += 0.9;
            signals++;
        }
        if (dto.platform === '' || !dto.platform) {
            score += 0.2;
            signals++;
        }
        if (dto.screenWidth === 0 || dto.screenHeight === 0) {
            score += 0.3;
            signals++;
        }
        return signals > 0 ? Math.min(1, score / signals) : 0;
    }
    calculateConfidence(dto) {
        let score = 0;
        if (dto.canvasHash)
            score += 0.25;
        if (dto.webglHash)
            score += 0.20;
        if (dto.audioHash)
            score += 0.15;
        if (dto.timezone)
            score += 0.10;
        if (dto.gpuVendor)
            score += 0.10;
        if (dto.hardwareConcurrency)
            score += 0.05;
        if (dto.deviceMemory)
            score += 0.05;
        if (dto.language)
            score += 0.05;
        if (dto.platform)
            score += 0.05;
        return Math.min(1, score);
    }
    determineMatchType(dto) {
        if (dto.eagleToken)
            return 'login';
        if (dto.email)
            return 'email';
        if (dto.shopifyCustomerId)
            return 'shopify_session';
        return 'fingerprint';
    }
    calculateMatchConfidence(matchType, dto) {
        switch (matchType) {
            case 'login': return 1.0;
            case 'email': return 0.95;
            case 'shopify_session': return 0.90;
            case 'fingerprint': return dto.canvasHash && dto.webglHash ? 0.75 : 0.50;
            default: return 0.30;
        }
    }
};
exports.FingerprintService = FingerprintService;
exports.FingerprintService = FingerprintService = FingerprintService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FingerprintService);
//# sourceMappingURL=fingerprint.service.js.map