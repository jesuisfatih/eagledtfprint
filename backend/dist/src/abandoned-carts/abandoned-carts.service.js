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
var AbandonedCartsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbandonedCartsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AbandonedCartsService = AbandonedCartsService_1 = class AbandonedCartsService {
    prisma;
    logger = new common_1.Logger(AbandonedCartsService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAbandonedCarts(merchantId, companyId, includeRecent = false) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const anonymousCompany = await this.prisma.company.findFirst({
            where: {
                merchantId,
                name: 'Anonymous Customers',
            },
        });
        const where = {
            merchantId,
            convertedToOrderId: null,
        };
        if (companyId) {
            where.companyId = companyId;
        }
        else {
        }
        if (includeRecent === true) {
            this.logger.log('✅ Admin view: Showing ALL carts (including recent) - no time filter');
        }
        else {
            where.updatedAt = { lt: oneHourAgo };
            this.logger.log(`⏰ User view: Filtering carts older than ${oneHourAgo.toISOString()}`);
        }
        this.logger.log(`Querying abandoned carts: merchantId=${merchantId}, companyId=${companyId}, includeRecent=${includeRecent}, anonymousCompanyId=${anonymousCompany?.id}`);
        this.logger.log(`Where clause: ${JSON.stringify(where, null, 2)}`);
        const carts = await this.prisma.cart.findMany({
            where,
            include: {
                items: {
                    include: {
                        variant: {
                            include: {
                                product: true,
                            },
                        },
                    },
                },
                company: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });
        const anonymousCount = carts.filter(c => c.company?.name === 'Anonymous Customers').length;
        this.logger.log(`Found ${carts.length} abandoned carts. Anonymous: ${anonymousCount}, Regular: ${carts.length - anonymousCount}`);
        return carts;
    }
    async getCartActivityLogs(cartId) {
        const cart = await this.prisma.cart.findUnique({
            where: { id: cartId },
            select: { merchantId: true },
        });
        if (!cart) {
            return [];
        }
        const logs = await this.prisma.activityLog.findMany({
            where: {
                merchantId: cart.merchantId,
                eventType: {
                    in: ['cart_created', 'cart_items_added', 'cart_item_added', 'cart_item_removed', 'cart_item_updated', 'cart_company_updated'],
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 1000,
        });
        return logs.filter(log => {
            const payload = log.payload;
            return payload?.cartId === cartId;
        });
    }
    async getAllCartActivityLogs(merchantId, limit = 100) {
        return this.prisma.activityLog.findMany({
            where: {
                merchantId,
                eventType: {
                    in: ['cart_created', 'cart_items_added', 'cart_item_added', 'cart_item_removed', 'cart_item_updated', 'cart_company_updated'],
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: limit,
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }
    async syncShopifyCart(data) {
        let merchantId = null;
        if (data.shop) {
            const merchant = await this.prisma.merchant.findFirst({
                where: { shopDomain: data.shop },
            });
            if (merchant) {
                merchantId = merchant.id;
            }
        }
        if (!merchantId && data.customerEmail) {
            const user = await this.prisma.companyUser.findUnique({
                where: { email: data.customerEmail },
                include: { company: { include: { merchant: true } } },
            });
            if (user?.company?.merchantId) {
                merchantId = user.company.merchantId;
            }
        }
        if (!merchantId) {
            throw new Error('Could not determine merchant for cart sync');
        }
        let companyId = data.companyId || null;
        let userId = data.userId || null;
        if (data.customerEmail && !userId) {
            const user = await this.prisma.companyUser.findUnique({
                where: { email: data.customerEmail },
                include: { company: true },
            });
            if (user) {
                userId = user.id;
                companyId = user.companyId;
            }
        }
        if (data.shopifyCustomerId && !userId) {
            const user = await this.prisma.companyUser.findFirst({
                where: { shopifyCustomerId: BigInt(data.shopifyCustomerId) },
                include: { company: true },
            });
            if (user) {
                userId = user.id;
                companyId = user.companyId;
            }
        }
        const cleanCartToken = (data.cartToken || data.shopifyCartId || '').split('?')[0];
        let cart = await this.prisma.cart.findFirst({
            where: {
                merchantId,
                OR: [
                    { shopifyCartId: cleanCartToken },
                    { shopifyCartId: data.cartToken || data.shopifyCartId },
                ],
            },
        });
        const isNewCart = !cart;
        const previousItemCount = cart ? (await this.prisma.cartItem.count({ where: { cartId: cart.id } })) : 0;
        if (!cart) {
            let finalCompanyId = companyId;
            if (!finalCompanyId) {
                const anonymousCompany = await this.prisma.company.findFirst({
                    where: {
                        merchantId,
                        name: 'Anonymous Customers',
                    },
                });
                if (anonymousCompany) {
                    finalCompanyId = anonymousCompany.id;
                }
                else {
                    const newAnonymousCompany = await this.prisma.company.create({
                        data: {
                            merchantId,
                            name: 'Anonymous Customers',
                            status: 'active',
                        },
                    });
                    finalCompanyId = newAnonymousCompany.id;
                }
            }
            const cartData = {
                merchantId,
                companyId: finalCompanyId,
                shopifyCartId: cleanCartToken,
                status: 'draft',
                metadata: {
                    isAnonymous: !userId,
                    customerEmail: data.customerEmail || null,
                    shopifyCustomerId: data.shopifyCustomerId || null,
                    source: 'shopify_snippet',
                },
            };
            if (userId) {
                cartData.createdByUserId = userId;
            }
            cart = await this.prisma.cart.create({
                data: cartData,
            });
            this.logger.log(`Cart created: id=${cart.id}, companyId=${cart.companyId}, isAnonymous=${!userId}`);
            await this.logCartActivity(cart.id, merchantId, finalCompanyId, 'cart_created', {
                isAnonymous: !userId,
                customerEmail: data.customerEmail,
                itemCount: data.items?.length || 0,
            });
        }
        else {
            const oldCompanyId = cart.companyId;
            await this.prisma.cart.update({
                where: { id: cart.id },
                data: {
                    companyId: companyId || cart.companyId,
                    createdByUserId: userId || cart.createdByUserId,
                    updatedAt: new Date(),
                    metadata: {
                        ...(cart.metadata || {}),
                        isAnonymous: !userId,
                        customerEmail: data.customerEmail || cart.metadata?.customerEmail || null,
                        shopifyCustomerId: data.shopifyCustomerId || cart.metadata?.shopifyCustomerId || null,
                        lastSyncAt: new Date().toISOString(),
                    },
                },
            });
            if (oldCompanyId !== (companyId || cart.companyId)) {
                await this.logCartActivity(cart.id, merchantId, companyId || cart.companyId, 'cart_company_updated', {
                    oldCompanyId,
                    newCompanyId: companyId || cart.companyId,
                });
            }
        }
        const currentItems = await this.prisma.cartItem.findMany({
            where: { cartId: cart.id },
        });
        await this.prisma.cartItem.deleteMany({
            where: { cartId: cart.id },
        });
        const newItems = [];
        for (const item of data.items || []) {
            try {
                const variantId = item.variant_id || item.variantId;
                const productId = item.product_id || item.productId;
                const price = item.price ? (typeof item.price === 'string' ? parseFloat(item.price) : item.price) : 0;
                if (!variantId || !productId) {
                    this.logger.warn(`Skipping item: missing variantId or productId`, { item });
                    continue;
                }
                let variantIdBigInt;
                let productIdBigInt;
                try {
                    variantIdBigInt = BigInt(variantId);
                    productIdBigInt = BigInt(productId);
                }
                catch (e) {
                    this.logger.error(`Failed to convert to BigInt:`, { variantId, productId, error: e });
                    continue;
                }
                const variant = await this.prisma.catalogVariant.findUnique({
                    where: { shopifyVariantId: variantIdBigInt },
                    include: { product: true },
                });
                const cartItem = await this.prisma.cartItem.create({
                    data: {
                        cartId: cart.id,
                        variantId: variant?.id,
                        shopifyVariantId: variantIdBigInt,
                        shopifyProductId: productIdBigInt,
                        sku: item.sku || variant?.sku || '',
                        title: item.title || variant?.title || '',
                        quantity: item.quantity || 1,
                        listPrice: price > 1000 ? price / 100 : price,
                        unitPrice: price > 1000 ? price / 100 : price,
                    },
                });
                newItems.push(cartItem);
            }
            catch (itemError) {
                this.logger.error(`Failed to process cart item:`, {
                    item,
                    error: itemError.message,
                    stack: itemError.stack,
                });
            }
        }
        const newItemCount = newItems.length;
        if (isNewCart) {
            await this.logCartActivity(cart.id, merchantId, cart.companyId, 'cart_items_added', {
                itemCount: newItemCount,
                items: newItems.map(i => ({ sku: i.sku, title: i.title, quantity: i.quantity })),
            });
        }
        else if (previousItemCount !== newItemCount) {
            const addedItems = newItems.filter(ni => ni.shopifyVariantId && !currentItems.some(ci => ci.shopifyVariantId && ci.shopifyVariantId.toString() === ni.shopifyVariantId.toString()));
            const removedItems = currentItems.filter(ci => {
                const ciVariantId = ci.shopifyVariantId;
                if (!ciVariantId)
                    return false;
                return !newItems.some(ni => {
                    if (!ni.shopifyVariantId)
                        return false;
                    return ni.shopifyVariantId.toString() === ciVariantId.toString();
                });
            });
            const updatedItems = newItems.filter(ni => {
                if (!ni.shopifyVariantId)
                    return false;
                const oldItem = currentItems.find(ci => ci.shopifyVariantId && ci.shopifyVariantId.toString() === ni.shopifyVariantId.toString());
                return oldItem && oldItem.quantity !== ni.quantity;
            });
            if (addedItems.length > 0) {
                await this.logCartActivity(cart.id, merchantId, cart.companyId, 'cart_item_added', {
                    items: addedItems.map(i => ({ sku: i.sku, title: i.title, quantity: i.quantity })),
                });
            }
            if (removedItems.length > 0) {
                await this.logCartActivity(cart.id, merchantId, cart.companyId, 'cart_item_removed', {
                    items: removedItems.map(i => ({ sku: i.sku, title: i.title })),
                });
            }
            if (updatedItems.length > 0) {
                await this.logCartActivity(cart.id, merchantId, cart.companyId, 'cart_item_updated', {
                    items: updatedItems.map(i => {
                        const oldItem = i.shopifyVariantId ? currentItems.find(ci => ci.shopifyVariantId && ci.shopifyVariantId.toString() === i.shopifyVariantId.toString()) : null;
                        return {
                            sku: i.sku,
                            title: i.title,
                            oldQuantity: oldItem?.quantity,
                            newQuantity: i.quantity,
                        };
                    }),
                });
            }
        }
        return cart;
    }
    async logCartActivity(cartId, merchantId, companyId, eventType, data) {
        try {
            await this.prisma.activityLog.create({
                data: {
                    merchantId,
                    companyId: companyId || undefined,
                    eventType,
                    payload: {
                        cartId,
                        ...data,
                        timestamp: new Date().toISOString(),
                    },
                },
            });
        }
        catch (error) {
            this.logger.error('Failed to log cart activity', error);
        }
    }
    async trackCart(data) {
        try {
            this.logger.log(`📦 Tracking cart: token=${data.cartToken}, items=${data.items?.length || 0}, email=${data.customerEmail || 'anonymous'}, shop=${data.shop || 'unknown'}`);
            const result = await this.syncShopifyCart({
                shop: data.shop,
                cartToken: data.cartToken || data.shopifyCartId,
                shopifyCartId: data.cartToken || data.shopifyCartId,
                customerEmail: data.customerEmail,
                shopifyCustomerId: data.shopifyCustomerId || data.customerId,
                items: data.items || [],
            });
            this.logger.log(`✅ Cart tracked successfully: id=${result.id}, companyId=${result.companyId}`);
            return result;
        }
        catch (error) {
            this.logger.error(`❌ Failed to track cart: ${error.message}`, error.stack);
            throw error;
        }
    }
    async markAsRestored(cartId, merchantId) {
        const cart = await this.prisma.cart.findFirst({
            where: { id: cartId, merchantId },
        });
        if (!cart) {
            throw new Error('Cart not found');
        }
        await this.prisma.cart.update({
            where: { id: cartId },
            data: { status: 'restored' },
        });
        this.logger.log(`Cart ${cartId} marked as restored`);
        return { success: true, message: 'Cart restored' };
    }
    async deleteCart(cartId, merchantId) {
        const cart = await this.prisma.cart.findFirst({
            where: { id: cartId, merchantId },
        });
        if (!cart) {
            throw new Error('Cart not found');
        }
        await this.prisma.cartItem.deleteMany({
            where: { cartId },
        });
        await this.prisma.cart.delete({
            where: { id: cartId },
        });
        this.logger.log(`Cart ${cartId} deleted`);
        return { success: true, message: 'Cart deleted' };
    }
};
exports.AbandonedCartsService = AbandonedCartsService;
exports.AbandonedCartsService = AbandonedCartsService = AbandonedCartsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AbandonedCartsService);
//# sourceMappingURL=abandoned-carts.service.js.map