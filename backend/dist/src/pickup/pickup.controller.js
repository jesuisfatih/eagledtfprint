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
exports.PickupController = void 0;
const common_1 = require("@nestjs/common");
const public_decorator_1 = require("../auth/decorators/public.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const pickup_service_1 = require("./pickup.service");
let PickupController = class PickupController {
    pickupService;
    constructor(pickupService) {
        this.pickupService = pickupService;
    }
    async createShelf(req, body) {
        return this.pickupService.createShelf(req.user.merchantId, body);
    }
    async getShelves(req) {
        return this.pickupService.getShelves(req.user.merchantId);
    }
    async updateShelf(req, id, body) {
        return this.pickupService.updateShelf(id, req.user.merchantId, body);
    }
    async deleteShelf(req, id) {
        return this.pickupService.deleteShelf(id, req.user.merchantId);
    }
    async getOrders(req, query) {
        const filters = { ...query };
        if (req.user.companyId) {
            filters.companyId = req.user.companyId;
        }
        return this.pickupService.getPickupOrders(req.user.merchantId, filters);
    }
    async getStats(req) {
        return this.pickupService.getStats(req.user.merchantId);
    }
    async getOrder(req, id) {
        return this.pickupService.getPickupOrder(id, req.user.merchantId);
    }
    async createOrder(req, body) {
        return this.pickupService.createPickupOrder(req.user.merchantId, body);
    }
    async assignShelf(req, id, shelfId) {
        return this.pickupService.assignShelf(id, req.user.merchantId, shelfId);
    }
    async updateStatus(req, id, status) {
        return this.pickupService.updateStatus(id, req.user.merchantId, status);
    }
    async scanQr(qrCode) {
        return this.pickupService.scanQrCode(qrCode);
    }
    async verifyEmail(email) {
        return this.pickupService.verifyCustomerEmail(email);
    }
};
exports.PickupController = PickupController;
__decorate([
    (0, common_1.Post)('shelves'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PickupController.prototype, "createShelf", null);
__decorate([
    (0, common_1.Get)('shelves'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PickupController.prototype, "getShelves", null);
__decorate([
    (0, common_1.Patch)('shelves/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], PickupController.prototype, "updateShelf", null);
__decorate([
    (0, common_1.Delete)('shelves/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PickupController.prototype, "deleteShelf", null);
__decorate([
    (0, common_1.Get)('orders'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PickupController.prototype, "getOrders", null);
__decorate([
    (0, common_1.Get)('orders/stats'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PickupController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('orders/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PickupController.prototype, "getOrder", null);
__decorate([
    (0, common_1.Post)('orders'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PickupController.prototype, "createOrder", null);
__decorate([
    (0, common_1.Patch)('orders/:id/assign-shelf'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('shelfId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], PickupController.prototype, "assignShelf", null);
__decorate([
    (0, common_1.Patch)('orders/:id/status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], PickupController.prototype, "updateStatus", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('scan/:qrCode'),
    __param(0, (0, common_1.Param)('qrCode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PickupController.prototype, "scanQr", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('verify-email'),
    __param(0, (0, common_1.Body)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PickupController.prototype, "verifyEmail", null);
exports.PickupController = PickupController = __decorate([
    (0, common_1.Controller)('pickup'),
    __metadata("design:paramtypes", [pickup_service_1.PickupService])
], PickupController);
//# sourceMappingURL=pickup.controller.js.map