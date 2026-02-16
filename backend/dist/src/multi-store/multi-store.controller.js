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
exports.MultiStoreController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const multi_store_service_1 = require("./multi-store.service");
let MultiStoreController = class MultiStoreController {
    multiStoreService;
    constructor(multiStoreService) {
        this.multiStoreService = multiStoreService;
    }
    async listStores() {
        return this.multiStoreService.listStores();
    }
    async getStoreConfig(merchantId) {
        return this.multiStoreService.getStoreConfig(merchantId);
    }
    async onboardStore(body) {
        return this.multiStoreService.onboardNewStore(body);
    }
    async getCrossStoreAnalytics() {
        return this.multiStoreService.getCrossStoreAnalytics();
    }
    async getCrossStoreCustomers(limit) {
        const parsedLimit = limit ? parseInt(limit, 10) : 50;
        return this.multiStoreService.getCrossStoreCustomers(Number.isFinite(parsedLimit) ? parsedLimit : 50);
    }
    async getLoadBalance() {
        return this.multiStoreService.getProductionLoadBalance();
    }
    async getMobileDashboard(merchantId) {
        return this.multiStoreService.getMobileFactoryDashboard(merchantId);
    }
};
exports.MultiStoreController = MultiStoreController;
__decorate([
    (0, common_1.Get)('stores'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MultiStoreController.prototype, "listStores", null);
__decorate([
    (0, common_1.Get)('stores/:merchantId/config'),
    __param(0, (0, common_1.Param)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MultiStoreController.prototype, "getStoreConfig", null);
__decorate([
    (0, common_1.Post)('stores/onboard'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MultiStoreController.prototype, "onboardStore", null);
__decorate([
    (0, common_1.Get)('analytics'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MultiStoreController.prototype, "getCrossStoreAnalytics", null);
__decorate([
    (0, common_1.Get)('customers/cross-store'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MultiStoreController.prototype, "getCrossStoreCustomers", null);
__decorate([
    (0, common_1.Get)('production/load-balance'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MultiStoreController.prototype, "getLoadBalance", null);
__decorate([
    (0, common_1.Get)('mobile/dashboard'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MultiStoreController.prototype, "getMobileDashboard", null);
exports.MultiStoreController = MultiStoreController = __decorate([
    (0, common_1.Controller)('multi-store'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [multi_store_service_1.MultiStoreService])
], MultiStoreController);
//# sourceMappingURL=multi-store.controller.js.map