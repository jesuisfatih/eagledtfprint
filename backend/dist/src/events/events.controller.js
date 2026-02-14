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
exports.EventsController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const public_decorator_1 = require("../auth/decorators/public.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const event_dto_1 = require("./dto/event.dto");
const events_service_1 = require("./events.service");
let EventsController = class EventsController {
    eventsService;
    constructor(eventsService) {
        this.eventsService = eventsService;
    }
    async collectEvent(dto) {
        return this.eventsService.collectEvent(dto);
    }
    async getCompanyEvents(companyId, query) {
        return this.eventsService.getEventsByCompany(companyId, {
            eventType: query.eventType,
            limit: query.limit,
        });
    }
    async getAnalytics(merchantId, query) {
        const dateRange = query.from && query.to ? {
            from: new Date(query.from),
            to: new Date(query.to),
        } : undefined;
        return this.eventsService.getAnalytics(merchantId, dateRange);
    }
    async getAdminActivity(merchantId, limit) {
        return this.eventsService.getAdminActivityFeed(merchantId, limit ? parseInt(limit) : 50);
    }
    async getWebhookActivity(merchantId, limit) {
        return this.eventsService.getWebhookActivityFeed(merchantId, limit ? parseInt(limit) : 100);
    }
    async getSessionActivity(merchantId, limit) {
        return this.eventsService.getSessionActivityFeed(merchantId, limit ? parseInt(limit) : 50);
    }
};
exports.EventsController = EventsController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ short: { limit: 50, ttl: 1000 }, medium: { limit: 200, ttl: 10000 } }),
    (0, common_1.Post)('collect'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [event_dto_1.CollectEventDto]),
    __metadata("design:returntype", Promise)
], EventsController.prototype, "collectEvent", null);
__decorate([
    (0, throttler_1.SkipThrottle)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('company'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, event_dto_1.GetEventsQueryDto]),
    __metadata("design:returntype", Promise)
], EventsController.prototype, "getCompanyEvents", null);
__decorate([
    (0, throttler_1.SkipThrottle)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('analytics'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, event_dto_1.AnalyticsQueryDto]),
    __metadata("design:returntype", Promise)
], EventsController.prototype, "getAnalytics", null);
__decorate([
    (0, throttler_1.SkipThrottle)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('admin-activity'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], EventsController.prototype, "getAdminActivity", null);
__decorate([
    (0, throttler_1.SkipThrottle)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('webhook-activity'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], EventsController.prototype, "getWebhookActivity", null);
__decorate([
    (0, throttler_1.SkipThrottle)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('session-activity'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], EventsController.prototype, "getSessionActivity", null);
exports.EventsController = EventsController = __decorate([
    (0, common_1.Controller)('events'),
    __metadata("design:paramtypes", [events_service_1.EventsService])
], EventsController);
//# sourceMappingURL=events.controller.js.map