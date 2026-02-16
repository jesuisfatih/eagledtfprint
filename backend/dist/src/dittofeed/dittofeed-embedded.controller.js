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
exports.DittofeedEmbeddedController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const dittofeed_admin_service_1 = require("./dittofeed-admin.service");
const dittofeed_db_reader_service_1 = require("./dittofeed-db-reader.service");
const dittofeed_service_1 = require("./dittofeed.service");
let DittofeedEmbeddedController = class DittofeedEmbeddedController {
    admin;
    dbReader;
    dittofeed;
    constructor(admin, dbReader, dittofeed) {
        this.admin = admin;
        this.dbReader = dbReader;
        this.dittofeed = dittofeed;
    }
    async listSegments() {
        const [segments, counts] = await Promise.all([
            this.admin.listSegments(),
            this.dbReader.getSegmentCounts(),
        ]);
        const segmentList = Array.isArray(segments) ? segments : [];
        const countMap = new Map((Array.isArray(counts) ? counts : []).map((c) => [c.segmentName, c.count]));
        return segmentList.map((seg) => ({
            ...seg,
            userCount: countMap.get(seg.name) || 0,
        }));
    }
    getSegmentTemplates() {
        return this.admin.getAvailableSegmentTemplates();
    }
    async setupAllSegments() {
        return this.admin.setupAllSegments();
    }
    async createCustomSegment(body) {
        return this.admin.createCustomSegment(body.name, body.conditions, body.logic || 'And');
    }
    async listJourneys() {
        const [journeys, metrics] = await Promise.all([
            this.admin.listJourneys(),
            this.dbReader.getJourneyMetrics(),
        ]);
        const journeyList = Array.isArray(journeys) ? journeys : [];
        const metricsMap = new Map((Array.isArray(metrics) ? metrics : []).map((m) => [m.journeyName, m]));
        return journeyList.map((j) => ({
            ...j,
            metrics: metricsMap.get(j.name) || null,
        }));
    }
    getJourneyTemplates() {
        return this.admin.getAvailableJourneyTemplates();
    }
    async setupAllJourneys() {
        return this.admin.setupAllJourneys();
    }
    async setJourneyStatus(journeyId, status) {
        return this.admin.setJourneyStatus(journeyId, status);
    }
    async listTemplates() {
        const [templates, performance] = await Promise.all([
            this.admin.listTemplates(),
            this.dbReader.getMessagePerformance(),
        ]);
        const templateList = Array.isArray(templates) ? templates : [];
        const perfMap = new Map((Array.isArray(performance) ? performance : []).map((p) => [p.templateName, p]));
        return templateList.map((t) => ({
            ...t,
            performance: perfMap.get(t.name) || null,
        }));
    }
    getAvailableTemplates() {
        return this.admin.getAvailableEmailTemplates();
    }
    async setupAllTemplates() {
        return this.admin.setupAllEmailTemplates();
    }
    async setupFullStore() {
        return this.admin.setupFullStore();
    }
    async getAnalyticsOverview(days) {
        const parsedDays = days ? parseInt(days, 10) : 30;
        return this.dbReader.getFullAnalytics(Number.isFinite(parsedDays) ? parsedDays : 30);
    }
    async getCampaignStats(days) {
        const parsedDays = days ? parseInt(days, 10) : 30;
        return this.dbReader.getCampaignMetrics(Number.isFinite(parsedDays) ? parsedDays : 30);
    }
    async getJourneyAnalytics() {
        return this.dbReader.getJourneyMetrics();
    }
    async getMessageStats(days) {
        const parsedDays = days ? parseInt(days, 10) : 30;
        return this.dbReader.getMessagePerformance(Number.isFinite(parsedDays) ? parsedDays : 30);
    }
    async getDailyTrends(days) {
        const parsedDays = days ? parseInt(days, 10) : 14;
        return this.dbReader.getDailyTrends(Number.isFinite(parsedDays) ? parsedDays : 14);
    }
    getWidgetConfig() {
        return {
            version: '1.0',
            widgets: [
                {
                    id: 'segment-builder',
                    name: 'Segment Builder',
                    description: 'DTF sektörüne özel müşteri segmentleri oluşturun',
                    endpoint: 'dittofeed/embedded/segments',
                    type: 'crud',
                    features: ['list', 'create', 'templates', 'bulk-setup'],
                    availableTraits: [
                        'predicted_clv', 'churn_risk_level', 'days_since_last_order',
                        'total_orders', 'favorite_product_type', 'preferred_transfer_type',
                        'gang_sheet_fill_rate', 'avg_order_interval_days', 'lifetime_sqft',
                        'last_product_type', 'total_spent', 'customer_tier',
                    ],
                    availableOperators: ['Equals', 'NotEquals', 'GreaterThanOrEqual', 'LessThan', 'Exists', 'NotExists'],
                },
                {
                    id: 'journey-manager',
                    name: 'Journey Manager',
                    description: 'Otomatik pazarlama akışlarını yönetin',
                    endpoint: 'dittofeed/embedded/journeys',
                    type: 'crud',
                    features: ['list', 'templates', 'bulk-setup', 'start-pause'],
                },
                {
                    id: 'template-editor',
                    name: 'Email Template Editor',
                    description: 'Sektöre özel email şablonlarını yönetin',
                    endpoint: 'dittofeed/embedded/templates',
                    type: 'crud',
                    features: ['list', 'preview', 'bulk-setup'],
                },
                {
                    id: 'analytics-dashboard',
                    name: 'Marketing Analytics',
                    description: 'Kampanya performansını gerçek zamanlı izleyin',
                    endpoint: 'dittofeed/embedded/analytics',
                    type: 'dashboard',
                    features: ['overview', 'campaigns', 'journeys', 'messages', 'daily-trends'],
                    chartTypes: ['bar', 'line', 'funnel', 'pie'],
                },
            ],
            quickActions: [
                {
                    label: 'Full Store Setup',
                    description: 'Segments + Journeys + Templates hepsini tek tıkla oluştur',
                    endpoint: 'dittofeed/embedded/setup-full',
                    method: 'POST',
                    confirmRequired: true,
                },
            ],
        };
    }
    getEmbedUrls() {
        const dittofeedUrl = process.env.DITTOFEED_DASHBOARD_URL || 'http://localhost:3010';
        return {
            note: 'These URLs can be embedded as iframes if Dittofeed supports it. Prefer using the API-based widget endpoints instead.',
            dashboardUrl: dittofeedUrl,
            segments: `${dittofeedUrl}/segments`,
            journeys: `${dittofeedUrl}/journeys`,
            templates: `${dittofeedUrl}/templates`,
            broadcasts: `${dittofeedUrl}/broadcasts`,
            settings: `${dittofeedUrl}/settings`,
            apiAlternative: {
                message: 'For full embedded experience without iframes, use the dittofeed/embedded/* endpoints (global prefix api/v1 is added automatically)',
                widgetConfig: 'dittofeed/embedded/widget-config',
            },
        };
    }
    async getHealth() {
        const [adminHealth, dbHealth] = await Promise.all([
            this.admin.healthCheck(),
            this.dbReader.healthCheck(),
        ]);
        return {
            adminApi: adminHealth,
            database: dbHealth,
            overall: adminHealth.connected && dbHealth.connected,
        };
    }
};
exports.DittofeedEmbeddedController = DittofeedEmbeddedController;
__decorate([
    (0, common_1.Get)('segments'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DittofeedEmbeddedController.prototype, "listSegments", null);
__decorate([
    (0, common_1.Get)('segments/templates'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DittofeedEmbeddedController.prototype, "getSegmentTemplates", null);
__decorate([
    (0, common_1.Post)('segments/setup-all'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DittofeedEmbeddedController.prototype, "setupAllSegments", null);
__decorate([
    (0, common_1.Post)('segments/custom'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DittofeedEmbeddedController.prototype, "createCustomSegment", null);
__decorate([
    (0, common_1.Get)('journeys'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DittofeedEmbeddedController.prototype, "listJourneys", null);
__decorate([
    (0, common_1.Get)('journeys/templates'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DittofeedEmbeddedController.prototype, "getJourneyTemplates", null);
__decorate([
    (0, common_1.Post)('journeys/setup-all'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DittofeedEmbeddedController.prototype, "setupAllJourneys", null);
__decorate([
    (0, common_1.Patch)('journeys/:journeyId/status'),
    __param(0, (0, common_1.Param)('journeyId')),
    __param(1, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], DittofeedEmbeddedController.prototype, "setJourneyStatus", null);
__decorate([
    (0, common_1.Get)('templates'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DittofeedEmbeddedController.prototype, "listTemplates", null);
__decorate([
    (0, common_1.Get)('templates/available'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DittofeedEmbeddedController.prototype, "getAvailableTemplates", null);
__decorate([
    (0, common_1.Post)('templates/setup-all'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DittofeedEmbeddedController.prototype, "setupAllTemplates", null);
__decorate([
    (0, common_1.Post)('setup-full'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DittofeedEmbeddedController.prototype, "setupFullStore", null);
__decorate([
    (0, common_1.Get)('analytics/overview'),
    __param(0, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DittofeedEmbeddedController.prototype, "getAnalyticsOverview", null);
__decorate([
    (0, common_1.Get)('analytics/campaigns'),
    __param(0, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DittofeedEmbeddedController.prototype, "getCampaignStats", null);
__decorate([
    (0, common_1.Get)('analytics/journeys'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DittofeedEmbeddedController.prototype, "getJourneyAnalytics", null);
__decorate([
    (0, common_1.Get)('analytics/messages'),
    __param(0, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DittofeedEmbeddedController.prototype, "getMessageStats", null);
__decorate([
    (0, common_1.Get)('analytics/daily-trends'),
    __param(0, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DittofeedEmbeddedController.prototype, "getDailyTrends", null);
__decorate([
    (0, common_1.Get)('widget-config'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DittofeedEmbeddedController.prototype, "getWidgetConfig", null);
__decorate([
    (0, common_1.Get)('embed-urls'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DittofeedEmbeddedController.prototype, "getEmbedUrls", null);
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DittofeedEmbeddedController.prototype, "getHealth", null);
exports.DittofeedEmbeddedController = DittofeedEmbeddedController = __decorate([
    (0, common_1.Controller)('dittofeed/embedded'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [dittofeed_admin_service_1.DittofeedAdminService,
        dittofeed_db_reader_service_1.DittofeedDbReaderService,
        dittofeed_service_1.DittofeedService])
], DittofeedEmbeddedController);
//# sourceMappingURL=dittofeed-embedded.controller.js.map