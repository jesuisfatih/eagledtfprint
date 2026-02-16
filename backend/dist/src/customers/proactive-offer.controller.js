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
exports.ProactiveOfferController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const proactive_offer_service_1 = require("./proactive-offer.service");
let ProactiveOfferController = class ProactiveOfferController {
    offerService;
    constructor(offerService) {
        this.offerService = offerService;
    }
    async getOffers(merchantId, status, strategy, limit, offset) {
        if (!merchantId)
            throw new common_1.BadRequestException('Merchant ID required');
        return this.offerService.getMerchantOffers(merchantId, {
            status,
            strategy,
            limit: (() => { const n = limit ? parseInt(limit, 10) : undefined; return n !== undefined && Number.isFinite(n) ? n : undefined; })(),
            offset: (() => { const n = offset ? parseInt(offset, 10) : undefined; return n !== undefined && Number.isFinite(n) ? n : undefined; })(),
        });
    }
    async getAnalytics(merchantId) {
        if (!merchantId)
            throw new common_1.BadRequestException('Merchant ID required');
        return this.offerService.getOfferAnalytics(merchantId);
    }
    async getCustomerOffers(customerId) {
        return this.offerService.getCustomerOffers(customerId);
    }
    async generateOffers(merchantId) {
        if (!merchantId)
            throw new common_1.BadRequestException('Merchant ID required');
        return this.offerService.generateOffers(merchantId);
    }
    async markViewed(id) {
        return this.offerService.markViewed(id);
    }
    async markAccepted(id) {
        return this.offerService.markAccepted(id);
    }
    async markRedeemed(id, body) {
        return this.offerService.markRedeemed(id, body.orderId, body.revenue);
    }
    async cancelOffer(id) {
        return this.offerService.cancelOffer(id);
    }
    async expireOldOffers(merchantId) {
        if (!merchantId)
            throw new common_1.BadRequestException('Merchant ID required');
        const expired = await this.offerService.expireOldOffers(merchantId);
        return { expired };
    }
};
exports.ProactiveOfferController = ProactiveOfferController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('strategy')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ProactiveOfferController.prototype, "getOffers", null);
__decorate([
    (0, common_1.Get)('analytics'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProactiveOfferController.prototype, "getAnalytics", null);
__decorate([
    (0, common_1.Get)('customer/:customerId'),
    __param(0, (0, common_1.Param)('customerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProactiveOfferController.prototype, "getCustomerOffers", null);
__decorate([
    (0, common_1.Post)('generate'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProactiveOfferController.prototype, "generateOffers", null);
__decorate([
    (0, common_1.Post)(':id/view'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProactiveOfferController.prototype, "markViewed", null);
__decorate([
    (0, common_1.Post)(':id/accept'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProactiveOfferController.prototype, "markAccepted", null);
__decorate([
    (0, common_1.Post)(':id/redeem'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProactiveOfferController.prototype, "markRedeemed", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProactiveOfferController.prototype, "cancelOffer", null);
__decorate([
    (0, common_1.Post)('expire'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProactiveOfferController.prototype, "expireOldOffers", null);
exports.ProactiveOfferController = ProactiveOfferController = __decorate([
    (0, common_1.Controller)('offers'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [proactive_offer_service_1.ProactiveOfferService])
], ProactiveOfferController);
//# sourceMappingURL=proactive-offer.controller.js.map