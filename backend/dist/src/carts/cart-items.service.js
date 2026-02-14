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
exports.CartItemsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CartItemsService = class CartItemsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async addItem(cartId, variantId, shopifyVariantId, quantity) {
        const existing = await this.prisma.cartItem.findFirst({
            where: {
                cartId,
                shopifyVariantId,
            },
        });
        if (existing) {
            return this.updateQuantity(existing.id, existing.quantity + quantity);
        }
        const variant = await this.prisma.catalogVariant.findUnique({
            where: { id: variantId },
            include: { product: true },
        });
        if (!variant) {
            throw new common_1.NotFoundException('Variant not found');
        }
        return this.prisma.cartItem.create({
            data: {
                cartId,
                variantId,
                shopifyVariantId,
                shopifyProductId: variant.product.shopifyProductId,
                sku: variant.sku,
                title: variant.product.title,
                variantTitle: variant.title,
                quantity,
                listPrice: variant.price || 0,
                unitPrice: variant.price || 0,
            },
        });
    }
    async updateQuantity(itemId, quantity) {
        if (quantity <= 0) {
            return this.removeItem(itemId);
        }
        return this.prisma.cartItem.update({
            where: { id: itemId },
            data: { quantity },
        });
    }
    async removeItem(itemId) {
        return this.prisma.cartItem.delete({
            where: { id: itemId },
        });
    }
    async clearCart(cartId) {
        return this.prisma.cartItem.deleteMany({
            where: { cartId },
        });
    }
};
exports.CartItemsService = CartItemsService;
exports.CartItemsService = CartItemsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CartItemsService);
//# sourceMappingURL=cart-items.service.js.map