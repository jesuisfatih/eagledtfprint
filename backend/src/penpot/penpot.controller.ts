import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PenpotService } from './penpot.service';

@Controller('api/v1/penpot')
@UseGuards(JwtAuthGuard)
export class PenpotController {
  constructor(private readonly penpotService: PenpotService) {}

  // ─── Create design project from an order ───
  @Post('create-from-order/:orderId')
  async createFromOrder(
    @Param('orderId') orderId: string,
    @CurrentUser('merchantId') merchantId: string,
  ) {
    const result = await this.penpotService.createDesignProjectFromOrder(orderId, merchantId);
    return result;
  }

  // ─── Get design projects for a specific order ───
  @Get('order/:orderId')
  async getForOrder(
    @Param('orderId') orderId: string,
    @CurrentUser('merchantId') merchantId: string,
  ) {
    return this.penpotService.getDesignProjectsForOrder(orderId, merchantId);
  }

  // ─── Get all design projects ───
  @Get('projects')
  async getAllProjects(
    @CurrentUser('merchantId') merchantId: string,
    @Query('status') status?: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.penpotService.getAllDesignProjects(merchantId, { status, companyId });
  }

  // ─── Update design project status ───
  @Post('projects/:id/status')
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser('merchantId') merchantId: string,
    @Body('status') status: string,
  ) {
    return this.penpotService.updateDesignProjectStatus(id, merchantId, status);
  }

  // ─── Export design to file ───
  @Post('projects/:id/export')
  async exportDesign(
    @Param('id') id: string,
    @CurrentUser('merchantId') merchantId: string,
    @Body('format') format: 'svg' | 'pdf' | 'png',
  ) {
    return this.penpotService.exportDesign(id, merchantId, format || 'pdf');
  }

  // ─── Get Penpot dashboard URL ───
  @Get('dashboard-url')
  getDashboardUrl() {
    return { url: this.penpotService.getPublicUrl() };
  }
}
