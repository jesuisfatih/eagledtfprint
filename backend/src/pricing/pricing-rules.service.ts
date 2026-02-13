import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreatePricingRuleDto {
  name: string;
  description?: string;
  targetType: 'all' | 'company' | 'company_group' | 'company_user' | 'segment' | 'buyer_intent';
  targetCompanyId?: string;
  targetCompanyUserId?: string;
  targetCompanyGroup?: string;
  targetSegment?: string;
  targetBuyerIntent?: string;
  scopeType: 'all' | 'products' | 'collections' | 'tags' | 'variants';
  scopeProductIds?: bigint[];
  scopeCollectionIds?: bigint[];
  scopeTags?: string;
  scopeVariantIds?: bigint[];
  discountType: 'percentage' | 'fixed_amount' | 'fixed_price' | 'qty_break';
  discountValue?: number;
  discountPercentage?: number;
  qtyBreaks?: any[];
  minCartAmount?: number;
  priority?: number;
  isActive?: boolean;
  validFrom?: Date;
  validUntil?: Date;
}

@Injectable()
export class PricingRulesService {
  private readonly logger = new Logger(PricingRulesService.name);

  constructor(
    private prisma: PrismaService,
  ) {}

  async create(merchantId: string, dto: CreatePricingRuleDto) {
    try {
      const rule = await this.prisma.pricingRule.create({
        data: {
          merchantId,
          name: dto.name,
          description: dto.description,
          targetType: dto.targetType,
          targetCompanyId: dto.targetCompanyId,
          targetCompanyUserId: dto.targetCompanyUserId,
          targetCompanyGroup: dto.targetCompanyGroup,
          scopeType: dto.scopeType,
          scopeProductIds: dto.scopeProductIds || [],
          scopeCollectionIds: dto.scopeCollectionIds || [],
          scopeTags: dto.scopeTags,
          scopeVariantIds: dto.scopeVariantIds || [],
          discountType: dto.discountType,
          discountValue: dto.discountValue,
          discountPercentage: dto.discountPercentage,
          qtyBreaks: dto.qtyBreaks,
          minCartAmount: dto.minCartAmount,
          priority: dto.priority || 0,
          isActive: dto.isActive !== false,
          validFrom: dto.validFrom,
          validUntil: dto.validUntil,
        },
      });

      this.logger.log(`Pricing rule ${rule.id} created`);
      return rule;
    } catch (error) {
      this.logger.error('Failed to create pricing rule', error);
      throw new Error(`Failed to create pricing rule: ${error.message}`);
    }
  }

  async findAll(merchantId: string, filters?: {
    isActive?: boolean;
    companyId?: string;
    companyUserId?: string;
    targetType?: string;
  }) {
    const where: any = { merchantId };

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.targetType) {
      where.targetType = filters.targetType;
    }

    if (filters?.companyId) {
      where.OR = [
        { targetType: 'all' },
        { targetType: 'company', targetCompanyId: filters.companyId },
      ];
    }

    if (filters?.companyUserId) {
      where.OR = [
        ...(where.OR || []),
        { targetType: 'company_user', targetCompanyUserId: filters.companyUserId },
      ];
    }

    return this.prisma.pricingRule.findMany({
      where,
      include: {
        targetCompany: {
          select: { id: true, name: true },
        },
        targetCompanyUser: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string, merchantId: string) {
    const rule = await this.prisma.pricingRule.findFirst({
      where: { id, merchantId },
      include: {
        targetCompany: {
          select: { id: true, name: true },
        },
        targetCompanyUser: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    if (!rule) {
      throw new NotFoundException('Pricing rule not found');
    }

    return rule;
  }

  async update(id: string, merchantId: string, dto: Partial<CreatePricingRuleDto>) {
    await this.findOne(id, merchantId);

    return this.prisma.pricingRule.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        targetType: dto.targetType,
        targetCompanyId: dto.targetCompanyId,
        targetCompanyUserId: dto.targetCompanyUserId,
        targetCompanyGroup: dto.targetCompanyGroup,
        scopeType: dto.scopeType,
        scopeProductIds: dto.scopeProductIds,
        scopeCollectionIds: dto.scopeCollectionIds,
        scopeTags: dto.scopeTags,
        scopeVariantIds: dto.scopeVariantIds,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        discountPercentage: dto.discountPercentage,
        qtyBreaks: dto.qtyBreaks,
        minCartAmount: dto.minCartAmount,
        priority: dto.priority,
        isActive: dto.isActive,
        validFrom: dto.validFrom,
        validUntil: dto.validUntil,
      },
    });
  }

  async delete(id: string, merchantId: string) {
    await this.findOne(id, merchantId);
    return this.prisma.pricingRule.delete({ where: { id } });
  }

  async toggleActive(id: string, merchantId: string, isActive: boolean) {
    await this.findOne(id, merchantId);
    return this.prisma.pricingRule.update({
      where: { id },
      data: { isActive },
    });
  }

  /**
   * Duplicate a pricing rule
   */
  async duplicate(id: string, merchantId: string) {
    const rule = await this.findOne(id, merchantId);
    const { id: _, createdAt, updatedAt, targetCompany, targetCompanyUser, ...ruleData } = rule as any;

    return this.prisma.pricingRule.create({
      data: {
        ...ruleData,
        name: `${ruleData.name} (Copy)`,
      },
    });
  }

  /**
   * Bulk update rules (activate/deactivate multiple)
   */
  async bulkToggle(merchantId: string, ruleIds: string[], isActive: boolean) {
    return this.prisma.pricingRule.updateMany({
      where: { id: { in: ruleIds }, merchantId },
      data: { isActive },
    });
  }
}
