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
exports.WishlistController = void 0;
const common_1 = require("@nestjs/common");
const wishlist_service_1 = require("./wishlist.service");
const add_to_wishlist_dto_1 = require("./dto/add-to-wishlist.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let WishlistController = class WishlistController {
    wishlistService;
    constructor(wishlistService) {
        this.wishlistService = wishlistService;
    }
    async getWishlist(id, currentUserId, companyId, merchantId) {
        const userId = id === 'me' ? currentUserId : id;
        if (userId !== currentUserId) {
            throw new common_1.BadRequestException('You can only view your own wishlist');
        }
        return this.wishlistService.getWishlist(userId, companyId, merchantId);
    }
    async addToWishlist(id, currentUserId, companyId, merchantId, dto) {
        const userId = id === 'me' ? currentUserId : id;
        if (userId !== currentUserId) {
            throw new common_1.BadRequestException('You can only modify your own wishlist');
        }
        return this.wishlistService.addToWishlist(userId, companyId, merchantId, dto);
    }
    async removeFromWishlist(id, productId, currentUserId, merchantId) {
        const userId = id === 'me' ? currentUserId : id;
        if (userId !== currentUserId) {
            throw new common_1.BadRequestException('You can only modify your own wishlist');
        }
        await this.wishlistService.removeFromWishlist(userId, productId, merchantId);
        return { success: true };
    }
    async clearWishlist(id, currentUserId, merchantId) {
        const userId = id === 'me' ? currentUserId : id;
        if (userId !== currentUserId) {
            throw new common_1.BadRequestException('You can only modify your own wishlist');
        }
        await this.wishlistService.clearWishlist(userId, merchantId);
        return { success: true };
    }
    async checkWishlist(id, productId, currentUserId, merchantId) {
        const userId = id === 'me' ? currentUserId : id;
        const isInWishlist = await this.wishlistService.isInWishlist(userId, productId, merchantId);
        return { isInWishlist };
    }
    async getWishlistCount(id, currentUserId, merchantId) {
        const userId = id === 'me' ? currentUserId : id;
        const count = await this.wishlistService.getWishlistCount(userId, merchantId);
        return { count };
    }
};
exports.WishlistController = WishlistController;
__decorate([
    (0, common_1.Get)(':id/wishlist'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(3, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], WishlistController.prototype, "getWishlist", null);
__decorate([
    (0, common_1.Post)(':id/wishlist'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(3, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(4, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, add_to_wishlist_dto_1.AddToWishlistDto]),
    __metadata("design:returntype", Promise)
], WishlistController.prototype, "addToWishlist", null);
__decorate([
    (0, common_1.Delete)(':id/wishlist/:productId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('productId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(3, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], WishlistController.prototype, "removeFromWishlist", null);
__decorate([
    (0, common_1.Delete)(':id/wishlist'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], WishlistController.prototype, "clearWishlist", null);
__decorate([
    (0, common_1.Get)(':id/wishlist/check/:productId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('productId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(3, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], WishlistController.prototype, "checkWishlist", null);
__decorate([
    (0, common_1.Get)(':id/wishlist/count'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], WishlistController.prototype, "getWishlistCount", null);
exports.WishlistController = WishlistController = __decorate([
    (0, common_1.Controller)('users'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [wishlist_service_1.WishlistService])
], WishlistController);
//# sourceMappingURL=wishlist.controller.js.map