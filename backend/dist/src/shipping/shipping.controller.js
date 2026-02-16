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
exports.ShippingController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const public_decorator_1 = require("../auth/decorators/public.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const shipping_service_1 = require("./shipping.service");
let ShippingController = class ShippingController {
    shippingService;
    constructor(shippingService) {
        this.shippingService = shippingService;
    }
    async getPending(merchantId) {
        return this.shippingService.getPendingOrders(merchantId);
    }
    async getRates(merchantId, body) {
        return this.shippingService.getRates({ ...body, merchantId });
    }
    async createShipment(merchantId, body) {
        return this.shippingService.createShipment({ ...body, merchantId });
    }
    async batchShip(merchantId, body) {
        return this.shippingService.createBatchShipments(merchantId, body.orderIds);
    }
    async getRouting(merchantId, orderId) {
        return this.shippingService.getIntelligentRouting(orderId, merchantId);
    }
    async trackingWebhook(body) {
        return this.shippingService.handleTrackingWebhook(body);
    }
    async getShelfCapacity(merchantId) {
        return this.shippingService.getShelfCapacity(merchantId);
    }
    async getStalePickups(merchantId, days) {
        const parsedDays = days ? parseInt(days, 10) : 5;
        return this.shippingService.getStalePickupOrders(merchantId, Number.isFinite(parsedDays) ? parsedDays : 5);
    }
    async getStats(merchantId) {
        return this.shippingService.getShippingStats(merchantId);
    }
};
exports.ShippingController = ShippingController;
__decorate([
    (0, common_1.Get)('pending'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "getPending", null);
__decorate([
    (0, common_1.Post)('rates'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "getRates", null);
__decorate([
    (0, common_1.Post)('ship'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "createShipment", null);
__decorate([
    (0, common_1.Post)('ship/batch'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "batchShip", null);
__decorate([
    (0, common_1.Get)('routing/:orderId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Param)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "getRouting", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('webhooks/tracking'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "trackingWebhook", null);
__decorate([
    (0, common_1.Get)('shelf-capacity'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "getShelfCapacity", null);
__decorate([
    (0, common_1.Get)('stale-pickups'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "getStalePickups", null);
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "getStats", null);
exports.ShippingController = ShippingController = __decorate([
    (0, common_1.Controller)('shipping'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [shipping_service_1.ShippingService])
], ShippingController);
//# sourceMappingURL=shipping.controller.js.map