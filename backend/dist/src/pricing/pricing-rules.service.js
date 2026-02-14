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
var PricingRulesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingRulesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let PricingRulesService = PricingRulesService_1 = class PricingRulesService {
    prisma;
    logger = new common_1.Logger(PricingRulesService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(merchantId, dto) {
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
        }
        catch (error) {
            this.logger.error('Failed to create pricing rule', error);
            throw new Error(`Failed to create pricing rule: ${error.message}`);
        }
    }
    async findAll(merchantId, filters) {
        const where = { merchantId };
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
    async findOne(id, merchantId) {
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
            throw new common_1.NotFoundException('Pricing rule not found');
        }
        return rule;
    }
    async update(id, merchantId, dto) {
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
    async delete(id, merchantId) {
        await this.findOne(id, merchantId);
        return this.prisma.pricingRule.delete({ where: { id } });
    }
    async toggleActive(id, merchantId, isActive) {
        await this.findOne(id, merchantId);
        return this.prisma.pricingRule.update({
            where: { id },
            data: { isActive },
        });
    }
    async duplicate(id, merchantId) {
        const rule = await this.findOne(id, merchantId);
        const { id: _, createdAt, updatedAt, targetCompany, targetCompanyUser, ...ruleData } = rule;
        return this.prisma.pricingRule.create({
            data: {
                ...ruleData,
                name: `${ruleData.name} (Copy)`,
            },
        });
    }
    async bulkToggle(merchantId, ruleIds, isActive) {
        return this.prisma.pricingRule.updateMany({
            where: { id: { in: ruleIds }, merchantId },
            data: { isActive },
        });
    }
};
exports.PricingRulesService = PricingRulesService;
exports.PricingRulesService = PricingRulesService = PricingRulesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PricingRulesService);
//# sourceMappingURL=pricing-rules.service.js.map