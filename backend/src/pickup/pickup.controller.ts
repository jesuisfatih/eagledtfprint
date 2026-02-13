import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PickupService } from './pickup.service';

@Controller('pickup')
export class PickupController {
  constructor(private readonly pickupService: PickupService) {}

  // =========================================
  // SHELVES (Admin only)
  // =========================================

  @Post('shelves')
  @UseGuards(JwtAuthGuard)
  async createShelf(@Req() req: any, @Body() body: { code: string; name?: string; description?: string }) {
    return this.pickupService.createShelf(req.user.merchantId, body);
  }

  @Get('shelves')
  @UseGuards(JwtAuthGuard)
  async getShelves(@Req() req: any) {
    return this.pickupService.getShelves(req.user.merchantId);
  }

  @Patch('shelves/:id')
  @UseGuards(JwtAuthGuard)
  async updateShelf(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.pickupService.updateShelf(id, req.user.merchantId, body);
  }

  @Delete('shelves/:id')
  @UseGuards(JwtAuthGuard)
  async deleteShelf(@Req() req: any, @Param('id') id: string) {
    return this.pickupService.deleteShelf(id, req.user.merchantId);
  }

  // =========================================
  // PICKUP ORDERS (Admin)
  // =========================================

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  async getOrders(@Req() req: any, @Query() query: any) {
    // If request comes from a company_user (accounts panel), auto-filter by their company
    const filters = { ...query };
    if (req.user.companyId) {
      filters.companyId = req.user.companyId;
    }
    return this.pickupService.getPickupOrders(req.user.merchantId, filters);
  }

  @Get('orders/stats')
  @UseGuards(JwtAuthGuard)
  async getStats(@Req() req: any) {
    return this.pickupService.getStats(req.user.merchantId);
  }

  @Get('orders/:id')
  @UseGuards(JwtAuthGuard)
  async getOrder(@Req() req: any, @Param('id') id: string) {
    return this.pickupService.getPickupOrder(id, req.user.merchantId);
  }

  @Post('orders')
  @UseGuards(JwtAuthGuard)
  async createOrder(@Req() req: any, @Body() body: any) {
    return this.pickupService.createPickupOrder(req.user.merchantId, body);
  }

  @Patch('orders/:id/assign-shelf')
  @UseGuards(JwtAuthGuard)
  async assignShelf(@Req() req: any, @Param('id') id: string, @Body('shelfId') shelfId: string) {
    return this.pickupService.assignShelf(id, req.user.merchantId, shelfId);
  }

  @Patch('orders/:id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(@Req() req: any, @Param('id') id: string, @Body('status') status: string) {
    return this.pickupService.updateStatus(id, req.user.merchantId, status);
  }

  // =========================================
  // QR SCAN / KIOSK (Public - no auth needed)
  // =========================================

  @Public()
  @Get('scan/:qrCode')
  async scanQr(@Param('qrCode') qrCode: string) {
    return this.pickupService.scanQrCode(qrCode);
  }

  @Public()
  @Post('verify-email')
  async verifyEmail(@Body('email') email: string) {
    return this.pickupService.verifyCustomerEmail(email);
  }
}
