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
exports.ShopifyCustomersController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const customer_intelligence_service_1 = require("../customers/customer-intelligence.service");
const shopify_customers_service_1 = require("./shopify-customers.service");
let ShopifyCustomersController = class ShopifyCustomersController {
    shopifyCustomersService;
    customerIntelligence;
    constructor(shopifyCustomersService, customerIntelligence) {
        this.shopifyCustomersService = shopifyCustomersService;
        this.customerIntelligence = customerIntelligence;
    }
    async findAll(merchantId, search, segment, churnRisk, clvTier) {
        if (!merchantId) {
            throw new common_1.BadRequestException('Merchant ID required');
        }
        return this.shopifyCustomersService.findAll(merchantId, {
            search,
            segment,
            churnRisk,
            clvTier,
        });
    }
    async getInsightsSummary(merchantId) {
        if (!merchantId) {
            throw new common_1.BadRequestException('Merchant ID required');
        }
        return this.customerIntelligence.getInsightsSummary(merchantId);
    }
    async getAtRiskCustomers(merchantId, limit) {
        if (!merchantId) {
            throw new common_1.BadRequestException('Merchant ID required');
        }
        const parsedLimit = limit ? parseInt(limit, 10) : 50;
        return this.customerIntelligence.getAtRiskCustomers(merchantId, Number.isFinite(parsedLimit) ? parsedLimit : 50);
    }
    async getBySegment(merchantId, segment, limit) {
        if (!merchantId) {
            throw new common_1.BadRequestException('Merchant ID required');
        }
        const parsedLimit = limit ? parseInt(limit, 10) : 50;
        return this.customerIntelligence.getCustomersBySegment(merchantId, segment, Number.isFinite(parsedLimit) ? parsedLimit : 50);
    }
    async calculateInsights(merchantId) {
        if (!merchantId) {
            throw new common_1.BadRequestException('Merchant ID required');
        }
        return this.customerIntelligence.calculateInsights(merchantId);
    }
    async findOne(id) {
        return this.shopifyCustomersService.findOne(id);
    }
    async convertToCompany(customerId, merchantId) {
        if (!merchantId) {
            throw new common_1.BadRequestException('Merchant ID required');
        }
        return this.shopifyCustomersService.convertToCompany(customerId, merchantId);
    }
};
exports.ShopifyCustomersController = ShopifyCustomersController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Query)('search')),
    __param(2, (0, common_1.Query)('segment')),
    __param(3, (0, common_1.Query)('churnRisk')),
    __param(4, (0, common_1.Query)('clvTier')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ShopifyCustomersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('insights/summary'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ShopifyCustomersController.prototype, "getInsightsSummary", null);
__decorate([
    (0, common_1.Get)('insights/at-risk'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ShopifyCustomersController.prototype, "getAtRiskCustomers", null);
__decorate([
    (0, common_1.Get)('insights/segment/:segment'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Param)('segment')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ShopifyCustomersController.prototype, "getBySegment", null);
__decorate([
    (0, common_1.Post)('insights/calculate'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ShopifyCustomersController.prototype, "calculateInsights", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ShopifyCustomersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(':id/convert-to-company'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ShopifyCustomersController.prototype, "convertToCompany", null);
exports.ShopifyCustomersController = ShopifyCustomersController = __decorate([
    (0, common_1.Controller)('shopify-customers'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [shopify_customers_service_1.ShopifyCustomersService,
        customer_intelligence_service_1.CustomerIntelligenceService])
], ShopifyCustomersController);
//# sourceMappingURL=shopify-customers.controller.js.map