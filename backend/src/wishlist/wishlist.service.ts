import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToWishlistDto } from './dto/add-to-wishlist.dto';

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateWishlist(userId: string, companyId: string, merchantId: string) {
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

  async getWishlist(userId: string, companyId: string, merchantId: string) {
    const wishlist = await this.getOrCreateWishlist(userId, companyId, merchantId);
    return wishlist.items.sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime());
  }

  async addToWishlist(
    userId: string,
    companyId: string,
    merchantId: string,
    dto: AddToWishlistDto,
  ) {
    const wishlist = await this.getOrCreateWishlist(userId, companyId, merchantId);

    // Check if product already in wishlist
    const existing = await this.prisma.wishlistItem.findFirst({
      where: {
        wishlistId: wishlist.id,
        productId: dto.productId,
      },
    });

    if (existing) {
      throw new ConflictException('Product already in wishlist');
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

  async removeFromWishlist(userId: string, productId: string, merchantId: string) {
    const wishlist = await this.prisma.wishlist.findFirst({
      where: { companyUserId: userId, merchantId },
    });

    if (!wishlist) {
      throw new NotFoundException('Wishlist not found');
    }

    const item = await this.prisma.wishlistItem.findFirst({
      where: {
        wishlistId: wishlist.id,
        productId,
      },
    });

    if (!item) {
      throw new NotFoundException('Product not found in wishlist');
    }

    return this.prisma.wishlistItem.delete({
      where: { id: item.id },
    });
  }

  async clearWishlist(userId: string, merchantId: string) {
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

  async isInWishlist(userId: string, productId: string, merchantId: string): Promise<boolean> {
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

  async getWishlistCount(userId: string, merchantId: string): Promise<number> {
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
}
