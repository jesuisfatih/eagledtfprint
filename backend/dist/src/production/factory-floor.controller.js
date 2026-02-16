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
exports.FactoryFloorController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const public_decorator_1 = require("../auth/decorators/public.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const factory_floor_service_1 = require("./factory-floor.service");
let FactoryFloorController = class FactoryFloorController {
    factoryFloor;
    constructor(factoryFloor) {
        this.factoryFloor = factoryFloor;
    }
    async initiatePipeline(merchantId, orderId) {
        return this.factoryFloor.initiateFullPipeline(merchantId, orderId);
    }
    async scanQrCode(qrCode) {
        return this.factoryFloor.scanAndProcess(qrCode);
    }
    async approveDesign(merchantId, designProjectId) {
        return this.factoryFloor.approveDesignAndQueue(designProjectId, merchantId);
    }
    async markReady(merchantId, orderId) {
        return this.factoryFloor.markOrderReady(orderId, merchantId);
    }
    async getOrderStatus(merchantId, orderId) {
        return this.factoryFloor.getOrderPipelineStatus(orderId, merchantId);
    }
    async getDashboard(merchantId) {
        return this.factoryFloor.getFactoryFloorDashboard(merchantId);
    }
    async getDailySummary(merchantId) {
        return this.factoryFloor.getDailySummary(merchantId);
    }
};
exports.FactoryFloorController = FactoryFloorController;
__decorate([
    (0, common_1.Post)('pipeline/:orderId'),
    (0, common_1.HttpCode)(201),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Param)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], FactoryFloorController.prototype, "initiatePipeline", null);
__decorate([
    (0, common_1.Post)('scan/:qrCode'),
    (0, public_decorator_1.Public)(),
    __param(0, (0, common_1.Param)('qrCode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FactoryFloorController.prototype, "scanQrCode", null);
__decorate([
    (0, common_1.Post)('approve-design/:designProjectId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Param)('designProjectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], FactoryFloorController.prototype, "approveDesign", null);
__decorate([
    (0, common_1.Post)('mark-ready/:orderId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Param)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], FactoryFloorController.prototype, "markReady", null);
__decorate([
    (0, common_1.Get)('order/:orderId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Param)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], FactoryFloorController.prototype, "getOrderStatus", null);
__decorate([
    (0, common_1.Get)('dashboard'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FactoryFloorController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('daily-summary'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FactoryFloorController.prototype, "getDailySummary", null);
exports.FactoryFloorController = FactoryFloorController = __decorate([
    (0, common_1.Controller)('factory'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [factory_floor_service_1.FactoryFloorService])
], FactoryFloorController);
//# sourceMappingURL=factory-floor.controller.js.map