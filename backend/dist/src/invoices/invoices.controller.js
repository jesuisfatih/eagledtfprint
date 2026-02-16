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
exports.InvoiceController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const invoices_service_1 = require("./invoices.service");
let InvoiceController = class InvoiceController {
    invoiceService;
    constructor(invoiceService) {
        this.invoiceService = invoiceService;
    }
    async create(req, body) {
        return this.invoiceService.createInvoice(req.user.merchantId, body);
    }
    async uploadInvoice(req, file, body) {
        const fileUrl = `/uploads/invoices/${file.filename}`;
        if (body.invoiceId) {
            return this.invoiceService.updateFileUrl(body.invoiceId, req.user.merchantId, fileUrl);
        }
        return this.invoiceService.createInvoice(req.user.merchantId, {
            ...body,
            fileUrl,
        });
    }
    async getStatistics(req) {
        return this.invoiceService.getStatistics(req.user.merchantId);
    }
    async findAll(req, query) {
        return this.invoiceService.findAll(req.user.merchantId, query);
    }
    async findOne(req, id) {
        return this.invoiceService.findOne(id, req.user.merchantId);
    }
    async updateStatus(req, id, status, amountPaid) {
        return this.invoiceService.updateStatus(id, req.user.merchantId, status, amountPaid);
    }
    async recordPayment(req, id, amount) {
        return this.invoiceService.recordPayment(id, req.user.merchantId, amount);
    }
    async duplicateInvoice(req, id) {
        return this.invoiceService.duplicateInvoice(id, req.user.merchantId);
    }
    async markOverdue(req) {
        return this.invoiceService.markOverdueInvoices(req.user.merchantId);
    }
};
exports.InvoiceController = InvoiceController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], InvoiceController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: './uploads/invoices',
            filename: (_req, file, cb) => {
                const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
                cb(null, `inv-${uniqueSuffix}${(0, path_1.extname)(file.originalname)}`);
            },
        }),
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            const allowed = ['.pdf', '.png', '.jpg', '.jpeg'];
            if (allowed.includes((0, path_1.extname)(file.originalname).toLowerCase())) {
                cb(null, true);
            }
            else {
                cb(new Error('Only PDF, PNG, JPG files are allowed'), false);
            }
        },
    })),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], InvoiceController.prototype, "uploadInvoice", null);
__decorate([
    (0, common_1.Get)('statistics'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InvoiceController.prototype, "getStatistics", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], InvoiceController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], InvoiceController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('status')),
    __param(3, (0, common_1.Body)('amountPaid')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Number]),
    __metadata("design:returntype", Promise)
], InvoiceController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Post)(':id/record-payment'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('amount')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number]),
    __metadata("design:returntype", Promise)
], InvoiceController.prototype, "recordPayment", null);
__decorate([
    (0, common_1.Post)(':id/duplicate'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], InvoiceController.prototype, "duplicateInvoice", null);
__decorate([
    (0, common_1.Post)('mark-overdue'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InvoiceController.prototype, "markOverdue", null);
exports.InvoiceController = InvoiceController = __decorate([
    (0, common_1.Controller)('invoices'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [invoices_service_1.InvoiceService])
], InvoiceController);
//# sourceMappingURL=invoices.controller.js.map