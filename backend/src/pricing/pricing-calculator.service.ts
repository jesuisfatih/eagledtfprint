import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface PricingContext {
  merchantId: string;
  companyId: string;
  companyUserId?: string;
  variantIds: bigint[];
  quantities?: { [variantId: string]: number };
  cartTotal?: number;
}

export interface CalculatedPrice {
  variantId: bigint;
  listPrice: number;
  companyPrice: number;
  discount: number;
  discountPercentage: number;
  appliedRuleId?: string;
  appliedRuleName?: string;
}

@Injectable()
export class PricingCalculatorService {
  private readonly logger = new Logger(PricingCalculatorService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Calculate prices for multiple variants for a specific company
   */
  async calculatePrices(context: PricingContext): Promise<CalculatedPrice[]> {
    const { merchantId, companyId, variantIds, quantities = {} } = context;

    // Get company details
    let company: any = null;

    if (companyId) {
      try {
        company = await this.prisma.company.findUnique({
          where: { id: companyId },
        });
      } catch (err) {
        console.error('Company lookup error:', err);
      }
    }

    if (!company) {
      // Use default company for pricing calculation
      company = { id: companyId, companyGroup: null };
    }

    // Get variants with their products
    const variants = await this.prisma.catalogVariant.findMany({
      where: {
        shopifyVariantId: { in: variantIds },
      },
      include: {
        product: true,
      },
    });

    // Get all applicable pricing rules
    const pricingRules = await this.getApplicableRules(merchantId, company, context.companyUserId);

    const results: CalculatedPrice[] = [];

    for (const variant of variants) {
      const quantity = quantities[variant.shopifyVariantId.toString()] || 1;
      const listPrice = parseFloat(variant.price?.toString() || '0');

      // Find best applicable rule for this variant
      const bestRule = this.findBestRule(
        variant,
        company,
        pricingRules,
        quantity,
        context.cartTotal,
      );

      let companyPrice = listPrice;
      let appliedRuleId: string | undefined;
      let appliedRuleName: string | undefined;

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

  /**
   * Get all applicable pricing rules for a company and optionally a specific user
   */
  private async getApplicableRules(merchantId: string, company: any, companyUserId?: string) {
    const now = new Date();

    const targetConditions: any[] = [
      { targetType: 'all' },
      { targetType: 'company', targetCompanyId: company.id },
      {
        targetType: 'company_group',
        targetCompanyGroup: company.companyGroup,
      },
    ];

    // Add user-level targeting if companyUserId is provided
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

  /**
   * Find the best applicable rule for a specific variant
   */
  private findBestRule(
    variant: any,
    company: any,
    rules: any[],
    quantity: number,
    cartTotal?: number,
  ) {
    let bestRule: any = null;
    let bestDiscount = 0;

    for (const rule of rules) {
      // Check scope
      if (!this.isRuleApplicable(rule, variant)) {
        continue;
      }

      // Check cart minimum
      if (rule.minCartAmount && cartTotal && cartTotal < parseFloat(rule.minCartAmount.toString())) {
        continue;
      }

      // Calculate potential discount
      const listPrice = parseFloat(variant.price?.toString() || '0');
      const rulePrice = this.applyRule(listPrice, rule, quantity);
      const discount = listPrice - rulePrice;

      // Keep the best discount
      if (discount > bestDiscount) {
        bestDiscount = discount;
        bestRule = rule;
      }
    }

    return bestRule;
  }

  /**
   * Check if rule is applicable to variant
   */
  private isRuleApplicable(rule: any, variant: any): boolean {
    const { scopeType, scopeProductIds, scopeCollectionIds, scopeTags, scopeVariantIds } = rule;

    // All products
    if (scopeType === 'all') {
      return true;
    }

    // Specific variants
    if (scopeType === 'variants' && scopeVariantIds?.length > 0) {
      return scopeVariantIds.some((id: bigint) => id === variant.shopifyVariantId);
    }

    // Specific products
    if (scopeType === 'products' && scopeProductIds?.length > 0) {
      return scopeProductIds.some((id: bigint) => id === variant.product.shopifyProductId);
    }

    // Collections
    if (scopeType === 'collections' && scopeCollectionIds?.length > 0) {
      // Check if product is in any of the collections
      const productCollections = variant.product.collections || [];
      return scopeCollectionIds.some((collId: bigint) =>
        productCollections.some((pc: any) => pc.id === collId),
      );
    }

    // Tags
    if (scopeType === 'tags' && scopeTags) {
      const productTags = variant.product.tags?.split(',').map((t: string) => t.trim()) || [];
      const ruleTags = scopeTags.split(',').map((t: string) => t.trim());
      return ruleTags.some((tag: string) => productTags.includes(tag));
    }

    return false;
  }

  /**
   * Apply pricing rule to a base price
   */
  private applyRule(listPrice: number, rule: any, quantity: number): number {
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
          // Find applicable qty break
          let applicableBreak: any = null;
          for (const brk of qtyBreaks as any[]) {
            if (quantity >= brk.min_qty) {
              if (!applicableBreak || brk.min_qty > applicableBreak.min_qty) {
                applicableBreak = brk;
              }
            }
          }

          if (applicableBreak) {
            if (applicableBreak.discount_type === 'percentage') {
              return listPrice * (1 - applicableBreak.discount / 100);
            } else if (applicableBreak.discount_type === 'fixed_amount') {
              return Math.max(0, listPrice - applicableBreak.discount);
            }
          }
        }
        break;
    }

    return listPrice;
  }

  /**
   * Calculate cart-level pricing (for checkout)
   */
  async calculateCartPricing(cartId: string) {
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
    const appliedRules: string[] = [];

    for (const item of cart.items) {
      if (!item.variant) continue;

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

      // Update cart item with calculated price
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

    // Update cart totals
    await this.prisma.cart.update({
      where: { id: cartId },
      data: {
        subtotal: subtotal,
        discountTotal: discountTotal,
        total: subtotal, // Tax will be calculated separately
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
}
