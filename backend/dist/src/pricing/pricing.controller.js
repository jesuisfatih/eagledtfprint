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
exports.PricingController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const pricing_dto_1 = require("./dto/pricing.dto");
const pricing_service_1 = require("./pricing.service");
let PricingController = class PricingController {
    pricingService;
    constructor(pricingService) {
        this.pricingService = pricingService;
    }
    async calculatePrices(merchantId, companyId, dto) {
        if (!merchantId) {
            throw new common_1.BadRequestException('Merchant ID required');
        }
        if (!companyId) {
            throw new common_1.BadRequestException('Company ID required');
        }
        const variantIds = dto.variantIds.map((id) => BigInt(id));
        return this.pricingService.calculatePrices({
            merchantId,
            companyId,
            variantIds,
            quantities: dto.quantities,
            cartTotal: dto.cartTotal,
        });
    }
    async getRules(merchantId, query) {
        if (!merchantId) {
            throw new common_1.BadRequestException('Merchant ID required');
        }
        const filters = {};
        if (query.isActive !== undefined) {
            filters.isActive = query.isActive === 'true';
        }
        if (query.companyId) {
            filters.companyId = query.companyId;
        }
        if (query.companyUserId) {
            filters.companyUserId = query.companyUserId;
        }
        if (query.targetType) {
            filters.targetType = query.targetType;
        }
        return this.pricingService.getRules(merchantId, filters);
    }
    async getRule(id, merchantId) {
        if (!merchantId) {
            throw new common_1.BadRequestException('Merchant ID required');
        }
        return this.pricingService.getRule(id, merchantId);
    }
    async createRule(merchantId, dto) {
        if (!merchantId) {
            throw new common_1.BadRequestException('Merchant ID required');
        }
        return this.pricingService.createRule(merchantId, dto);
    }
    async updateRule(id, merchantId, dto) {
        if (!merchantId) {
            throw new common_1.BadRequestException('Merchant ID required');
        }
        return this.pricingService.updateRule(id, merchantId, dto);
    }
    async deleteRule(id, merchantId) {
        if (!merchantId) {
            throw new common_1.BadRequestException('Merchant ID required');
        }
        return this.pricingService.deleteRule(id, merchantId);
    }
    async toggleRule(id, merchantId, dto) {
        if (!merchantId) {
            throw new common_1.BadRequestException('Merchant ID required');
        }
        return this.pricingService.toggleRuleActive(id, merchantId, dto.isActive);
    }
};
exports.PricingController = PricingController;
__decorate([
    (0, common_1.Post)('calculate'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, pricing_dto_1.CalculatePricesDto]),
    __metadata("design:returntype", Promise)
], PricingController.prototype, "calculatePrices", null);
__decorate([
    (0, common_1.Get)('rules'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, pricing_dto_1.GetRulesQueryDto]),
    __metadata("design:returntype", Promise)
], PricingController.prototype, "getRules", null);
__decorate([
    (0, common_1.Get)('rules/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PricingController.prototype, "getRule", null);
__decorate([
    (0, common_1.Post)('rules'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, pricing_dto_1.CreatePricingRuleDto]),
    __metadata("design:returntype", Promise)
], PricingController.prototype, "createRule", null);
__decorate([
    (0, common_1.Put)('rules/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, pricing_dto_1.UpdatePricingRuleDto]),
    __metadata("design:returntype", Promise)
], PricingController.prototype, "updateRule", null);
__decorate([
    (0, common_1.Delete)('rules/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PricingController.prototype, "deleteRule", null);
__decorate([
    (0, common_1.Put)('rules/:id/toggle'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, pricing_dto_1.ToggleRuleDto]),
    __metadata("design:returntype", Promise)
], PricingController.prototype, "toggleRule", null);
exports.PricingController = PricingController = __decorate([
    (0, common_1.Controller)('pricing'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [pricing_service_1.PricingService])
], PricingController);
//# sourceMappingURL=pricing.controller.js.map