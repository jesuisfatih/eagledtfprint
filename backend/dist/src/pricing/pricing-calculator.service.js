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
var PricingCalculatorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingCalculatorService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let PricingCalculatorService = PricingCalculatorService_1 = class PricingCalculatorService {
    prisma;
    logger = new common_1.Logger(PricingCalculatorService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async calculatePrices(context) {
        const { merchantId, companyId, variantIds, quantities = {} } = context;
        let company = null;
        if (companyId) {
            try {
                company = await this.prisma.company.findUnique({
                    where: { id: companyId },
                });
            }
            catch (err) {
                console.error('Company lookup error:', err);
            }
        }
        if (!company) {
            company = { id: companyId, companyGroup: null };
        }
        const variants = await this.prisma.catalogVariant.findMany({
            where: {
                shopifyVariantId: { in: variantIds },
            },
            include: {
                product: true,
            },
        });
        const pricingRules = await this.getApplicableRules(merchantId, company, context.companyUserId);
        const results = [];
        for (const variant of variants) {
            const quantity = quantities[variant.shopifyVariantId.toString()] || 1;
            const listPrice = parseFloat(variant.price?.toString() || '0');
            const bestRule = this.findBestRule(variant, company, pricingRules, quantity, context.cartTotal);
            let companyPrice = listPrice;
            let appliedRuleId;
            let appliedRuleName;
            if (bestRule) {
                companyPrice = this.applyRule(listPrice, bestRule, quantity);
                appliedRuleId = bestRule.id;
                appliedRuleName = bestRule.name;
            }
            const discount = listPrice - companyPrice;
            const discountPercentage = listPrice > 0 ? (discount / listPrice) * 100 : 0;
            results.push({
                variantId: variant.shopifyVariantId,
                listPrice,
                companyPrice,
                discount,
                discountPercentage: Math.round(discountPercentage * 100) / 100,
                appliedRuleId,
                appliedRuleName,
            });
        }
        return results;
    }
    async getApplicableRules(merchantId, company, companyUserId) {
        const now = new Date();
        const targetConditions = [
            { targetType: 'all' },
            { targetType: 'company', targetCompanyId: company.id },
            {
                targetType: 'company_group',
                targetCompanyGroup: company.companyGroup,
            },
        ];
        if (companyUserId) {
            targetConditions.push({
                targetType: 'company_user',
                targetCompanyUserId: companyUserId,
            });
        }
        const rules = await this.prisma.pricingRule.findMany({
            where: {
                merchantId,
                isActive: true,
                OR: [
                    {
                        validFrom: null,
                        validUntil: null,
                    },
                    {
                        validFrom: { lte: now },
                        validUntil: { gte: now },
                    },
                    {
                        validFrom: { lte: now },
                        validUntil: null,
                    },
                    {
                        validFrom: null,
                        validUntil: { gte: now },
                    },
                ],
                AND: [
                    {
                        OR: targetConditions,
                    },
                ],
            },
            orderBy: {
                priority: 'desc',
            },
        });
        return rules;
    }
    findBestRule(variant, company, rules, quantity, cartTotal) {
        let bestRule = null;
        let bestDiscount = 0;
        for (const rule of rules) {
            if (!this.isRuleApplicable(rule, variant)) {
                continue;
            }
            if (rule.minCartAmount && cartTotal && cartTotal < parseFloat(rule.minCartAmount.toString())) {
                continue;
            }
            const listPrice = parseFloat(variant.price?.toString() || '0');
            const rulePrice = this.applyRule(listPrice, rule, quantity);
            const discount = listPrice - rulePrice;
            if (discount > bestDiscount) {
                bestDiscount = discount;
                bestRule = rule;
            }
        }
        return bestRule;
    }
    isRuleApplicable(rule, variant) {
        const { scopeType, scopeProductIds, scopeCollectionIds, scopeTags, scopeVariantIds } = rule;
        if (scopeType === 'all') {
            return true;
        }
        if (scopeType === 'variants' && scopeVariantIds?.length > 0) {
            return scopeVariantIds.some((id) => id === variant.shopifyVariantId);
        }
        if (scopeType === 'products' && scopeProductIds?.length > 0) {
            return scopeProductIds.some((id) => id === variant.product.shopifyProductId);
        }
        if (scopeType === 'collections' && scopeCollectionIds?.length > 0) {
            const productCollections = variant.product.collections || [];
            return scopeCollectionIds.some((collId) => productCollections.some((pc) => pc.id === collId));
        }
        if (scopeType === 'tags' && scopeTags) {
            const productTags = variant.product.tags?.split(',').map((t) => t.trim()) || [];
            const ruleTags = scopeTags.split(',').map((t) => t.trim());
            return ruleTags.some((tag) => productTags.includes(tag));
        }
        return false;
    }
    applyRule(listPrice, rule, quantity) {
        const { discountType, discountValue, discountPercentage, qtyBreaks } = rule;
        switch (discountType) {
            case 'percentage':
                if (discountPercentage) {
                    const percent = parseFloat(discountPercentage.toString());
                    return listPrice * (1 - percent / 100);
                }
                break;
            case 'fixed_amount':
                if (discountValue) {
                    const amount = parseFloat(discountValue.toString());
                    return Math.max(0, listPrice - amount);
                }
                break;
            case 'fixed_price':
                if (discountValue) {
                    return parseFloat(discountValue.toString());
                }
                break;
            case 'qty_break':
                if (qtyBreaks && Array.isArray(qtyBreaks)) {
                    let applicableBreak = null;
                    for (const brk of qtyBreaks) {
                        if (quantity >= brk.min_qty) {
                            if (!applicableBreak || brk.min_qty > applicableBreak.min_qty) {
                                applicableBreak = brk;
                            }
                        }
                    }
                    if (applicableBreak) {
                        if (applicableBreak.discount_type === 'percentage') {
                            return listPrice * (1 - applicableBreak.discount / 100);
                        }
                        else if (applicableBreak.discount_type === 'fixed_amount') {
                            return Math.max(0, listPrice - applicableBreak.discount);
                        }
                    }
                }
                break;
        }
        return listPrice;
    }
    async calculateCartPricing(cartId) {
        const cart = await this.prisma.cart.findUnique({
            where: { id: cartId },
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
                company: true,
            },
        });
        if (!cart) {
            throw new Error('Cart not found');
        }
        let subtotal = 0;
        let discountTotal = 0;
        const appliedRules = [];
        for (const item of cart.items) {
            if (!item.variant)
                continue;
            const prices = await this.calculatePrices({
                merchantId: cart.merchantId,
                companyId: cart.companyId,
                variantIds: [item.variant.shopifyVariantId],
                quantities: { [item.variant.shopifyVariantId.toString()]: item.quantity },
            });
            const price = prices[0];
            const lineTotal = price.companyPrice * item.quantity;
            const lineDiscount = price.discount * item.quantity;
            subtotal += lineTotal;
            discountTotal += lineDiscount;
            if (price.appliedRuleId && !appliedRules.includes(price.appliedRuleId)) {
                appliedRules.push(price.appliedRuleId);
            }
            await this.prisma.cartItem.update({
                where: { id: item.id },
                data: {
                    listPrice: price.listPrice,
                    unitPrice: price.companyPrice,
                    discountAmount: price.discount,
                    lineTotal: lineTotal,
                    appliedPricingRuleId: price.appliedRuleId,
                },
            });
        }
        await this.prisma.cart.update({
            where: { id: cartId },
            data: {
                subtotal: subtotal,
                discountTotal: discountTotal,
                total: subtotal,
                appliedPricingRules: appliedRules,
            },
        });
        return {
            subtotal,
            discountTotal,
            total: subtotal,
            appliedRules,
        };
    }
};
exports.PricingCalculatorService = PricingCalculatorService;
exports.PricingCalculatorService = PricingCalculatorService = PricingCalculatorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PricingCalculatorService);
//# sourceMappingURL=pricing-calculator.service.js.map