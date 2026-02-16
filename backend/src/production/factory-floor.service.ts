import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DittofeedService } from '../dittofeed/dittofeed.service';
import { PenpotService } from '../penpot/penpot.service';
import { PickupService } from '../pickup/pickup.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProductionGateway } from './production.gateway';
import { ProductionService } from './production.service';

/**
 * FactoryFloorService — QR → Penpot → Print Queue → Factory Floor
 *
 * Bu servis, siparişin fabrikaya girişinden teslimatına kadar olan
 * tam üretim orkestrasyon akışını yönetir.
 *
 * Akış:
 *   1. Sipariş gelir → Pickup order oluşur (QR kod)
 *   2. QR taranır → Design project Penpot'ta oluşur
 *   3. Design onaylanır → Production job(lar) oluşur (Print Queue)
 *   4. Job'lar Kanban board üzerinde pipeline'dan geçer
 *   5. READY olunca → Pickup shelf'e atanır + müşteri bilgilendirilir
 *   6. Müşteri QR tarar → Pickup tamamlanır
 *
 * Her adım WebSocket ile real-time broadcast edilir.
 */

// ── Full pipeline status for factory floor display ──
export interface FactoryFloorOrder {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  companyName: string;
  qrCode: string;
  currentPhase: 'INTAKE' | 'DESIGN' | 'PRODUCTION' | 'READY' | 'COMPLETED';
  intake: {
    pickupOrderId: string | null;
    status: string;
    assignedShelf: string | null;
    createdAt: Date | null;
  };
  design: {
    projectId: string | null;
    penpotFileId: string | null;
    penpotUrl: string | null;
    status: string;
    pageCount: number;
  };
  production: {
    jobs: Array<{
      jobId: string;
      status: string;
      productType: string;
      dimensions: string;
      printer: string | null;
      operator: string | null;
      progress: number; // 0-100%
    }>;
    overallProgress: number;
  };
  timeline: Array<{
    event: string;
    timestamp: Date;
    details?: string;
  }>;
}

// Progress lookup for each status (relative to entire pipeline)
const STATUS_PROGRESS: Record<string, number> = {
  QUEUED: 10,
  PREPRESS: 20,
  PRINTING: 40,
  CURING: 55,
  CUTTING: 65,
  QC_CHECK: 75,
  PACKAGING: 85,
  READY: 95,
  PICKED_UP: 100,
  SHIPPED: 100,
  COMPLETED: 100,
  CANCELLED: 0,
};

@Injectable()
export class FactoryFloorService {
  private readonly logger = new Logger(FactoryFloorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly penpotService: PenpotService,
    private readonly pickupService: PickupService,
    private readonly productionService: ProductionService,
    private readonly productionGateway: ProductionGateway,
    private readonly dittofeed: DittofeedService,
  ) {}

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 1: ORDER INTAKE — QR Code Generation
  // Sipariş gelir → Pickup order + QR kod oluşur
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Tam factory floor akışını başlatır.
   * Pickup order → Design project → Production jobs hepsini sırayla oluşturur.
   */
  async initiateFullPipeline(merchantId: string, orderId: string) {
    this.logger.log(`🏭 Initiating full pipeline for order ${orderId}`);

    const order = await this.prisma.orderLocal.findFirst({
      where: { id: orderId, merchantId },
      include: {
        company: { select: { id: true, name: true } },
        companyUser: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    const customerName = order.companyUser
      ? `${order.companyUser.firstName || ''} ${order.companyUser.lastName || ''}`.trim()
      : (order.email || 'Customer');

    const result = {
      orderId,
      orderNumber: order.shopifyOrderNumber,
      intake: null as any,
      design: null as any,
      production: null as any,
    };

    // ── STEP 1: Create Pickup Order (QR Code) ──
    try {
      const pickupOrder = await this.pickupService.createPickupOrder(merchantId, {
        orderId,
        companyId: order.companyId || undefined,
        companyUserId: order.companyUserId || undefined,
        customerEmail: order.email || undefined,
        customerName,
        orderNumber: order.shopifyOrderNumber || undefined,
      });

      result.intake = {
        pickupOrderId: pickupOrder.id,
        qrCode: pickupOrder.qrCode,
        status: pickupOrder.status,
      };

      this.logger.log(`  ✓ Pickup order created: ${pickupOrder.qrCode}`);
    } catch (err: any) {
      this.logger.warn(`  ✗ Pickup order failed: ${err.message}`);
      result.intake = { error: err.message };
    }

    // ── STEP 2: Create Design Project (Penpot) ──
    try {
      const designProject = await this.penpotService.createDesignProjectFromOrder(orderId, merchantId);
      result.design = designProject;

      if (designProject.success) {
        this.logger.log(`  ✓ Design project created: ${designProject.designProject?.id}`);
      } else {
        this.logger.warn(`  ✗ Design project: ${designProject.error}`);
      }
    } catch (err: any) {
      this.logger.warn(`  ✗ Design project failed: ${err.message}`);
      result.design = { success: false, error: err.message };
    }

    // ── STEP 3: Create Production Jobs ──
    try {
      const jobs = await this.productionService.createJobsFromOrder(merchantId, orderId);
      result.production = jobs;
      this.logger.log(`  ✓ Production jobs created: ${jobs.created} jobs`);

      // Broadcast new jobs via WebSocket
      for (const job of jobs.jobs || []) {
        this.productionGateway.emitJobCreated(merchantId, {
          jobId: job.id,
          orderId: job.orderId,
          orderNumber: job.order?.shopifyOrderNumber || '',
          productType: job.productType,
          priority: job.priority || 'STANDARD',
          dimensions: `${job.widthInch}"×${job.heightInch}"`,
        });
      }
    } catch (err: any) {
      this.logger.warn(`  ✗ Production jobs failed: ${err.message}`);
      result.production = { error: err.message };
    }

    // ── Dittofeed event ──
    if (order.companyUserId) {
      try {
        await this.dittofeed.trackEvent(order.companyUserId, 'factory_pipeline_initiated', {
          orderId,
          orderNumber: order.shopifyOrderNumber || '',
          hasDesign: result.design?.success || false,
          productionJobs: result.production?.created || 0,
          qrCode: result.intake?.qrCode || '',
        });
      } catch {}
    }

    this.logger.log(`🏭 Pipeline initiated for order ${order.shopifyOrderNumber}`);
    return result;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 2: QR SCAN → DESIGN CREATION
  // Fabrikada QR taranınca design project oluşur
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * QR kod taranınca:
   * 1. Pickup order bilgisini yükler
   * 2. Design project yoksa Penpot'ta oluşturur
   * 3. Production job yoksa oluşturur
   */
  async scanAndProcess(qrCode: string) {
    // 1. Pickup order bul
    const pickupOrder = await this.prisma.pickupOrder.findUnique({
      where: { qrCode },
      include: {
        order: {
          include: {
            company: { select: { name: true } },
            designProjects: { select: { id: true, status: true, penpotFileId: true } },
            productionJobs: { select: { id: true, status: true, productType: true, widthInch: true, heightInch: true } },
          },
        },
        shelf: true,
      },
    });

    if (!pickupOrder) throw new NotFoundException('Invalid QR code');
    if (!pickupOrder.order) throw new NotFoundException('Order not found for this pickup');

    const order = pickupOrder.order;
    const merchantId = pickupOrder.merchantId;

    // 2. Design project yoksa oluştur
    let designResult: any = null;
    if (!order.designProjects?.length) {
      try {
        designResult = await this.penpotService.createDesignProjectFromOrder(order.id, merchantId);
        this.logger.log(`QR scan → Design project created for order ${pickupOrder.orderNumber}`);
      } catch (err: any) {
        designResult = { success: false, error: err.message };
      }
    } else {
      designResult = {
        success: true,
        existing: true,
        designProject: order.designProjects[0],
      };
    }

    // 3. Production job yoksa oluştur
    let productionResult: any = null;
    if (!order.productionJobs?.length) {
      try {
        productionResult = await this.productionService.createJobsFromOrder(merchantId, order.id);
        this.logger.log(`QR scan → ${productionResult.created} production jobs created`);

        // WebSocket broadcast
        for (const job of productionResult.jobs || []) {
          this.productionGateway.emitJobCreated(merchantId, {
            jobId: job.id,
            orderId: job.orderId,
            orderNumber: job.order?.shopifyOrderNumber || '',
            productType: job.productType,
            priority: job.priority || 'STANDARD',
            dimensions: `${job.widthInch}"×${job.heightInch}"`,
          });
        }
      } catch (err: any) {
        productionResult = { error: err.message };
      }
    } else {
      productionResult = {
        existing: true,
        count: order.productionJobs.length,
        jobs: order.productionJobs,
      };
    }

    // 4. Pickup status update → processing
    if (pickupOrder.status === 'pending') {
      await this.pickupService.updateStatus(pickupOrder.id, merchantId, 'processing');
    }

    return {
      pickup: {
        id: pickupOrder.id,
        qrCode: pickupOrder.qrCode,
        orderNumber: pickupOrder.orderNumber,
        customerName: pickupOrder.customerName,
        status: pickupOrder.status === 'pending' ? 'processing' : pickupOrder.status,
        shelf: pickupOrder.shelf?.code || null,
      },
      design: designResult,
      production: productionResult,
      order: {
        id: order.id,
        companyName: (order as any).company?.name || '',
      },
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 3: DESIGN → PRINT QUEUE
  // Design onaylandığında production queue'ya gönder
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Penpot'tan design onaylandığında:
   * 1. Design project statusu → 'approved'
   * 2. Production jobs yoksa oluşturulur
   * 3. Varsa QUEUED → PREPRESS'e taşınır
   */
  async approveDesignAndQueue(designProjectId: string, merchantId: string) {
    // 1. Design statusunu güncelle
    const designProject = await this.penpotService.updateDesignProjectStatus(
      designProjectId,
      merchantId,
      'approved',
    );

    if (!designProject) {
      throw new NotFoundException('Design project not found');
    }

    const orderId = (designProject as any).orderId;

    // 2. Production jobs kontrol
    const existingJobs = await this.prisma.productionJob.findMany({
      where: { orderId, merchantId },
    });

    let jobs = existingJobs;

    if (existingJobs.length === 0) {
      // Job yoksa oluştur
      const result = await this.productionService.createJobsFromOrder(merchantId, orderId);
      jobs = result.jobs;

      for (const job of result.jobs || []) {
        this.productionGateway.emitJobCreated(merchantId, {
          jobId: job.id,
          orderId: job.orderId,
          orderNumber: job.order?.shopifyOrderNumber || '',
          productType: job.productType,
          priority: job.priority || 'STANDARD',
          dimensions: `${job.widthInch}"×${job.heightInch}"`,
        });
      }
    } else {
      // Mevcut QUEUED job'ları PREPRESS'e taşı
      for (const job of existingJobs) {
        if (job.status === 'QUEUED') {
          try {
            await this.productionService.moveToStatus(job.id, 'PREPRESS' as any);
            this.productionGateway.emitJobMoved(merchantId, {
              jobId: job.id,
              orderId: job.orderId,
              orderNumber: '',
              fromStatus: 'QUEUED',
              toStatus: 'PREPRESS',
              productType: job.productType,
            });
          } catch (err: any) {
            this.logger.warn(`Failed to move job ${job.id} to PREPRESS: ${err.message}`);
          }
        }
      }
    }

    return {
      designProject: { id: designProjectId, status: 'approved' },
      productionJobs: jobs.length,
      movedToPrepress: existingJobs.filter(j => j.status === 'QUEUED').length,
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 4: PRODUCTION COMPLETE → READY FOR PICKUP
  // Job READY olunca shelf ata + bildirim gönder
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Tüm production job'lar READY olduğunda:
   * 1. Bir sonraki müsait shelf'e ata
   * 2. Pickup statusu → 'ready'
   * 3. Müşteriye bildirim gönder (Dittofeed event)
   */
  async markOrderReady(orderId: string, merchantId: string) {
    // 1. Tüm production job'lar READY/COMPLETED mı kontrol et
    const jobs = await this.prisma.productionJob.findMany({
      where: { orderId, merchantId },
    });

    const allReady = jobs.length > 0 && jobs.every(
      j => ['READY', 'PICKED_UP', 'SHIPPED', 'COMPLETED'].includes(j.status),
    );

    if (!allReady) {
      const pending = jobs.filter(j => !['READY', 'PICKED_UP', 'SHIPPED', 'COMPLETED'].includes(j.status));
      return {
        success: false,
        message: `${pending.length} job(s) still in production`,
        pendingJobs: pending.map(j => ({ id: j.id, status: j.status })),
      };
    }

    // 2. Pickup order bul
    const pickupOrder = await this.prisma.pickupOrder.findFirst({
      where: { orderId, merchantId },
    });

    if (!pickupOrder) {
      return { success: false, message: 'No pickup order found for this order' };
    }

    // 3. Auto-assign shelf (boş olan ilk shelf)
    let assignedShelf: any = null;
    if (!pickupOrder.shelfId) {
      const availableShelf = await this.prisma.pickupShelf.findFirst({
        where: {
          merchantId,
          isActive: true,
        },
        orderBy: {
          pickupOrders: { _count: 'asc' }, // en az dolu shelf
        },
      });

      if (availableShelf) {
        await this.pickupService.assignShelf(pickupOrder.id, merchantId, availableShelf.id);
        assignedShelf = availableShelf;
        this.logger.log(`  Shelf assigned: ${availableShelf.code}`);
      }
    }

    // 4. Pickup status → ready
    await this.pickupService.updateStatus(pickupOrder.id, merchantId, 'ready');

    // 5. Dittofeed event → bildirim tetikle
    const order = await this.prisma.orderLocal.findUnique({
      where: { id: orderId },
      select: { companyUserId: true, shopifyOrderNumber: true, email: true },
    });

    if (order?.companyUserId) {
      try {
        await this.dittofeed.trackEvent(order.companyUserId, 'order_ready_for_pickup', {
          orderId,
          orderNumber: order.shopifyOrderNumber || '',
          qrCode: pickupOrder.qrCode,
          shelfCode: assignedShelf?.code || pickupOrder.shelfId || 'N/A',
          totalJobs: jobs.length,
        });
      } catch {}
    }

    // 6. WebSocket broadcast
    this.productionGateway.emitQueueUpdate(merchantId, {
      queued: 0,
      printing: 0,
      ready: jobs.length,
      delayed: 0,
    });

    return {
      success: true,
      pickupOrderId: pickupOrder.id,
      qrCode: pickupOrder.qrCode,
      shelf: assignedShelf?.code || 'already assigned',
      status: 'ready',
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FACTORY FLOOR DISPLAY — Full order status dashboard
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Factory floor ekranı için tek bir siparişin
   * tam pipeline durumunu döndürür.
   */
  async getOrderPipelineStatus(orderId: string, merchantId: string): Promise<FactoryFloorOrder> {
    const order = await this.prisma.orderLocal.findFirst({
      where: { id: orderId, merchantId },
      include: {
        company: { select: { name: true } },
        companyUser: { select: { email: true, firstName: true, lastName: true } },
        designProjects: {
          select: { id: true, status: true, penpotFileId: true, designMeta: true, fileCount: true, createdAt: true, updatedAt: true },
        },
        productionJobs: {
          include: {
            printer: { select: { name: true } },
          },
          orderBy: { queuedAt: 'asc' },
        },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    // Pickup order
    const pickupOrder = await this.prisma.pickupOrder.findFirst({
      where: { orderId, merchantId },
      include: { shelf: true },
    });

    const customerName = order.companyUser
      ? `${order.companyUser.firstName || ''} ${order.companyUser.lastName || ''}`.trim()
      : (order.email || 'Customer');

    // Design info
    const design = order.designProjects?.[0];
    const designMeta = design?.designMeta as any;
    const designPages = Array.isArray(designMeta?.pages) ? designMeta.pages : [];

    // Production jobs
    const prodJobs = (order.productionJobs || []).map((j: any) => ({
      jobId: j.id,
      status: j.status,
      productType: j.productType,
      dimensions: `${j.widthInch}"×${j.heightInch}"`,
      printer: j.printer?.name || null,
      operator: j.operatorName || null,
      progress: STATUS_PROGRESS[j.status] || 0,
    }));

    const overallProgress = prodJobs.length > 0
      ? Math.round(prodJobs.reduce((sum: number, j: any) => sum + j.progress, 0) / prodJobs.length)
      : 0;

    // Current phase determination
    let currentPhase: FactoryFloorOrder['currentPhase'] = 'INTAKE';
    if (design && design.status === 'approved' && prodJobs.length > 0) {
      const allComplete = prodJobs.every((j: any) => ['COMPLETED', 'PICKED_UP', 'SHIPPED'].includes(j.status));
      const allReady = prodJobs.every((j: any) => ['READY', 'COMPLETED', 'PICKED_UP', 'SHIPPED'].includes(j.status));

      if (allComplete) currentPhase = 'COMPLETED';
      else if (allReady) currentPhase = 'READY';
      else currentPhase = 'PRODUCTION';
    } else if (design) {
      currentPhase = 'DESIGN';
    }

    // Timeline
    const timeline: FactoryFloorOrder['timeline'] = [];

    if (pickupOrder?.createdAt) {
      timeline.push({ event: 'Pickup order created', timestamp: pickupOrder.createdAt, details: `QR: ${pickupOrder.qrCode}` });
    }
    if (design?.createdAt) {
      timeline.push({ event: 'Design project created', timestamp: design.createdAt, details: `${designPages.length} design(s)` });
    }

    for (const j of order.productionJobs || []) {
      if ((j as any).queuedAt) timeline.push({ event: `Job queued: ${(j as any).productType}`, timestamp: (j as any).queuedAt });
      if ((j as any).printStartAt) timeline.push({ event: `Printing started`, timestamp: (j as any).printStartAt });
      if ((j as any).completedAt) timeline.push({ event: `Job completed`, timestamp: (j as any).completedAt });
    }

    if (pickupOrder?.readyAt) {
      timeline.push({ event: 'Ready for pickup', timestamp: pickupOrder.readyAt });
    }
    if (pickupOrder?.pickedUpAt) {
      timeline.push({ event: 'Picked up by customer', timestamp: pickupOrder.pickedUpAt });
    }

    timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return {
      orderId: order.id,
      orderNumber: order.shopifyOrderNumber || '',
      customerName,
      customerEmail: order.email || '',
      companyName: (order as any).company?.name || '',
      qrCode: pickupOrder?.qrCode || '',
      currentPhase,
      intake: {
        pickupOrderId: pickupOrder?.id || null,
        status: pickupOrder?.status || 'none',
        assignedShelf: pickupOrder?.shelf?.code || null,
        createdAt: pickupOrder?.createdAt || null,
      },
      design: {
        projectId: design?.id || null,
        penpotFileId: design?.penpotFileId || null,
        penpotUrl: design?.penpotFileId
          ? `${this.penpotService.getPublicUrl()}/view/${design.penpotFileId}`
          : null,
        status: design?.status || 'none',
        pageCount: designPages.length,
      },
      production: {
        jobs: prodJobs,
        overallProgress,
      },
      timeline,
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FACTORY FLOOR DASHBOARD — All active orders
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Fabrika ekranı — tüm aktif siparişlerin pipeline durumu.
   * Gruplandırılmış: INTAKE | DESIGN | PRODUCTION | READY
   */
  async getFactoryFloorDashboard(merchantId: string) {
    // Aktif production job'ları olan siparişler
    const activeOrders = await this.prisma.orderLocal.findMany({
      where: {
        merchantId,
        productionJobs: {
          some: {
            status: { notIn: ['COMPLETED', 'CANCELLED'] as any[] },
          },
        },
      },
      select: {
        id: true,
        shopifyOrderNumber: true,
        email: true,
        company: { select: { name: true } },
        productionJobs: {
          select: {
            id: true,
            status: true,
            productType: true,
            widthInch: true,
            heightInch: true,
            priority: true,
            estimatedReadyAt: true,
            queuedAt: true,
          },
          orderBy: { queuedAt: 'asc' },
        },
        designProjects: {
          select: { id: true, status: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Pickup orders for these orders
    const orderIds = activeOrders.map(o => o.id);
    const pickupOrders = await this.prisma.pickupOrder.findMany({
      where: { orderId: { in: orderIds }, merchantId },
      select: { orderId: true, qrCode: true, status: true, shelfId: true },
    });
    const pickupMap = new Map<string, { orderId: string; qrCode: string; status: string; shelfId: string | null }>(pickupOrders.map((p: any) => [p.orderId, p]));

    // Aggregate per phase
    const dashboard = {
      totals: {
        intake: 0,
        design: 0,
        production: 0,
        ready: 0,
      },
      orders: activeOrders.map(order => {
        const pickup = pickupMap.get(order.id);
        const design = order.designProjects?.[0];
        const jobs = order.productionJobs || [];
        const allReady = jobs.length > 0 && jobs.every(j => ['READY', 'PICKED_UP', 'SHIPPED', 'COMPLETED'].includes(j.status));
        const hasDesign = !!design;
        const hasProd = jobs.length > 0;

        let phase: string;
        if (allReady) { phase = 'READY'; dashboard.totals.ready++; }
        else if (hasProd) { phase = 'PRODUCTION'; dashboard.totals.production++; }
        else if (hasDesign) { phase = 'DESIGN'; dashboard.totals.design++; }
        else { phase = 'INTAKE'; dashboard.totals.intake++; }

        const progress = jobs.length > 0
          ? Math.round(jobs.reduce((s, j) => s + (STATUS_PROGRESS[j.status] || 0), 0) / jobs.length)
          : 0;

        return {
          orderId: order.id,
          orderNumber: order.shopifyOrderNumber || '',
          company: (order as any).company?.name || '',
          email: order.email || '',
          phase,
          qrCode: pickup?.qrCode || '',
          designStatus: design?.status || 'none',
          jobCount: jobs.length,
          rushPriority: jobs.some(j => ['RUSH', 'SAME_DAY', 'NEXT_DAY'].includes(j.priority as string)),
          progress,
          isOverdue: jobs.some(j => j.estimatedReadyAt && new Date() > j.estimatedReadyAt),
          oldestJobAge: jobs.length > 0 && jobs[0].queuedAt
            ? Math.round((Date.now() - jobs[0].queuedAt.getTime()) / 60000)
            : 0,
        };
      }),
    };

    return dashboard;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DAILY SUMMARY — Factory floor analytics
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async getDailySummary(merchantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      ordersCreatedToday,
      jobsCompletedToday,
      designsCreatedToday,
      pickupsCompletedToday,
      activeJobs,
      readyForPickup,
    ] = await Promise.all([
      this.prisma.orderLocal.count({
        where: { merchantId, createdAt: { gte: today } },
      }),
      this.prisma.productionJob.count({
        where: { merchantId, completedAt: { gte: today } },
      }),
      this.prisma.designProject.count({
        where: { merchantId, createdAt: { gte: today } },
      }),
      this.prisma.pickupOrder.count({
        where: { merchantId, pickedUpAt: { gte: today } },
      }),
      this.prisma.productionJob.count({
        where: { merchantId, status: { notIn: ['COMPLETED', 'CANCELLED'] as any[] } },
      }),
      this.prisma.pickupOrder.count({
        where: { merchantId, status: { in: ['ready', 'notified'] } },
      }),
    ]);

    // Sqft printed today
    const completedJobsToday = await this.prisma.productionJob.findMany({
      where: { merchantId, completedAt: { gte: today } },
      select: { areaSquareInch: true },
    });
    const sqftToday = completedJobsToday.reduce((sum, j) => sum + (j.areaSquareInch || 0), 0) / 144;

    return {
      date: today.toISOString().split('T')[0],
      ordersCreated: ordersCreatedToday,
      jobsCompleted: jobsCompletedToday,
      designsCreated: designsCreatedToday,
      pickupsCompleted: pickupsCompletedToday,
      sqftPrinted: Math.round(sqftToday * 100) / 100,
      activeInPipeline: activeJobs,
      readyForPickup,
    };
  }
}
