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
exports.ProductionController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const production_service_1 = require("./production.service");
let ProductionController = class ProductionController {
    productionService;
    constructor(productionService) {
        this.productionService = productionService;
    }
    async getBoard(merchantId) {
        return this.productionService.getKanbanBoard(merchantId);
    }
    async getStats(merchantId) {
        return this.productionService.getStats(merchantId);
    }
    async createFromOrder(merchantId, orderId) {
        return this.productionService.createJobsFromOrder(merchantId, orderId);
    }
    async createJob(merchantId, body) {
        return this.productionService.createJob({
            merchantId,
            ...body,
        });
    }
    async moveStatus(jobId, body) {
        return this.productionService.moveToStatus(jobId, body.status, body.operatorName);
    }
    async batchMoveStatus(body) {
        return this.productionService.batchMoveToStatus(body.jobIds, body.status, body.operatorName);
    }
    async assignPrinter(jobId, body) {
        return this.productionService.assignToPrinter(jobId, body.printerId);
    }
    async recordQc(jobId, body) {
        return this.productionService.recordQcResult(jobId, body.result, body.notes);
    }
    async getPrinters(merchantId) {
        return this.productionService.getPrinters(merchantId);
    }
    async createPrinter(merchantId, body) {
        return this.productionService.createPrinter(merchantId, body);
    }
    async updateInk(printerId, body) {
        return this.productionService.updateInkLevels(printerId, body);
    }
    async updatePrinterStatus(printerId, body) {
        return this.productionService.updatePrinterStatus(printerId, body.status, body.notes);
    }
    async getPrinterStats(merchantId) {
        return this.productionService.getPrinterStats(merchantId);
    }
    async createGangBatch(merchantId, body) {
        return this.productionService.createGangSheetBatch(merchantId, body);
    }
    async getGangBatches(merchantId, status) {
        return this.productionService.getGangSheetBatches(merchantId, status);
    }
};
exports.ProductionController = ProductionController;
__decorate([
    (0, common_1.Get)('board'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductionController.prototype, "getBoard", null);
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductionController.prototype, "getStats", null);
__decorate([
    (0, common_1.Post)('jobs/from-order/:orderId'),
    (0, common_1.HttpCode)(201),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Param)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ProductionController.prototype, "createFromOrder", null);
__decorate([
    (0, common_1.Post)('jobs'),
    (0, common_1.HttpCode)(201),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProductionController.prototype, "createJob", null);
__decorate([
    (0, common_1.Patch)('jobs/:jobId/status'),
    __param(0, (0, common_1.Param)('jobId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProductionController.prototype, "moveStatus", null);
__decorate([
    (0, common_1.Patch)('jobs/batch-status'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProductionController.prototype, "batchMoveStatus", null);
__decorate([
    (0, common_1.Patch)('jobs/:jobId/assign-printer'),
    __param(0, (0, common_1.Param)('jobId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProductionController.prototype, "assignPrinter", null);
__decorate([
    (0, common_1.Patch)('jobs/:jobId/qc'),
    __param(0, (0, common_1.Param)('jobId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProductionController.prototype, "recordQc", null);
__decorate([
    (0, common_1.Get)('printers'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductionController.prototype, "getPrinters", null);
__decorate([
    (0, common_1.Post)('printers'),
    (0, common_1.HttpCode)(201),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProductionController.prototype, "createPrinter", null);
__decorate([
    (0, common_1.Patch)('printers/:printerId/ink'),
    __param(0, (0, common_1.Param)('printerId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProductionController.prototype, "updateInk", null);
__decorate([
    (0, common_1.Patch)('printers/:printerId/status'),
    __param(0, (0, common_1.Param)('printerId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProductionController.prototype, "updatePrinterStatus", null);
__decorate([
    (0, common_1.Get)('printers/stats'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductionController.prototype, "getPrinterStats", null);
__decorate([
    (0, common_1.Post)('gang-batches'),
    (0, common_1.HttpCode)(201),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProductionController.prototype, "createGangBatch", null);
__decorate([
    (0, common_1.Get)('gang-batches'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ProductionController.prototype, "getGangBatches", null);
exports.ProductionController = ProductionController = __decorate([
    (0, common_1.Controller)('production'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [production_service_1.ProductionService])
], ProductionController);
//# sourceMappingURL=production.controller.js.map