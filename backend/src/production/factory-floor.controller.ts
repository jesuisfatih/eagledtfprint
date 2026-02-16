import {
    Controller,
    Get,
    HttpCode,
    Param,
    Post,
    UseGuards
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FactoryFloorService } from './factory-floor.service';

/**
 * Factory Floor Controller
 *
 * QR → Penpot → Print Queue → Factory Floor akışını yöneten
 * REST API endpoint'leri.
 *
 * Endpoints (final paths with global prefix):
 *   POST /api/v1/factory/pipeline/:orderId     → Tam pipeline'ı başlat
 *   POST /api/v1/factory/scan/:qrCode          → QR tarayarak işlem başlat (public)
 *   POST /api/v1/factory/approve-design/:id     → Design onayı → production queue
 *   POST /api/v1/factory/mark-ready/:orderId    → Sipariş hazır → shelf ata
 *   GET  /api/v1/factory/order/:orderId         → Tek sipariş pipeline durumu
 *   GET  /api/v1/factory/dashboard              → Tüm aktif siparişler dashboard
 *   GET  /api/v1/factory/daily-summary          → Günlük özet
 */
@Controller('factory')
@UseGuards(JwtAuthGuard)
export class FactoryFloorController {
  constructor(private readonly factoryFloor: FactoryFloorService) {}

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PIPELINE ORCHESTRATION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Tam factory pipeline'ı başlat:
   * Pickup order → Design project → Production jobs
   */
  @Post('pipeline/:orderId')
  @HttpCode(201)
  async initiatePipeline(
    @CurrentUser('merchantId') merchantId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.factoryFloor.initiateFullPipeline(merchantId, orderId);
  }

  /**
   * QR taranınca:
   * Design yoksa oluştur, Production job yoksa oluştur
   * Public endpoint — fabrikada tablet/kiosk erişimi
   */
  @Post('scan/:qrCode')
  @Public()
  async scanQrCode(@Param('qrCode') qrCode: string) {
    return this.factoryFloor.scanAndProcess(qrCode);
  }

  /**
   * Design project onayı → Production PREPRESS'e taşı
   */
  @Post('approve-design/:designProjectId')
  async approveDesign(
    @CurrentUser('merchantId') merchantId: string,
    @Param('designProjectId') designProjectId: string,
  ) {
    return this.factoryFloor.approveDesignAndQueue(designProjectId, merchantId);
  }

  /**
   * Tüm job'lar READY olunca → shelf ata + bildirim gönder
   */
  @Post('mark-ready/:orderId')
  async markReady(
    @CurrentUser('merchantId') merchantId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.factoryFloor.markOrderReady(orderId, merchantId);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FACTORY FLOOR VIEWS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Tek siparişin tam pipeline durumu
   * (timeline, design, production, pickup bilgileri)
   */
  @Get('order/:orderId')
  async getOrderStatus(
    @CurrentUser('merchantId') merchantId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.factoryFloor.getOrderPipelineStatus(orderId, merchantId);
  }

  /**
   * Factory floor dashboard — tüm aktif siparişler
   * Fazlara göre gruplandırılmış: INTAKE | DESIGN | PRODUCTION | READY
   */
  @Get('dashboard')
  async getDashboard(@CurrentUser('merchantId') merchantId: string) {
    return this.factoryFloor.getFactoryFloorDashboard(merchantId);
  }

  /**
   * Günlük üretim özeti
   */
  @Get('daily-summary')
  async getDailySummary(@CurrentUser('merchantId') merchantId: string) {
    return this.factoryFloor.getDailySummary(merchantId);
  }
}
