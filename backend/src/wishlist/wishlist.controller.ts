import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { AddToWishlistDto } from './dto/add-to-wishlist.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private wishlistService: WishlistService) {}

  // Get user's wishlist
  @Get(':id/wishlist')
  async getWishlist(
    @Param('id') id: string,
    @CurrentUser('sub') currentUserId: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('merchantId') merchantId: string,
  ) {
    const userId = id === 'me' ? currentUserId : id;
    
    if (userId !== currentUserId) {
      throw new BadRequestException('You can only view your own wishlist');
    }

    return this.wishlistService.getWishlist(userId, companyId, merchantId);
  }

  // Add product to wishlist
  @Post(':id/wishlist')
  async addToWishlist(
    @Param('id') id: string,
    @CurrentUser('sub') currentUserId: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('merchantId') merchantId: string,
    @Body() dto: AddToWishlistDto,
  ) {
    const userId = id === 'me' ? currentUserId : id;
    
    if (userId !== currentUserId) {
      throw new BadRequestException('You can only modify your own wishlist');
    }

    return this.wishlistService.addToWishlist(userId, companyId, merchantId, dto);
  }

  // Remove product from wishlist
  @Delete(':id/wishlist/:productId')
  async removeFromWishlist(
    @Param('id') id: string,
    @Param('productId') productId: string,
    @CurrentUser('sub') currentUserId: string,
    @CurrentUser('merchantId') merchantId: string,
  ) {
    const userId = id === 'me' ? currentUserId : id;
    
    if (userId !== currentUserId) {
      throw new BadRequestException('You can only modify your own wishlist');
    }

    await this.wishlistService.removeFromWishlist(userId, productId, merchantId);
    return { success: true };
  }

  // Clear wishlist
  @Delete(':id/wishlist')
  async clearWishlist(
    @Param('id') id: string,
    @CurrentUser('sub') currentUserId: string,
    @CurrentUser('merchantId') merchantId: string,
  ) {
    const userId = id === 'me' ? currentUserId : id;
    
    if (userId !== currentUserId) {
      throw new BadRequestException('You can only modify your own wishlist');
    }

    await this.wishlistService.clearWishlist(userId, merchantId);
    return { success: true };
  }

  // Check if product is in wishlist
  @Get(':id/wishlist/check/:productId')
  async checkWishlist(
    @Param('id') id: string,
    @Param('productId') productId: string,
    @CurrentUser('sub') currentUserId: string,
    @CurrentUser('merchantId') merchantId: string,
  ) {
    const userId = id === 'me' ? currentUserId : id;
    
    const isInWishlist = await this.wishlistService.isInWishlist(userId, productId, merchantId);
    return { isInWishlist };
  }

  // Get wishlist item count
  @Get(':id/wishlist/count')
  async getWishlistCount(
    @Param('id') id: string,
    @CurrentUser('sub') currentUserId: string,
    @CurrentUser('merchantId') merchantId: string,
  ) {
    const userId = id === 'me' ? currentUserId : id;
    
    const count = await this.wishlistService.getWishlistCount(userId, merchantId);
    return { count };
  }
}
