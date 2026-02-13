import { Injectable, NotFoundException } from '@nestjs/common';
import {
    buildPrismaOrderBy,
    buildPrismaSkipTake,
    createPaginatedResponse,
    PaginationParams
} from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { ShopifyCompanySyncService } from './shopify-company-sync.service';

/**
 * Optimized select for company list (minimal data)
 */
const COMPANY_LIST_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  users: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
    },
  },
  _count: {
    select: {
      users: true,
      orders: true,
    },
  },
} as const;

/**
 * Optimized include for company detail
 */
const COMPANY_DETAIL_INCLUDE = {
  merchant: true, // Include full merchant (we need shopDomain for checkout)
  users: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
    },
    orderBy: { createdAt: 'desc' as const },
  },
  pricingRules: {
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      discountType: true,
      discountValue: true,
      priority: true,
    },
  },
  orders: {
    take: 10,
    orderBy: { createdAt: 'desc' as const },
    select: {
      id: true,
      shopifyOrderId: true,
      shopifyOrderNumber: true,
      totalPrice: true,
      financialStatus: true,
      createdAt: true,
    },
  },
} as const;

@Injectable()
export class CompaniesService {
  constructor(
    private prisma: PrismaService,
    private shopifyCompanySync: ShopifyCompanySyncService,
  ) {}

  async findAll(merchantId: string, filters?: { status?: string; search?: string; page?: number; limit?: number }) {
    const pagination: PaginationParams = {
      page: filters?.page || 1,
      limit: filters?.limit || 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };

    const where: any = { merchantId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        select: COMPANY_LIST_SELECT,
        orderBy: buildPrismaOrderBy(pagination, ['createdAt', 'name', 'email']),
        ...buildPrismaSkipTake(pagination),
      }),
      this.prisma.company.count({ where }),
    ]);

    return createPaginatedResponse(data, total, pagination);
  }

  async findOne(id: string, merchantId: string) {
    const company = await this.prisma.company.findFirst({
      where: { id, merchantId },
      include: COMPANY_DETAIL_INCLUDE,
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  async create(merchantId: string, data: any) {
    const company = await this.prisma.company.create({
      data: {
        merchantId,
        name: data.name,
        legalName: data.legalName,
        taxId: data.taxId,
        email: data.email,
        phone: data.phone,
        website: data.website,
        billingAddress: data.billingAddress,
        shippingAddress: data.shippingAddress,
        companyGroup: data.companyGroup,
        status: 'pending',
      },
    });

    // Sync to Shopify after creation
    try {
      await this.shopifyCompanySync.syncCompanyToShopify(company.id);
    } catch (error) {
      console.error('Company Shopify sync failed:', error);
    }

    return company;
  }

  async approve(id: string, merchantId: string) {
    const company = await this.findOne(id, merchantId);

    // Update company status
    const updatedCompany = await this.prisma.company.update({
      where: { id },
      data: {
        status: 'active',
      },
    });

    // Activate all users in the company
    await this.prisma.companyUser.updateMany({
      where: { companyId: id },
      data: {
        isActive: true,
      },
    });

    // Sync to Shopify if not already synced
    try {
      await this.shopifyCompanySync.syncCompanyToShopify(id);
    } catch (error) {
      console.error('Company Shopify sync failed after approval:', error);
    }

    return updatedCompany;
  }

  async reject(id: string, merchantId: string, reason?: string) {
    const company = await this.findOne(id, merchantId);

    const updatedCompany = await this.prisma.company.update({
      where: { id },
      data: {
        status: 'rejected',
        settings: {
          ...(company.settings as any),
          rejectionReason: reason,
        },
      },
    });

    return updatedCompany;
  }

  async update(id: string, merchantId: string, data: any) {
    await this.findOne(id, merchantId);

    const company = await this.prisma.company.update({
      where: { id },
      data: {
        name: data.name,
        legalName: data.legalName,
        taxId: data.taxId,
        email: data.email,
        phone: data.phone,
        website: data.website,
        billingAddress: data.billingAddress,
        shippingAddress: data.shippingAddress,
        companyGroup: data.companyGroup,
        status: data.status,
      },
    });

    // Sync updates to Shopify
    try {
      await this.shopifyCompanySync.updateCompanyInShopify(id);
    } catch (error) {
      console.error('Company Shopify update failed:', error);
    }

    return company;
  }

  async delete(id: string, merchantId: string) {
    await this.findOne(id, merchantId);
    return this.prisma.company.delete({ where: { id } });
  }

  async getStats(merchantId: string) {
    const [total, active, pending, suspended] = await Promise.all([
      this.prisma.company.count({ where: { merchantId } }),
      this.prisma.company.count({ where: { merchantId, status: 'active' } }),
      this.prisma.company.count({ where: { merchantId, status: 'pending' } }),
      this.prisma.company.count({ where: { merchantId, status: 'suspended' } }),
    ]);

    const totalUsers = await this.prisma.companyUser.count({
      where: { company: { merchantId } },
    });

    return {
      total,
      active,
      pending,
      suspended,
      totalUsers,
    };
  }
}
