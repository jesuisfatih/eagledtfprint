import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CartItemsService {
  constructor(private prisma: PrismaService) {}

  async addItem(
    cartId: string,
    variantId: string,
    shopifyVariantId: bigint,
    quantity: number,
  ) {
    // Check if item already exists
    const existing = await this.prisma.cartItem.findFirst({
      where: {
        cartId,
        shopifyVariantId,
      },
    });

    if (existing) {
      // Update quantity
      return this.updateQuantity(existing.id, existing.quantity + quantity);
    }

    // Get variant details
    const variant = await this.prisma.catalogVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    // Create new cart item
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
        unitPrice: variant.price || 0, // Will be updated by pricing engine
      },
    });
  }

  async updateQuantity(itemId: string, quantity: number) {
    if (quantity <= 0) {
      return this.removeItem(itemId);
    }

    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });
  }

  async removeItem(itemId: string) {
    return this.prisma.cartItem.delete({
      where: { id: itemId },
    });
  }

  async clearCart(cartId: string) {
    return this.prisma.cartItem.deleteMany({
      where: { cartId },
    });
  }
}



