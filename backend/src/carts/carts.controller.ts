import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { CartsService } from './carts.service';
import { CartItemsService } from './cart-items.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('carts')
@UseGuards(JwtAuthGuard)
export class CartsController {
  constructor(
    private cartsService: CartsService,
    private cartItemsService: CartItemsService,
  ) {}

  @Get('active')
  async getActiveCart(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('sub') userId: string,
  ) {
    if (!companyId || !userId) {
      throw new BadRequestException('Company ID and User ID required');
    }
    return this.cartsService.findActiveCart(companyId, userId);
  }

  @Get(':id')
  async getCart(@Param('id') id: string) {
    return this.cartsService.findById(id);
  }

  @Post()
  async createCart(
    @CurrentUser('merchantId') merchantId: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('sub') userId: string,
  ) {
    if (!merchantId || !companyId || !userId) {
      throw new BadRequestException('Merchant ID, Company ID and User ID required');
    }
    return this.cartsService.create(companyId, userId, merchantId);
  }

  @Post(':id/items')
  async addItem(
    @Param('id') cartId: string,
    @Body() body: { variantId: string; shopifyVariantId: string; quantity: number },
  ) {
    const item = await this.cartItemsService.addItem(
      cartId,
      body.variantId,
      BigInt(body.shopifyVariantId),
      body.quantity,
    );

    // Recalculate cart pricing
    await this.cartsService.recalculate(cartId);

    return item;
  }

  @Put(':id/items/:itemId')
  async updateItemQuantity(
    @Param('id') cartId: string,
    @Param('itemId') itemId: string,
    @Body('quantity') quantity: number,
  ) {
    const item = await this.cartItemsService.updateQuantity(itemId, quantity);

    // Recalculate cart pricing
    await this.cartsService.recalculate(cartId);

    return item;
  }

  @Delete(':id/items/:itemId')
  async removeItem(@Param('id') cartId: string, @Param('itemId') itemId: string) {
    await this.cartItemsService.removeItem(itemId);

    // Recalculate cart pricing
    return this.cartsService.recalculate(cartId);
  }

  @Post(':id/submit')
  async submitForApproval(@Param('id') cartId: string) {
    return this.cartsService.submitForApproval(cartId);
  }

  @Post(':id/approve')
  async approve(
    @Param('id') cartId: string,
    @CurrentUser('sub') userId: string,
  ) {
    if (!userId) {
      throw new BadRequestException('User ID required');
    }
    return this.cartsService.approve(cartId, userId);
  }

  @Post(':id/reject')
  async reject(@Param('id') cartId: string) {
    return this.cartsService.reject(cartId);
  }

  @Get('company/list')
  async listCompanyCarts(
    @CurrentUser('companyId') companyId: string,
    @Query('status') status?: string,
  ) {
    if (!companyId) {
      throw new BadRequestException('Company ID required');
    }
    return this.cartsService.listCompanyCarts(companyId, status);
  }
}




