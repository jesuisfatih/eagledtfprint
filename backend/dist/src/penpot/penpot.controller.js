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
exports.PenpotController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const public_decorator_1 = require("../auth/decorators/public.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const penpot_service_1 = require("./penpot.service");
let PenpotController = class PenpotController {
    penpotService;
    constructor(penpotService) {
        this.penpotService = penpotService;
    }
    async getPublicProject(id) {
        return this.penpotService.getPublicDesignProject(id);
    }
    async approvePublicProject(id) {
        return this.penpotService.updateDesignProjectStatus(id, '', 'APPROVED');
    }
    async rejectPublicProject(id, notes) {
        return this.penpotService.updateDesignProjectStatus(id, '', 'REJECTED');
    }
    async createFromOrder(orderId, merchantId) {
        const result = await this.penpotService.createDesignProjectFromOrder(orderId, merchantId);
        return result;
    }
    async getForOrder(orderId, merchantId) {
        return this.penpotService.getDesignProjectsForOrder(orderId, merchantId);
    }
    async getAllProjects(merchantId, status, companyId) {
        return this.penpotService.getAllDesignProjects(merchantId, { status, companyId });
    }
    async updateStatus(id, merchantId, status) {
        return this.penpotService.updateDesignProjectStatus(id, merchantId, status);
    }
    async syncReady(merchantId, fileId) {
        return this.penpotService.syncDesignReady(merchantId, fileId);
    }
    async exportDesign(id, merchantId, format) {
        return this.penpotService.exportDesign(id, merchantId, format || 'pdf');
    }
    getDashboardUrl() {
        return { url: this.penpotService.getPublicUrl() };
    }
};
exports.PenpotController = PenpotController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('public/projects/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PenpotController.prototype, "getPublicProject", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('public/projects/:id/approve'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PenpotController.prototype, "approvePublicProject", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('public/projects/:id/reject'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('notes')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PenpotController.prototype, "rejectPublicProject", null);
__decorate([
    (0, common_1.Post)('create-from-order/:orderId'),
    __param(0, (0, common_1.Param)('orderId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PenpotController.prototype, "createFromOrder", null);
__decorate([
    (0, common_1.Get)('order/:orderId'),
    __param(0, (0, common_1.Param)('orderId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PenpotController.prototype, "getForOrder", null);
__decorate([
    (0, common_1.Get)('projects'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], PenpotController.prototype, "getAllProjects", null);
__decorate([
    (0, common_1.Post)('projects/:id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(2, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], PenpotController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Post)('sync-ready'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Body)('fileId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PenpotController.prototype, "syncReady", null);
__decorate([
    (0, common_1.Post)('projects/:id/export'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(2, (0, common_1.Body)('format')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], PenpotController.prototype, "exportDesign", null);
__decorate([
    (0, common_1.Get)('dashboard-url'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PenpotController.prototype, "getDashboardUrl", null);
exports.PenpotController = PenpotController = __decorate([
    (0, common_1.Controller)('penpot'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [penpot_service_1.PenpotService])
], PenpotController);
//# sourceMappingURL=penpot.controller.js.map