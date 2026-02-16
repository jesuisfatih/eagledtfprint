import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PenpotService } from './penpot.service';

@Controller('penpot')
@UseGuards(JwtAuthGuard)
export class PenpotController {
  constructor(private readonly penpotService: PenpotService) {}

  // ─── PUBLIC: Customer Approval Flow ───
  @Public()
  @Get('public/projects/:id')
  async getPublicProject(@Param('id') id: string) {
    return this.penpotService.getPublicDesignProject(id);
  }

  @Public()
  @Post('public/projects/:id/approve')
  async approvePublicProject(@Param('id') id: string) {
    // MerchantId'yi projeden bulmalıyız, updateDesignProjectStatus merchantId bekliyor.
    // Ancak UUID ile proje bulduğumuz için serviste merchantId zorunluluğunu esnetebiliriz
    // veya serviste id ile merchantId'yi çekebiliriz.
    // Şimdilik servise projeden merchantId çekme sorumluluğu verelim.
    return this.penpotService.updateDesignProjectStatus(id, '', 'APPROVED');
  }

  @Public()
  @Post('public/projects/:id/reject')
  async rejectPublicProject(
    @Param('id') id: string,
    @Body('notes') notes: string,
  ) {
    return this.penpotService.updateDesignProjectStatus(id, '', 'REJECTED');
  }

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

  // ─── Sync design ready status (External/Plugin trigger) ───
  @Post('sync-ready')
  async syncReady(
    @CurrentUser('merchantId') merchantId: string,
    @Body('fileId') fileId: string,
  ) {
    return this.penpotService.syncDesignReady(merchantId, fileId);
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
