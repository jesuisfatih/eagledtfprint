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
exports.DittofeedController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const public_decorator_1 = require("../auth/decorators/public.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const prisma_service_1 = require("../prisma/prisma.service");
const cross_sell_service_1 = require("./cross-sell.service");
const dittofeed_admin_service_1 = require("./dittofeed-admin.service");
const dittofeed_db_reader_service_1 = require("./dittofeed-db-reader.service");
const dittofeed_service_1 = require("./dittofeed.service");
let DittofeedController = class DittofeedController {
    dittofeedService;
    prisma;
    adminService;
    crossSellService;
    dbReader;
    constructor(dittofeedService, prisma, adminService, crossSellService, dbReader) {
        this.dittofeedService = dittofeedService;
        this.prisma = prisma;
        this.adminService = adminService;
        this.crossSellService = crossSellService;
        this.dbReader = dbReader;
    }
    async syncCompanies(merchantId) {
        const result = await this.dittofeedService.syncAllCompanies(merchantId);
        return { success: true, ...result };
    }
    async syncIntelligence(merchantId) {
        const result = await this.dittofeedService.syncCompanyIntelligence(merchantId);
        return { success: true, ...result };
    }
    async syncOrders(merchantId, hours) {
        const result = await this.dittofeedService.syncOrders(merchantId, Number(hours) || 24);
        return { success: true, ...result };
    }
    async syncEvents(merchantId, hours) {
        const result = await this.dittofeedService.syncVisitorEvents(merchantId, Number(hours) || 24);
        return { success: true, ...result };
    }
    async syncInsights(merchantId) {
        const result = await this.dittofeedService.syncCustomerInsights(merchantId);
        return { success: true, ...result };
    }
    async syncDtfTraits(merchantId) {
        const result = await this.dittofeedService.syncDtfProductTraits(merchantId);
        return { success: true, ...result };
    }
    async syncPickupTraits(merchantId) {
        const result = await this.dittofeedService.syncPickupTraits(merchantId);
        return { success: true, ...result };
    }
    async syncAll(merchantId) {
        const companies = await this.dittofeedService.syncAllCompanies(merchantId);
        const intelligence = await this.dittofeedService.syncCompanyIntelligence(merchantId);
        const orders = await this.dittofeedService.syncOrders(merchantId, 720);
        const events = await this.dittofeedService.syncVisitorEvents(merchantId, 720);
        const insights = await this.dittofeedService.syncCustomerInsights(merchantId);
        const dtfTraits = await this.dittofeedService.syncDtfProductTraits(merchantId);
        const pickupTraits = await this.dittofeedService.syncPickupTraits(merchantId);
        return {
            success: true,
            companies: companies.synced,
            intelligence: intelligence.synced,
            orders: orders.synced,
            events: events.synced,
            insights: insights.synced,
            dtfTraits: dtfTraits.synced,
            pickupTraits: pickupTraits.synced,
        };
    }
    async webhookCallback(body) {
        return this.dittofeedService.handleWebhookCallback(body);
    }
    getDashboardUrl() {
        const publicUrl = process.env.DITTOFEED_PUBLIC_URL || 'https://marketing.techifyboost.com';
        return { url: publicUrl };
    }
    async getSyncStatus(merchantId) {
        const lastSync = await this.getLastSyncTime(merchantId);
        const traitCounts = await this.getTraitSyncCounts(merchantId);
        return {
            success: true,
            lastSyncAt: lastSync,
            counts: traitCounts,
        };
    }
    async setupSegments() {
        return this.adminService.setupAllSegments();
    }
    async listSegments() {
        return this.adminService.listSegments();
    }
    getSegmentTemplates() {
        return this.adminService.getAvailableSegmentTemplates();
    }
    async createCustomSegment(body) {
        return this.adminService.createCustomSegment(body.name, body.conditions, body.logic);
    }
    async listJourneys() {
        return this.adminService.listJourneys();
    }
    async adminHealth() {
        return this.adminService.healthCheck();
    }
    async analyzeCrossSell(merchantId) {
        return this.crossSellService.analyzeMerchantCrossSell(merchantId);
    }
    async checkSupplyReorders(merchantId) {
        return this.crossSellService.checkMerchantSupplyReorders(merchantId);
    }
    async getRecommendations(userId) {
        return this.crossSellService.getRecommendationsForUser(userId);
    }
    async setupJourneys() {
        return this.adminService.setupAllJourneys();
    }
    getJourneyTemplates() {
        return this.adminService.getAvailableJourneyTemplates();
    }
    async setupTemplates() {
        return this.adminService.setupAllEmailTemplates();
    }
    getEmailTemplates() {
        return this.adminService.getAvailableEmailTemplates();
    }
    async setupFullStore() {
        return this.adminService.setupFullStore();
    }
    async getFullAnalytics(days) {
        const parsedDays = days ? parseInt(days, 10) : 30;
        return this.dbReader.getFullAnalytics(Number.isFinite(parsedDays) ? parsedDays : 30);
    }
    async getCampaignMetrics(days) {
        const parsedDays = days ? parseInt(days, 10) : 30;
        return this.dbReader.getCampaignMetrics(Number.isFinite(parsedDays) ? parsedDays : 30);
    }
    async getJourneyMetrics() {
        return this.dbReader.getJourneyMetrics();
    }
    async getMessagePerformance(days) {
        const parsedDays = days ? parseInt(days, 10) : 30;
        return this.dbReader.getMessagePerformance(Number.isFinite(parsedDays) ? parsedDays : 30);
    }
    async getSegmentCounts() {
        return this.dbReader.getSegmentCounts();
    }
    async getDailyTrends(days) {
        const parsedDays = days ? parseInt(days, 10) : 14;
        return this.dbReader.getDailyTrends(Number.isFinite(parsedDays) ? parsedDays : 14);
    }
    async dbHealth() {
        return this.dbReader.healthCheck();
    }
    async getLastSyncTime(merchantId) {
        const lastSync = await this.prisma.marketingSync.findFirst({
            where: { merchantId, syncStatus: 'synced' },
            orderBy: { lastSyncedAt: 'desc' },
            select: { lastSyncedAt: true },
        });
        return lastSync?.lastSyncedAt?.toISOString() || null;
    }
    async getTraitSyncCounts(merchantId) {
        const [companySyncs, customerSyncs, orderSyncs] = await Promise.all([
            this.prisma.marketingSync.count({
                where: { merchantId, entityType: 'company', syncStatus: 'synced' },
            }),
            this.prisma.marketingSync.count({
                where: { merchantId, entityType: 'user', syncStatus: 'synced' },
            }),
            this.prisma.marketingSync.count({
                where: { merchantId, entityType: 'order', syncStatus: 'synced' },
            }),
        ]);
        return {
            companies: companySyncs,
            customers: customerSyncs,
            orders: orderSyncs,
        };
    }
};
exports.DittofeedController = DittofeedController;
__decorate([
    (0, common_1.Post)('sync/companies'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DittofeedController.prototype, "syncCompanies", null);
__decorate([
    (0, common_1.Post)('sync/intelligence'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DittofeedController.prototype, "syncIntelligence", null);
__decorate([
    (0, common_1.Post)('sync/orders'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Query)('hours')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DittofeedController.prototype, "syncOrders", null);
__decorate([
    (0, common_1.Post)('sync/events'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Query)('hours')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DittofeedController.prototype, "syncEvents", null);
__decorate([
    (0, common_1.Post)('sync/insights'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DittofeedController.prototype, "syncInsights", null);
__decorate([
    (0, common_1.Post)('sync/dtf-traits'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DittofeedController.prototype, "syncDtfTraits", null);
__decorate([
    (0, common_1.Post)('sync/pickup-traits'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DittofeedController.prototype, "syncPickupTraits", null);
__decorate([
    (0, common_1.Post)('sync/all'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DittofeedController.prototype, "syncAll", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('webhook/callback'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DittofeedController.prototype, "webhookCallback", null);
__decorate([
    (0, common_1.Get)('dashboard-url'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DittofeedController.prototype, "getDashboardUrl", null);
__decorate([
    (0, common_1.Get)('sync/status'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DittofeedController.prototype, "getSyncStatus", null);
__decorate([
    (0, common_1.Post)('admin/segments/setup'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DittofeedController.prototype, "setupSegments", null);
__decorate([
    (0, common_1.Get)('admin/segments'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DittofeedController.prototype, "listSegments", null);
__decorate([
    (0, common_1.Get)('admin/segment-templates'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DittofeedController.prototype, "getSegmentTemplates", null);
__decorate([
    (0, common_1.Post)('admin/segments/custom'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DittofeedController.prototype, "createCustomSegment", null);
__decorate([
    (0, common_1.Get)('admin/journeys'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DittofeedController.prototype, "listJourneys", null);
__decorate([
    (0, common_1.Get)('admin/health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DittofeedController.prototype, "adminHealth", null);
__decorate([
    (0, common_1.Post)('cross-sell/analyze'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DittofeedController.prototype, "analyzeCrossSell", null);
__decorate([
    (0, common_1.Post)('cross-sell/supply-check'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DittofeedController.prototype, "checkSupplyReorders", null);
__decorate([
    (0, common_1.Get)('cross-sell/recommendations/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DittofeedController.prototype, "getRecommendations", null);
__decorate([
    (0, common_1.Post)('admin/journeys/setup'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DittofeedController.prototype, "setupJourneys", null);
__decorate([
    (0, common_1.Get)('admin/journey-templates'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DittofeedController.prototype, "getJourneyTemplates", null);
__decorate([
    (0, common_1.Post)('admin/templates/setup'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DittofeedController.prototype, "setupTemplates", null);
__decorate([
    (0, common_1.Get)('admin/email-templates'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DittofeedController.prototype, "getEmailTemplates", null);
__decorate([
    (0, common_1.Post)('admin/setup-full'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DittofeedController.prototype, "setupFullStore", null);
__decorate([
    (0, common_1.Get)('analytics/full'),
    __param(0, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DittofeedController.prototype, "getFullAnalytics", null);
__decorate([
    (0, common_1.Get)('analytics/campaign'),
    __param(0, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DittofeedController.prototype, "getCampaignMetrics", null);
__decorate([
    (0, common_1.Get)('analytics/journeys'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DittofeedController.prototype, "getJourneyMetrics", null);
__decorate([
    (0, common_1.Get)('analytics/messages'),
    __param(0, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DittofeedController.prototype, "getMessagePerformance", null);
__decorate([
    (0, common_1.Get)('analytics/segments'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DittofeedController.prototype, "getSegmentCounts", null);
__decorate([
    (0, common_1.Get)('analytics/trends'),
    __param(0, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DittofeedController.prototype, "getDailyTrends", null);
__decorate([
    (0, common_1.Get)('analytics/health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DittofeedController.prototype, "dbHealth", null);
exports.DittofeedController = DittofeedController = __decorate([
    (0, common_1.Controller)('dittofeed'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [dittofeed_service_1.DittofeedService,
        prisma_service_1.PrismaService,
        dittofeed_admin_service_1.DittofeedAdminService,
        cross_sell_service_1.CrossSellService,
        dittofeed_db_reader_service_1.DittofeedDbReaderService])
], DittofeedController);
//# sourceMappingURL=dittofeed.controller.js.map