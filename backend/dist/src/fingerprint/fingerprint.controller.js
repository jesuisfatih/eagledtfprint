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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FingerprintController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const public_decorator_1 = require("../auth/decorators/public.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const prisma_service_1 = require("../prisma/prisma.service");
const collect_fingerprint_dto_1 = require("./dto/collect-fingerprint.dto");
const fingerprint_service_1 = require("./fingerprint.service");
let FingerprintController = class FingerprintController {
    fingerprintService;
    prisma;
    constructor(fingerprintService, prisma) {
        this.fingerprintService = fingerprintService;
        this.prisma = prisma;
    }
    async collect(dto, req) {
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
        return this.fingerprintService.collectFingerprint(dto, ip);
    }
    async trackEvent(req) {
        const body = req.body;
        if (!body.shop || !body.sessionId || !body.eventType) {
            return { success: false, error: 'Missing required fields' };
        }
        const merchant = await this.prisma.merchant.findUnique({
            where: { shopDomain: body.shop },
        });
        if (!merchant)
            return { success: false, error: 'Unknown shop' };
        await this.fingerprintService.trackEvent(merchant.id, body.sessionId, body.payload?.fingerprintHash || body.fingerprintHash || '', body.eventType, body.payload || {});
        return { success: true };
    }
    async heartbeat(req) {
        const body = req.body;
        if (!body.shop || !body.sessionId) {
            return { success: false };
        }
        const merchant = await this.prisma.merchant.findUnique({
            where: { shopDomain: body.shop },
        });
        if (!merchant)
            return { success: false };
        await this.fingerprintService.processHeartbeat(merchant.id, {
            sessionId: body.sessionId,
            fingerprintHash: body.fingerprintHash,
            shopifyCustomerId: body.shopifyCustomerId ? BigInt(body.shopifyCustomerId) : undefined,
            eagleToken: body.eagleToken,
            status: body.status || 'online',
            timestamp: body.timestamp,
            page: body.page,
            viewport: body.viewport,
        });
        return { success: true };
    }
    async mouseTracking(req) {
        const body = req.body;
        if (!body.shop || !body.sessionId || !body.events?.length) {
            return { success: false };
        }
        const merchant = await this.prisma.merchant.findUnique({
            where: { shopDomain: body.shop },
        });
        if (!merchant)
            return { success: false };
        await this.fingerprintService.processMouseData(merchant.id, {
            sessionId: body.sessionId,
            fingerprintHash: body.fingerprintHash,
            viewport: body.viewport,
            pageUrl: body.pageUrl,
            events: body.events,
        });
        return { success: true };
    }
    async trackAttribution(req) {
        const body = req.body;
        if (!body.shop || !body.sessionId) {
            return { success: false, error: 'Missing required fields' };
        }
        const merchant = await this.prisma.merchant.findUnique({
            where: { shopDomain: body.shop },
        });
        if (!merchant)
            return { success: false, error: 'Unknown shop' };
        await this.fingerprintService.processAttribution(merchant.id, body);
        return { success: true };
    }
    async getDashboard(merchantId) {
        return this.fingerprintService.getDashboard(merchantId);
    }
    async getHotLeads(merchantId) {
        return this.fingerprintService.getHotLeads(merchantId);
    }
    async getCompanyIntelligence(merchantId, companyId) {
        return this.fingerprintService.getCompanyIntelligence(merchantId, companyId);
    }
    async getSessionHistory(merchantId, companyId, companyUserId, fingerprintId, limit) {
        return this.fingerprintService.getSessionHistory(merchantId, {
            companyId,
            companyUserId,
            fingerprintId,
            limit: (() => { const n = limit ? parseInt(limit, 10) : undefined; return n !== undefined && Number.isFinite(n) ? n : undefined; })(),
        });
    }
    async getActiveVisitors(merchantId) {
        return this.fingerprintService.getActiveVisitors(merchantId);
    }
    async getSessionReplay(merchantId, sessionId) {
        return this.fingerprintService.getSessionReplay(merchantId, sessionId);
    }
    async getTrafficAnalytics(merchantId, startDate, endDate, channel, utmSource, utmCampaign) {
        return this.fingerprintService.getTrafficAnalytics(merchantId, {
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            channel,
            utmSource,
            utmCampaign,
        });
    }
};
exports.FingerprintController = FingerprintController;
__decorate([
    (0, common_1.Post)('collect'),
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ short: { limit: 30, ttl: 1000 }, medium: { limit: 100, ttl: 10000 } }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [collect_fingerprint_dto_1.CollectFingerprintDto, Object]),
    __metadata("design:returntype", Promise)
], FingerprintController.prototype, "collect", null);
__decorate([
    (0, common_1.Post)('event'),
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ short: { limit: 50, ttl: 1000 }, medium: { limit: 200, ttl: 10000 } }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FingerprintController.prototype, "trackEvent", null);
__decorate([
    (0, common_1.Post)('heartbeat'),
    (0, public_decorator_1.Public)(),
    (0, throttler_1.SkipThrottle)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FingerprintController.prototype, "heartbeat", null);
__decorate([
    (0, common_1.Post)('mouse'),
    (0, public_decorator_1.Public)(),
    (0, throttler_1.SkipThrottle)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FingerprintController.prototype, "mouseTracking", null);
__decorate([
    (0, common_1.Post)('attribution'),
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ short: { limit: 30, ttl: 1000 }, medium: { limit: 100, ttl: 10000 } }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FingerprintController.prototype, "trackAttribution", null);
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FingerprintController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('hot-leads'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FingerprintController.prototype, "getHotLeads", null);
__decorate([
    (0, common_1.Get)('company-intelligence'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], FingerprintController.prototype, "getCompanyIntelligence", null);
__decorate([
    (0, common_1.Get)('sessions'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Query)('companyId')),
    __param(2, (0, common_1.Query)('companyUserId')),
    __param(3, (0, common_1.Query)('fingerprintId')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], FingerprintController.prototype, "getSessionHistory", null);
__decorate([
    (0, common_1.Get)('active-visitors'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FingerprintController.prototype, "getActiveVisitors", null);
__decorate([
    (0, common_1.Get)('replay'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Query)('sessionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], FingerprintController.prototype, "getSessionReplay", null);
__decorate([
    (0, common_1.Get)('traffic-analytics'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __param(3, (0, common_1.Query)('channel')),
    __param(4, (0, common_1.Query)('utmSource')),
    __param(5, (0, common_1.Query)('utmCampaign')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], FingerprintController.prototype, "getTrafficAnalytics", null);
exports.FingerprintController = FingerprintController = __decorate([
    (0, common_1.Controller)('fingerprint'),
    __metadata("design:paramtypes", [fingerprint_service_1.FingerprintService,
        prisma_service_1.PrismaService])
], FingerprintController);
//# sourceMappingURL=fingerprint.controller.js.map