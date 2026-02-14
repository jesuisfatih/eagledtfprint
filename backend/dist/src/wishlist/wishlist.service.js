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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WishlistService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let WishlistService = class WishlistService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getOrCreateWishlist(userId, companyId, merchantId) {
        let wishlist = await this.prisma.wishlist.findFirst({
            where: { companyUserId: userId, merchantId },
            include: { items: true },
        });
        if (!wishlist) {
            wishlist = await this.prisma.wishlist.create({
                data: {
                    merchantId,
                    companyId,
                    companyUserId: userId,
                    name: 'My Wishlist',
                },
                include: { items: true },
            });
        }
        return wishlist;
    }
    async getWishlist(userId, companyId, merchantId) {
        const wishlist = await this.getOrCreateWishlist(userId, companyId, merchantId);
        return wishlist.items.sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime());
    }
    async addToWishlist(userId, companyId, merchantId, dto) {
        const wishlist = await this.getOrCreateWishlist(userId, companyId, merchantId);
        const existing = await this.prisma.wishlistItem.findFirst({
            where: {
                wishlistId: wishlist.id,
                productId: dto.productId,
            },
        });
        if (existing) {
            throw new common_1.ConflictException('Product already in wishlist');
        }
        return this.prisma.wishlistItem.create({
            data: {
                wishlistId: wishlist.id,
                productId: dto.productId,
                variantId: dto.variantId,
                productTitle: dto.productTitle || 'Unknown Product',
                variantTitle: dto.variantTitle,
                productImage: dto.productImage,
                price: dto.price || 0,
            },
        });
    }
    async removeFromWishlist(userId, productId, merchantId) {
        const wishlist = await this.prisma.wishlist.findFirst({
            where: { companyUserId: userId, merchantId },
        });
        if (!wishlist) {
            throw new common_1.NotFoundException('Wishlist not found');
        }
        const item = await this.prisma.wishlistItem.findFirst({
            where: {
                wishlistId: wishlist.id,
                productId,
            },
        });
        if (!item) {
            throw new common_1.NotFoundException('Product not found in wishlist');
        }
        return this.prisma.wishlistItem.delete({
            where: { id: item.id },
        });
    }
    async clearWishlist(userId, merchantId) {
        const wishlist = await this.prisma.wishlist.findFirst({
            where: { companyUserId: userId, merchantId },
        });
        if (!wishlist) {
            return;
        }
        return this.prisma.wishlistItem.deleteMany({
            where: { wishlistId: wishlist.id },
        });
    }
    async isInWishlist(userId, productId, merchantId) {
        const wishlist = await this.prisma.wishlist.findFirst({
            where: { companyUserId: userId, merchantId },
        });
        if (!wishlist) {
            return false;
        }
        const item = await this.prisma.wishlistItem.findFirst({
            where: {
                wishlistId: wishlist.id,
                productId,
            },
        });
        return !!item;
    }
    async getWishlistCount(userId, merchantId) {
        const wishlist = await this.prisma.wishlist.findFirst({
            where: { companyUserId: userId, merchantId },
        });
        if (!wishlist) {
            return 0;
        }
        return this.prisma.wishlistItem.count({
            where: { wishlistId: wishlist.id },
        });
    }
};
exports.WishlistService = WishlistService;
exports.WishlistService = WishlistService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WishlistService);
//# sourceMappingURL=wishlist.service.js.map