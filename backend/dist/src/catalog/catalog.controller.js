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
exports.CatalogController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const catalog_service_1 = require("./catalog.service");
let CatalogController = class CatalogController {
    catalogService;
    constructor(catalogService) {
        this.catalogService = catalogService;
    }
    async getProducts(merchantId, search, page, limit, status, vendor, productType, inStock, collection) {
        if (!merchantId) {
            throw new common_1.BadRequestException('Merchant ID required');
        }
        if (collection) {
            return this.catalogService.getProductsByCollection(merchantId, collection, (() => { const n = page ? parseInt(page, 10) : 1; return Number.isFinite(n) ? n : 1; })(), (() => { const n = limit ? parseInt(limit, 10) : 20; return Number.isFinite(n) ? n : 20; })());
        }
        return this.catalogService.getProducts(merchantId, {
            search,
            page: (() => { const n = page ? parseInt(page, 10) : undefined; return n !== undefined && Number.isFinite(n) ? n : undefined; })(),
            limit: (() => { const n = limit ? parseInt(limit, 10) : undefined; return n !== undefined && Number.isFinite(n) ? n : undefined; })(),
            status,
            vendor,
            productType,
            inStock: inStock === 'true' ? true : inStock === 'false' ? false : undefined,
        });
    }
    async getProductFilters(merchantId) {
        if (!merchantId) {
            throw new common_1.BadRequestException('Merchant ID required');
        }
        return this.catalogService.getProductFilters(merchantId);
    }
    async searchProducts(merchantId, query, limit) {
        if (!merchantId) {
            throw new common_1.BadRequestException('Merchant ID required');
        }
        if (!query) {
            throw new common_1.BadRequestException('Search query required');
        }
        const parsedLimit = limit ? parseInt(limit, 10) : 20;
        return this.catalogService.searchProducts(merchantId, query, Number.isFinite(parsedLimit) ? parsedLimit : 20);
    }
    async getProduct(id) {
        return this.catalogService.getProduct(id);
    }
    async getVariant(id) {
        return this.catalogService.getVariant(id);
    }
};
exports.CatalogController = CatalogController;
__decorate([
    (0, common_1.Get)('products'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Query)('search')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('status')),
    __param(5, (0, common_1.Query)('vendor')),
    __param(6, (0, common_1.Query)('productType')),
    __param(7, (0, common_1.Query)('inStock')),
    __param(8, (0, common_1.Query)('collection')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], CatalogController.prototype, "getProducts", null);
__decorate([
    (0, common_1.Get)('products/filters'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CatalogController.prototype, "getProductFilters", null);
__decorate([
    (0, common_1.Get)('products/search'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Query)('q')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], CatalogController.prototype, "searchProducts", null);
__decorate([
    (0, common_1.Get)('products/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CatalogController.prototype, "getProduct", null);
__decorate([
    (0, common_1.Get)('variants/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CatalogController.prototype, "getVariant", null);
exports.CatalogController = CatalogController = __decorate([
    (0, common_1.Controller)('catalog'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [catalog_service_1.CatalogService])
], CatalogController);
//# sourceMappingURL=catalog.controller.js.map