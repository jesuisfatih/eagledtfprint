import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PricingCalculatorService } from '../pricing/pricing-calculator.service';

@Injectable()
export class CartsService {
  constructor(
    private prisma: PrismaService,
    private pricingCalculator: PricingCalculatorService,
  ) {}

  async create(companyId: string, createdByUserId: string, merchantId: string) {
    return this.prisma.cart.create({
      data: {
        merchantId,
        companyId,
        createdByUserId,
        status: 'draft',
      },
      include: {
        items: true,
        company: true,
        createdBy: true,
      },
    });
  }

  async findActiveCart(companyId: string, userId: string) {
    return this.prisma.cart.findFirst({
      where: {
        companyId,
        createdByUserId: userId,
        status: 'draft',
      },
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
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async findById(id: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { id },
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
        createdBy: true,
        approvedBy: true,
      },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    return cart;
  }

  async recalculate(cartId: string) {
    const result = await this.pricingCalculator.calculateCartPricing(cartId);
    return this.findById(cartId);
  }

  async submitForApproval(cartId: string) {
    const cart = await this.findById(cartId);

    if (cart.status !== 'draft') {
      throw new Error('Only draft carts can be submitted for approval');
    }

    return this.prisma.cart.update({
      where: { id: cartId },
      data: { status: 'pending_approval' },
    });
  }

  async approve(cartId: string, approvedByUserId: string) {
    const cart = await this.findById(cartId);

    if (cart.status !== 'pending_approval') {
      throw new Error('Only pending carts can be approved');
    }

    return this.prisma.cart.update({
      where: { id: cartId },
      data: {
        status: 'approved',
        approvedByUserId,
        approvedAt: new Date(),
      },
    });
  }

  async reject(cartId: string) {
    return this.prisma.cart.update({
      where: { id: cartId },
      data: { status: 'rejected' },
    });
  }

  async abandon(cartId: string) {
    return this.prisma.cart.update({
      where: { id: cartId },
      data: { status: 'abandoned' },
    });
  }

  async delete(cartId: string) {
    return this.prisma.cart.delete({
      where: { id: cartId },
    });
  }

  async listCompanyCarts(companyId: string, status?: string) {
    const where: any = { companyId };
    if (status) {
      where.status = status;
    }

    return this.prisma.cart.findMany({
      where,
      include: {
        items: true,
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
  }
}




