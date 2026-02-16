import {
    Body,
    Controller,
    Get,
    HttpCode,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProductionService } from './production.service';

@Controller('production')
@UseGuards(JwtAuthGuard)
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // KANBAN BOARD
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Kanban board verisi — tüm aktif kolonlar */
  @Get('board')
  async getBoard(@CurrentUser('merchantId') merchantId: string) {
    return this.productionService.getKanbanBoard(merchantId);
  }

  /** Üretim özet istatistikleri */
  @Get('stats')
  async getStats(@CurrentUser('merchantId') merchantId: string) {
    return this.productionService.getStats(merchantId);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // JOB MANAGEMENT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Siparişten otomatik üretim işleri oluştur */
  @Post('jobs/from-order/:orderId')
  @HttpCode(201)
  async createFromOrder(
    @CurrentUser('merchantId') merchantId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.productionService.createJobsFromOrder(merchantId, orderId);
  }

  /** Manuel üretim işi oluştur */
  @Post('jobs')
  @HttpCode(201)
  async createJob(
    @CurrentUser('merchantId') merchantId: string,
    @Body()
    body: {
      orderId: string;
      designProjectId?: string;
      widthInch: number;
      heightInch: number;
      productType: string;
      quantity?: number;
      designFileUrl?: string;
      dpi?: number;
      priority?: 'STANDARD' | 'RUSH' | 'SAME_DAY' | 'NEXT_DAY';
      notes?: string;
    },
  ) {
    return this.productionService.createJob({
      merchantId,
      ...body,
    });
  }

  /** İşi bir sonraki aşamaya taşı */
  @Patch('jobs/:jobId/status')
  async moveStatus(
    @Param('jobId') jobId: string,
    @Body() body: { status: string; operatorName?: string },
  ) {
    return this.productionService.moveToStatus(jobId, body.status as any, body.operatorName);
  }

  /** Birden fazla işi aynı anda taşı */
  @Patch('jobs/batch-status')
  async batchMoveStatus(
    @Body()
    body: {
      jobIds: string[];
      status: string;
      operatorName?: string;
    },
  ) {
    return this.productionService.batchMoveToStatus(body.jobIds, body.status as any, body.operatorName);
  }

  /** İşi printer'a ata */
  @Patch('jobs/:jobId/assign-printer')
  async assignPrinter(
    @Param('jobId') jobId: string,
    @Body() body: { printerId: string },
  ) {
    return this.productionService.assignToPrinter(jobId, body.printerId);
  }

  /** QC sonucu kaydet */
  @Patch('jobs/:jobId/qc')
  async recordQc(
    @Param('jobId') jobId: string,
    @Body() body: { result: 'pass' | 'fail' | 'conditional'; notes?: string },
  ) {
    return this.productionService.recordQcResult(jobId, body.result, body.notes);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRINTERS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Printer listesi */
  @Get('printers')
  async getPrinters(@CurrentUser('merchantId') merchantId: string) {
    return this.productionService.getPrinters(merchantId);
  }

  /** Printer oluştur */
  @Post('printers')
  @HttpCode(201)
  async createPrinter(
    @CurrentUser('merchantId') merchantId: string,
    @Body()
    body: {
      name: string;
      model: string;
      maxWidthInch: number;
      supportedTypes?: string[];
      location?: string;
    },
  ) {
    return this.productionService.createPrinter(merchantId, body);
  }

  /** Printer mürekkep seviyelerini güncelle */
  @Patch('printers/:printerId/ink')
  async updateInk(
    @Param('printerId') printerId: string,
    @Body() body: { cyan?: number; magenta?: number; yellow?: number; black?: number; white?: number },
  ) {
    return this.productionService.updateInkLevels(printerId, body);
  }

  /** Printer durumu güncelle */
  @Patch('printers/:printerId/status')
  async updatePrinterStatus(
    @Param('printerId') printerId: string,
    @Body() body: { status: 'IDLE' | 'PRINTING' | 'MAINTENANCE' | 'OFFLINE'; notes?: string },
  ) {
    return this.productionService.updatePrinterStatus(printerId, body.status, body.notes);
  }

  /** Printer performans istatistikleri */
  @Get('printers/stats')
  async getPrinterStats(@CurrentUser('merchantId') merchantId: string) {
    return this.productionService.getPrinterStats(merchantId);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GANG SHEET BATCHES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Gang sheet batch oluştur (fabrika-taraflı nesting) */
  @Post('gang-batches')
  @HttpCode(201)
  async createGangBatch(
    @CurrentUser('merchantId') merchantId: string,
    @Body()
    body: {
      sheetWidth: number;
      sheetHeight: number;
      jobIds: string[];
    },
  ) {
    return this.productionService.createGangSheetBatch(merchantId, body);
  }

  /** Gang sheet batch listesi */
  @Get('gang-batches')
  async getGangBatches(
    @CurrentUser('merchantId') merchantId: string,
    @Query('status') status?: string,
  ) {
    return this.productionService.getGangSheetBatches(merchantId, status);
  }
}
