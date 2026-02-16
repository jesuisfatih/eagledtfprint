import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DittofeedService } from '../dittofeed/dittofeed.service';
import { PrismaService } from '../prisma/prisma.service';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Production Pipeline Status Flow:
//
//   QUEUED → PREPRESS → PRINTING → CURING → CUTTING
//     → QC_CHECK → PACKAGING → READY → (PICKED_UP | SHIPPED)
//     → COMPLETED
//
// Each status transition records a timestamp for analytics.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type ProductionStatusType =
  | 'QUEUED'
  | 'PREPRESS'
  | 'PRINTING'
  | 'CURING'
  | 'CUTTING'
  | 'QC_CHECK'
  | 'PACKAGING'
  | 'READY'
  | 'PICKED_UP'
  | 'SHIPPED'
  | 'COMPLETED'
  | 'CANCELLED';

/** Valid status transitions — Kanban board sürükle-bırak kuralları */
const STATUS_TRANSITIONS: Record<string, string[]> = {
  QUEUED:    ['PREPRESS', 'CANCELLED'],
  PREPRESS:  ['PRINTING', 'QUEUED', 'CANCELLED'],
  PRINTING:  ['CURING', 'PREPRESS', 'CANCELLED'],
  CURING:    ['CUTTING', 'PRINTING', 'CANCELLED'],
  CUTTING:   ['QC_CHECK', 'CURING', 'CANCELLED'],
  QC_CHECK:  ['PACKAGING', 'CUTTING', 'CANCELLED'], // fail → back to CUTTING
  PACKAGING: ['READY', 'QC_CHECK', 'CANCELLED'],
  READY:     ['PICKED_UP', 'SHIPPED', 'CANCELLED'],
  PICKED_UP: ['COMPLETED'],
  SHIPPED:   ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

/** Timestamp field for each status */
const STATUS_TIMESTAMP_FIELD: Record<string, string> = {
  QUEUED:     'queuedAt',
  PREPRESS:   'prepressStartAt',
  PRINTING:   'printStartAt',
  CURING:     'cureStartAt',
  CUTTING:    'cutStartAt',
  QC_CHECK:   'qcStartAt',
  PACKAGING:  'packagingStartAt',
  READY:      'readyAt',
  COMPLETED:  'completedAt',
};

interface CreateJobInput {
  merchantId: string;
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
}

export interface KanbanBoard {
  QUEUED: any[];
  PREPRESS: any[];
  PRINTING: any[];
  CURING: any[];
  CUTTING: any[];
  QC_CHECK: any[];
  PACKAGING: any[];
  READY: any[];
  PICKED_UP: any[];
  SHIPPED: any[];
  COMPLETED: any[];
  CANCELLED: any[];
}

export interface ProductionStats {
  totalJobs: number;
  byStatus: Record<string, number>;
  todayCompleted: number;
  todaySqft: number;
  avgTurnaroundHours: number;
  rushJobs: number;
  delayedJobs: number;
}

@Injectable()
export class ProductionService {
  private readonly logger = new Logger(ProductionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dittofeedService: DittofeedService,
  ) {}

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // JOB CREATION — From Order webhook or manual
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Siparişten üretim işi oluşturur.
   * Her line item → ayrı production job
   */
  async createJob(input: CreateJobInput) {
    const area = input.widthInch * input.heightInch;

    // Tahmini baskı süresi (alan bazlı — basit heuristic)
    const estimatedMinutes = Math.ceil(area / 50) + 5; // 50 sqin/min baseline

    const job = await this.prisma.productionJob.create({
      data: {
        merchantId: input.merchantId,
        orderId: input.orderId,
        designProjectId: input.designProjectId || null,
        widthInch: input.widthInch,
        heightInch: input.heightInch,
        areaSquareInch: area,
        productType: input.productType,
        quantity: input.quantity || 1,
        designFileUrl: input.designFileUrl || null,
        dpi: input.dpi || null,
        priority: (input.priority as any) || 'STANDARD',
        estimatedPrintMinutes: estimatedMinutes,
        estimatedReadyAt: new Date(Date.now() + estimatedMinutes * 60 * 1000 + 30 * 60 * 1000), // + 30min buffer
        notes: input.notes || null,
      },
      include: {
        order: { select: { shopifyOrderNumber: true, email: true, companyUserId: true } },
      },
    });

    this.logger.log(
      `Production job created: ${job.id} for order ${job.order?.shopifyOrderNumber} — ${input.productType} ${input.widthInch}"x${input.heightInch}"`,
    );

    return job;
  }

  /**
   * Siparişin tüm line item'larından otomatik üretim işleri oluşturur
   */
  async createJobsFromOrder(merchantId: string, orderId: string) {
    const order = await this.prisma.orderLocal.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        shopifyOrderNumber: true,
        lineItems: true,
        companyUserId: true,
        designProjects: { select: { id: true } },
      },
    });

    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    const lineItems = (order.lineItems as any[]) || [];
    const jobs: any[] = [];

    for (const item of lineItems) {
      const dims = this.parseDimensions(item);
      if (!dims) continue; // skip non-printable items (supplies, etc.)

      const productType = this.detectProductType(item);

      const job = await this.createJob({
        merchantId,
        orderId: order.id,
        designProjectId: order.designProjects?.[0]?.id,
        widthInch: dims.width,
        heightInch: dims.height,
        productType,
        quantity: item.quantity || 1,
        dpi: 300,
        priority: 'STANDARD',
      });

      jobs.push(job);
    }

    this.logger.log(`Created ${jobs.length} production jobs for order #${order.shopifyOrderNumber}`);

    return { created: jobs.length, jobs };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STATUS TRANSITIONS — Kanban Board Move
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Üretim işini bir sonraki aşamaya taşır.
   * Geçersiz geçişler reddedilir.
   */
  async moveToStatus(jobId: string, newStatus: ProductionStatusType, operatorName?: string) {
    const job = await this.prisma.productionJob.findUnique({
      where: { id: jobId },
      include: {
        order: { select: { shopifyOrderNumber: true, email: true, companyUserId: true } },
      },
    });

    if (!job) throw new NotFoundException(`Job ${jobId} not found`);

    const currentStatus = job.status as string;
    const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || [];

    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid transition: ${currentStatus} → ${newStatus}. Allowed: ${allowedTransitions.join(', ')}`,
      );
    }

    // Build update data with timestamp for this status
    const updateData: Record<string, any> = {
      status: newStatus as any,
    };

    const timestampField = STATUS_TIMESTAMP_FIELD[newStatus];
    if (timestampField) {
      updateData[timestampField] = new Date();
    }

    if (operatorName) {
      updateData.operatorName = operatorName;
    }

    const updated = await this.prisma.productionJob.update({
      where: { id: jobId },
      data: updateData,
      include: {
        order: { select: { shopifyOrderNumber: true, email: true, companyUserId: true } },
        printer: { select: { name: true } },
      },
    });

    this.logger.log(
      `Job ${jobId} moved: ${currentStatus} → ${newStatus} (Order #${updated.order?.shopifyOrderNumber})`,
    );

    // ━━━ DITTOFEED: Production lifecycle events ━━━
    if (updated.order?.companyUserId) {
      try {
        await this.sendProductionEvent(updated, currentStatus, newStatus);
      } catch (err: any) {
        this.logger.warn(`Dittofeed production event failed: ${err.message}`);
      }
    }

    return updated;
  }

  /**
   * Batch status transition — birden fazla işi aynı anda taşı
   * (Kanban board'da multi-select drag)
   */
  async batchMoveToStatus(jobIds: string[], newStatus: ProductionStatusType, operatorName?: string) {
    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const jobId of jobIds) {
      try {
        await this.moveToStatus(jobId, newStatus, operatorName);
        results.push({ id: jobId, success: true });
      } catch (err: any) {
        results.push({ id: jobId, success: false, error: err.message });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return { succeeded, failed, results };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // KANBAN BOARD — Dashboard data
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Kanban board verisi — her kolonda işler listesi
   */
  async getKanbanBoard(merchantId: string): Promise<KanbanBoard> {
    const activeStatuses = [
      'QUEUED', 'PREPRESS', 'PRINTING', 'CURING',
      'CUTTING', 'QC_CHECK', 'PACKAGING', 'READY',
      'PICKED_UP', 'SHIPPED', 'COMPLETED', 'CANCELLED',
    ];

    const jobs = await this.prisma.productionJob.findMany({
      where: {
        merchantId,
        status: { in: activeStatuses as any[] },
      },
      include: {
        order: {
          select: {
            shopifyOrderNumber: true,
            email: true,
            companyId: true,
            company: { select: { name: true } },
          },
        },
        printer: { select: { name: true, status: true } },
      },
      orderBy: [
        { priority: 'desc' },  // SAME_DAY/RUSH first
        { queuedAt: 'asc' },   // FIFO within priority
      ],
    });

    const board: KanbanBoard = {
      QUEUED: [],
      PREPRESS: [],
      PRINTING: [],
      CURING: [],
      CUTTING: [],
      QC_CHECK: [],
      PACKAGING: [],
      READY: [],
      PICKED_UP: [],
      SHIPPED: [],
      COMPLETED: [],
      CANCELLED: [],
    };

    for (const job of jobs) {
      const status = job.status as keyof KanbanBoard;
      if (board[status]) {
        board[status].push({
          id: job.id,
          orderNumber: job.order?.shopifyOrderNumber || '',
          companyName: (job.order as any)?.company?.name || '',
          email: job.order?.email || '',
          productType: job.productType,
          dimensions: `${job.widthInch}"×${job.heightInch}"`,
          area: job.areaSquareInch,
          priority: job.priority,
          printer: job.printer?.name || null,
          operator: job.operatorName || null,
          queuedAt: job.queuedAt,
          estimatedReadyAt: job.estimatedReadyAt,
          isOverdue: job.estimatedReadyAt ? new Date() > job.estimatedReadyAt : false,
          waitingMinutes: job.queuedAt ? Math.round((Date.now() - job.queuedAt.getTime()) / 60000) : 0,
        });
      }
    }

    return board;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRINTER MANAGEMENT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Printer listesi + aktif iş sayıları */
  async getPrinters(merchantId: string) {
    return this.prisma.printer.findMany({
      where: { merchantId },
      include: {
        jobs: {
          where: { status: { in: ['PRINTING', 'QUEUED', 'PREPRESS'] as any[] } },
          select: { id: true, status: true, productType: true, estimatedPrintMinutes: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /** Printer oluştur */
  async createPrinter(
    merchantId: string,
    data: {
      name: string;
      model: string;
      maxWidthInch: number;
      supportedTypes?: string[];
      location?: string;
    },
  ) {
    return this.prisma.printer.create({
      data: {
        merchantId,
        name: data.name,
        model: data.model,
        maxWidthInch: data.maxWidthInch,
        supportedTypes: data.supportedTypes || ['dtf'],
        location: data.location || null,
      },
    });
  }

  /** Printer mürekkep seviyelerini güncelle */
  async updateInkLevels(
    printerId: string,
    levels: { cyan?: number; magenta?: number; yellow?: number; black?: number; white?: number },
  ) {
    return this.prisma.printer.update({
      where: { id: printerId },
      data: {
        inkCyan: levels.cyan,
        inkMagenta: levels.magenta,
        inkYellow: levels.yellow,
        inkBlack: levels.black,
        inkWhite: levels.white,
      },
    });
  }

  /** Printer durumunu değiştir (IDLE → MAINTENANCE, vb.) */
  async updatePrinterStatus(printerId: string, status: 'IDLE' | 'PRINTING' | 'MAINTENANCE' | 'OFFLINE', notes?: string) {
    return this.prisma.printer.update({
      where: { id: printerId },
      data: {
        status: status as any,
        maintenanceNotes: status === 'MAINTENANCE' ? notes : undefined,
        lastMaintenanceAt: status === 'MAINTENANCE' ? new Date() : undefined,
      },
    });
  }

  /** İşi bir printer'a ata */
  async assignToPrinter(jobId: string, printerId: string) {
    const printer = await this.prisma.printer.findUnique({ where: { id: printerId } });
    if (!printer) throw new NotFoundException(`Printer ${printerId} not found`);

    const job = await this.prisma.productionJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);

    // Width check — job must fit printer
    if (job.widthInch > printer.maxWidthInch) {
      throw new BadRequestException(
        `Job width ${job.widthInch}" exceeds printer max width ${printer.maxWidthInch}"`,
      );
    }

    // Product type check
    if (printer.supportedTypes.length > 0 && !printer.supportedTypes.includes(job.productType)) {
      throw new BadRequestException(
        `Printer ${printer.name} does not support product type: ${job.productType}`,
      );
    }

    return this.prisma.productionJob.update({
      where: { id: jobId },
      data: { printerId },
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GANG SHEET BATCH (Factory-side nesting)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Fabrika taraflı nesting — küçük "by-size" siparişleri
   * tek bir film yaprağına yerleştirme
   */
  async createGangSheetBatch(
    merchantId: string,
    data: {
      sheetWidth: number;
      sheetHeight: number;
      jobIds: string[];
    },
  ) {
    const totalArea = data.sheetWidth * data.sheetHeight;

    // Fetch jobs and calculate used area
    const jobs = await this.prisma.productionJob.findMany({
      where: { id: { in: data.jobIds }, merchantId },
    });

    if (jobs.length === 0) throw new BadRequestException('No valid jobs found');

    const usedArea = jobs.reduce((sum, j) => sum + (j.areaSquareInch || 0), 0);
    const fillRate = Math.min(usedArea / totalArea, 1);
    const wasteArea = totalArea - usedArea;

    const batch = await this.prisma.gangSheetBatch.create({
      data: {
        merchantId,
        sheetWidth: data.sheetWidth,
        sheetHeight: data.sheetHeight,
        fillRate,
        usedArea,
        totalArea,
        wasteArea,
        isMultiOrder: new Set(jobs.map((j) => j.orderId)).size > 1,
        orderCount: new Set(jobs.map((j) => j.orderId)).size,
      },
    });

    // Assign jobs to this batch with positions
    for (let i = 0; i < data.jobIds.length; i++) {
      await this.prisma.productionJob.update({
        where: { id: data.jobIds[i] },
        data: {
          gangSheetBatchId: batch.id,
          gangSheetPosition: i + 1,
        },
      });
    }

    this.logger.log(
      `Gang sheet batch created: ${batch.id} — ${data.sheetWidth}"×${data.sheetHeight}" — fill: ${(fillRate * 100).toFixed(1)}% — ${jobs.length} jobs`,
    );

    return { ...batch, jobCount: jobs.length };
  }

  /** Gang sheet batch listesi */
  async getGangSheetBatches(merchantId: string, status?: string) {
    return this.prisma.gangSheetBatch.findMany({
      where: {
        merchantId,
        ...(status ? { status } : {}),
      },
      include: {
        jobs: {
          select: {
            id: true,
            orderId: true,
            productType: true,
            widthInch: true,
            heightInch: true,
            areaSquareInch: true,
            gangSheetPosition: true,
            order: { select: { shopifyOrderNumber: true } },
          },
          orderBy: { gangSheetPosition: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRODUCTION ANALYTICS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Genel üretim istatistikleri */
  async getStats(merchantId: string): Promise<ProductionStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Status dağılımı
    const statusGroups = await this.prisma.productionJob.groupBy({
      by: ['status'],
      where: { merchantId },
      _count: true,
    });

    const byStatus: Record<string, number> = {};
    let totalJobs = 0;
    for (const g of statusGroups) {
      byStatus[g.status] = g._count;
      totalJobs += g._count;
    }

    // Bugün tamamlanan
    const todayCompleted = await this.prisma.productionJob.count({
      where: {
        merchantId,
        status: 'COMPLETED',
        completedAt: { gte: today },
      },
    });

    // Bugün basılan toplam sqft
    const todayJobs = await this.prisma.productionJob.findMany({
      where: {
        merchantId,
        completedAt: { gte: today },
      },
      select: { areaSquareInch: true },
    });
    const todaySqft = todayJobs.reduce((sum, j) => sum + (j.areaSquareInch || 0), 0) / 144; // sqin → sqft

    // Ortalama tamamlanma süresi (son 30 gün)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const completedJobs = await this.prisma.productionJob.findMany({
      where: {
        merchantId,
        status: 'COMPLETED',
        completedAt: { gte: thirtyDaysAgo },
      },
      select: { queuedAt: true, completedAt: true },
    });

    let avgTurnaroundHours = 0;
    if (completedJobs.length > 0) {
      const totalHours = completedJobs.reduce((sum, j) => {
        if (j.completedAt) {
          return sum + (j.completedAt.getTime() - j.queuedAt.getTime()) / 3600000;
        }
        return sum;
      }, 0);
      avgTurnaroundHours = Math.round((totalHours / completedJobs.length) * 10) / 10;
    }

    // Rush jobs
    const rushJobs = await this.prisma.productionJob.count({
      where: {
        merchantId,
        priority: { in: ['RUSH', 'SAME_DAY', 'NEXT_DAY'] as any[] },
        status: { notIn: ['COMPLETED', 'CANCELLED'] as any[] },
      },
    });

    // Geciken işler
    const delayedJobs = await this.prisma.productionJob.count({
      where: {
        merchantId,
        estimatedReadyAt: { lt: new Date() },
        status: { notIn: ['COMPLETED', 'CANCELLED', 'READY', 'PICKED_UP', 'SHIPPED'] as any[] },
      },
    });

    return {
      totalJobs,
      byStatus,
      todayCompleted,
      todaySqft: Math.round(todaySqft * 100) / 100,
      avgTurnaroundHours,
      rushJobs,
      delayedJobs,
    };
  }

  /** Printer bazlı performans */
  async getPrinterStats(merchantId: string) {
    const printers = await this.prisma.printer.findMany({
      where: { merchantId },
      include: {
        jobs: {
          where: { status: 'COMPLETED' },
          select: { areaSquareInch: true, printStartAt: true, completedAt: true },
        },
      },
    });

    return printers.map((p) => {
      const totalSqft = p.jobs.reduce((sum, j) => sum + (j.areaSquareInch || 0), 0) / 144;
      const avgPrintTimeMin =
        p.jobs.length > 0
          ? p.jobs.reduce((sum, j) => {
              if (j.printStartAt && j.completedAt) {
                return sum + (j.completedAt.getTime() - j.printStartAt.getTime()) / 60000;
              }
              return sum;
            }, 0) / p.jobs.length
          : 0;

      return {
        id: p.id,
        name: p.name,
        model: p.model,
        status: p.status,
        inkLevels: {
          cyan: p.inkCyan,
          magenta: p.inkMagenta,
          yellow: p.inkYellow,
          black: p.inkBlack,
          white: p.inkWhite,
        },
        totalJobsCompleted: p.jobs.length,
        totalSqft: Math.round(totalSqft * 100) / 100,
        avgPrintTimeMinutes: Math.round(avgPrintTimeMin * 10) / 10,
      };
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // QC (Quality Control)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** QC sonucu kaydet */
  async recordQcResult(jobId: string, result: 'pass' | 'fail' | 'conditional', notes?: string) {
    const job = await this.prisma.productionJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);

    if (job.status !== 'QC_CHECK') {
      throw new BadRequestException(`Job is not in QC_CHECK status (current: ${job.status})`);
    }

    const updateData: Record<string, any> = {
      qcResult: result,
      qcNotes: notes || null,
    };

    if (result === 'pass' || result === 'conditional') {
      updateData.qcPassAt = new Date();
      updateData.status = 'PACKAGING';
      updateData.packagingStartAt = new Date();
    } else {
      // fail → back to CUTTING for reprint
      updateData.status = 'CUTTING';
      updateData.qcStartAt = null; // reset
    }

    return this.prisma.productionJob.update({
      where: { id: jobId },
      data: updateData,
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CRON — Günlük printer stats sıfırlama
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async resetDailyPrinterStats() {
    try {
      await this.prisma.printer.updateMany({
        data: {
          totalPrintsToday: 0,
          totalSqftToday: 0,
        },
      });
      this.logger.log('Daily printer stats reset.');
    } catch (err: any) {
      this.logger.error(`Failed to reset daily stats: ${err.message}`);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRIVATE HELPERS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Variant title'dan boyut parse eder
   * Örnekler: "22 x 24", "11x17", "22 x 6", "Full Color / 22x24"
   */
  private parseDimensions(lineItem: any): { width: number; height: number } | null {
    const title = lineItem.variant_title || lineItem.title || '';

    // Pattern: "22 x 24", "22x24", "11.5 x 16"
    const match = title.match(/(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)/);
    if (match) {
      return {
        width: parseFloat(match[1]),
        height: parseFloat(match[2]),
      };
    }

    // Check line item properties for _width, _height
    const props = lineItem.properties || [];
    const widthProp = props.find(
      (p: any) => p.name === '_width' || p.name === 'Width',
    );
    const heightProp = props.find(
      (p: any) => p.name === '_height' || p.name === 'Height',
    );

    if (widthProp && heightProp) {
      return {
        width: parseFloat(widthProp.value),
        height: parseFloat(heightProp.value),
      };
    }

    return null; // Not a printable item (e.g., supplies)
  }

  /**
   * Line item'dan ürün tipi belirler
   */
  private detectProductType(lineItem: any): string {
    const title = ((lineItem.title || '') + ' ' + (lineItem.variant_title || '')).toLowerCase();

    if (title.includes('uv dtf') || title.includes('uv-dtf')) return 'uv_dtf';
    if (title.includes('glitter')) return 'glitter';
    if (title.includes('glow')) return 'glow';
    if (title.includes('gang sheet') || title.includes('gang-sheet') || title.includes('gangsheet')) return 'gang_sheet';
    return 'dtf';
  }

  /**
   * Dittofeed'e üretim event'i gönderir
   */
  private async sendProductionEvent(job: any, fromStatus: string, toStatus: string) {
    const userId = job.order?.companyUserId;
    if (!userId) return;

    const eventName = this.mapStatusToEventName(toStatus);
    if (!eventName) return;

    await this.dittofeedService.trackEvent(userId, eventName, {
      jobId: job.id,
      orderId: job.orderId,
      orderNumber: job.order?.shopifyOrderNumber || '',
      productType: job.productType,
      dimensions: `${job.widthInch}"×${job.heightInch}"`,
      fromStatus,
      toStatus,
      printerName: job.printer?.name || null,
    });
  }

  /**
   * Status → Dittofeed event name mapping
   */
  private mapStatusToEventName(status: string): string | null {
    const map: Record<string, string> = {
      PRINTING:  'production_started',
      READY:     'production_completed',
      CANCELLED: 'production_delayed', // veya cancelled
      PICKED_UP: 'pickup_completed',
      SHIPPED:   'order_shipped', // Not 'shipment_created' — that fires from ShippingService
    };
    return map[status] || null;
  }
}
