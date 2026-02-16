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
exports.OrdersController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const orders_service_1 = require("./orders.service");
let OrdersController = class OrdersController {
    ordersService;
    constructor(ordersService) {
        this.ordersService = ordersService;
    }
    async findAll(merchantId, userCompanyId, role, queryCompanyId, status, pickupOnly, hasDesignFiles) {
        if (!merchantId) {
            throw new common_1.BadRequestException('Merchant ID required');
        }
        let companyId = queryCompanyId;
        if (userCompanyId) {
            companyId = userCompanyId;
        }
        return this.ordersService.findAll(merchantId, {
            companyId,
            status,
            pickupOnly: pickupOnly === 'true',
            hasDesignFiles: hasDesignFiles === 'true',
        });
    }
    async getStats(merchantId, companyId) {
        if (!merchantId) {
            throw new common_1.BadRequestException('Merchant ID required');
        }
        return this.ordersService.getStats(merchantId, companyId);
    }
    async getCustomerJourney(merchantId, shopifyCustomerId) {
        if (!merchantId) {
            throw new common_1.BadRequestException('Merchant ID required');
        }
        return this.ordersService.getCustomerJourney(merchantId, shopifyCustomerId);
    }
    async getJourneyFunnel(merchantId) {
        if (!merchantId) {
            throw new common_1.BadRequestException('Merchant ID required');
        }
        return this.ordersService.getJourneyFunnel(merchantId);
    }
    async findOne(id, merchantId, companyId) {
        if (!merchantId) {
            throw new common_1.BadRequestException('Merchant ID required');
        }
        return this.ordersService.findOne(id, merchantId, companyId);
    }
};
exports.OrdersController = OrdersController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('role')),
    __param(3, (0, common_1.Query)('companyId')),
    __param(4, (0, common_1.Query)('status')),
    __param(5, (0, common_1.Query)('pickupOnly')),
    __param(6, (0, common_1.Query)('hasDesignFiles')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('journey/:shopifyCustomerId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Param)('shopifyCustomerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getCustomerJourney", null);
__decorate([
    (0, common_1.Get)('journey-funnel'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getJourneyFunnel", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "findOne", null);
exports.OrdersController = OrdersController = __decorate([
    (0, common_1.Controller)('orders'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [orders_service_1.OrdersService])
], OrdersController);
//# sourceMappingURL=orders.controller.js.map