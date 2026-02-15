import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { DittofeedService } from '../dittofeed/dittofeed.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * PenpotService — Integration with the centralized Penpot design platform.
 *
 * Key features:
 *  - Create design projects from orders (each line item with design files → Penpot page)
 *  - Handle multi-file orders: 1 order = 1 Penpot project, each file = 1 Penpot page
 *  - Preserve exact dimensions from variant/line item properties (the PNG is 1:1 print-ready size)
 *  - Track design lifecycle events → Dittofeed for marketing automation
 *  - Export designs as print-ready files
 */
@Injectable()
export class PenpotService implements OnModuleInit {
  private readonly logger = new Logger(PenpotService.name);
  private client: AxiosInstance | null = null;
  private initialized = false;

  constructor(
    private prisma: PrismaService,
    private dittofeed: DittofeedService,
  ) {}

  async onModuleInit() {
    const host = process.env.PENPOT_BACKEND_URL || 'http://multiservice-penpot-backend:6060';
    const email = process.env.PENPOT_API_EMAIL;
    const password = process.env.PENPOT_API_PASSWORD;

    if (!email || !password) {
      this.logger.warn('PENPOT_API_EMAIL / PENPOT_API_PASSWORD not set — Penpot integration disabled');
      return;
    }

    try {
      // Login to Penpot API and get auth token
      const loginRes = await axios.post(`${host}/api/rpc/command/login-with-password`, {
        email,
        password,
      });

      const authToken = loginRes.data?.['auth-token'] || loginRes.headers['set-cookie']?.[0]?.split('=')?.[1]?.split(';')?.[0];

      if (!authToken) {
        this.logger.error('Failed to extract auth token from Penpot login response');
        return;
      }

      this.client = axios.create({
        baseURL: host,
        headers: {
          'Authorization': `Token ${authToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });

      this.initialized = true;
      this.logger.log(`Penpot API client initialized → ${host}`);
    } catch (err: any) {
      this.logger.error(`Failed to init Penpot API client: ${err.message}`);
    }
  }

  private isReady(): boolean {
    return this.initialized && this.client !== null;
  }

  // ─── GET PUBLIC URL for Penpot frontend ───
  getPublicUrl(): string {
    return process.env.PENPOT_PUBLIC_URL || 'https://design.techifyboost.com';
  }

  // ─── CREATE DESIGN PROJECT FROM ORDER ───
  // Each order → 1 Penpot project
  // Each line item with design file → 1 page in that project
  async createDesignProjectFromOrder(orderId: string, merchantId: string) {
    if (!this.isReady()) return { success: false, error: 'Penpot not initialized' };

    // 1. Fetch the order with all line items
    const order = await this.prisma.orderLocal.findFirst({
      where: { id: orderId, merchantId },
      include: {
        company: { select: { id: true, name: true } },
        companyUser: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    const lineItems = Array.isArray(order.lineItems) ? order.lineItems : [];
    const designFiles = this.extractDesignFilesWithDimensions(lineItems);

    if (designFiles.length === 0) {
      return { success: false, error: 'No design files found in this order' };
    }

    try {
      // 2. Get or create Penpot team for this merchant
      const teamId = await this.getOrCreateTeam(merchantId);

      // 3. Create a Penpot project for this order
      const projectName = `Order #${order.shopifyOrderNumber || order.shopifyOrderId} — ${order.company?.name || 'Customer'}`;
      const project = await this.createProject(teamId, projectName);

      // 4. Create a file in the project
      const file = await this.createFile(project.id, projectName);

      // 5. For each design file, create a page (component) with exact dimensions
      const pages: any[] = [];
      for (let i = 0; i < designFiles.length; i++) {
        const designFile = designFiles[i];
        const pageName = `${designFile.lineItemTitle || `Item ${i + 1}`} — ${designFile.variantTitle || 'Default'}`;

        const page = await this.createPage(file.id, pageName, {
          width: designFile.dimensions.widthPx,
          height: designFile.dimensions.heightPx,
        });

        pages.push({
          pageId: page.id,
          pageName,
          designFile,
        });
      }

      // 6. Save DesignProject to local DB
      const designProject = await this.prisma.designProject.create({
        data: {
          merchantId,
          orderId: order.id,
          companyId: order.companyId,
          companyUserId: order.companyUserId,
          penpotProjectId: project.id,
          penpotFileId: file.id,
          title: projectName,
          status: 'draft',
          fileCount: designFiles.length,
          designMeta: {
            pages: pages.map(p => ({
              pageId: p.pageId,
              pageName: p.pageName,
              lineItemTitle: p.designFile.lineItemTitle,
              variantTitle: p.designFile.variantTitle,
              dimensions: p.designFile.dimensions,
              sourceUrl: p.designFile.uploadedFileUrl || p.designFile.previewUrl,
              printReadyUrl: p.designFile.printReadyUrl,
            })),
          },
        },
      });

      // 7. Track design event in Dittofeed
      if (order.companyUserId) {
        await this.dittofeed.trackDesignEvent(order.companyUserId, 'Design Project Created', {
          orderId: order.id,
          orderNumber: order.shopifyOrderNumber,
          designProjectId: designProject.id,
          fileCount: designFiles.length,
        });
      }

      const viewUrl = `${this.getPublicUrl()}/view/${file.id}`;

      return {
        success: true,
        designProject: {
          id: designProject.id,
          penpotProjectId: project.id,
          penpotFileId: file.id,
          viewUrl,
          pages: pages.map(p => ({
            pageId: p.pageId,
            pageName: p.pageName,
            dimensions: p.designFile.dimensions,
          })),
        },
      };
    } catch (err: any) {
      this.logger.error(`Failed to create design project for order ${orderId}: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  // ─── EXTRACT DESIGN FILES WITH EXACT DIMENSIONS FROM LINE ITEMS ───
  // The PNG is already at print-ready size. Dimensions come from:
  //   1. variant title (e.g. "11x17 / Full Color")
  //   2. line item properties (e.g. _width, _height, width, height)
  //   3. product type / options
  private extractDesignFilesWithDimensions(lineItems: any[]): any[] {
    if (!Array.isArray(lineItems)) return [];

    const files: any[] = [];
    for (const item of lineItems) {
      const properties = item.properties || [];
      if (!Array.isArray(properties) || properties.length === 0) continue;

      const fileInfo: any = {
        lineItemTitle: item.title || item.name,
        variantTitle: item.variant_title,
        quantity: item.quantity,
        price: item.price,
        shopifyVariantId: item.variant_id,
        shopifyProductId: item.product_id,
        imageUrl: item.image_url || null,
      };

      // Extract URLs from properties
      for (const prop of properties) {
        const name = (prop.name || '').toLowerCase();
        const value = prop.value || '';

        if (name.startsWith('_') && !name.includes('preview') && !name.includes('upload') && !name.includes('thumbnail') && !name.includes('width') && !name.includes('height')) continue;

        if (name.includes('preview') || name === '_preview') fileInfo.previewUrl = value;
        if (name.includes('print') && name.includes('ready')) fileInfo.printReadyUrl = value;
        if ((name.includes('uploaded') || name.includes('file_url') || name.includes('file url')) && this.isUrl(value)) fileInfo.uploadedFileUrl = value;
        if (name.includes('thumbnail') || name === '_ul_thumbnail') fileInfo.thumbnailUrl = value;
        if (name.includes('edit') && !name.includes('admin')) fileInfo.editUrl = value;

        // Dimension properties from customizer apps (CustomizerApp, Customily, etc.)
        if (name.includes('width') && !name.includes('screen')) fileInfo.rawWidth = value;
        if (name.includes('height') && !name.includes('screen')) fileInfo.rawHeight = value;
        if (name === 'dpi' || name === '_dpi') fileInfo.dpi = parseInt(value) || 300;
        if (name === 'unit' || name === '_unit') fileInfo.unit = value;

        // Generic URL detection
        if (!fileInfo.uploadedFileUrl && this.isUrl(value) && (
          name.includes('image') || name.includes('file') || name.includes('artwork') ||
          name.includes('design') || name.includes('photo') || name.includes('logo')
        )) {
          fileInfo.uploadedFileUrl = value;
        }
      }

      // Skip items without file references
      if (!fileInfo.previewUrl && !fileInfo.printReadyUrl && !fileInfo.uploadedFileUrl && !fileInfo.thumbnailUrl) continue;

      // Parse dimensions from variant title and properties
      fileInfo.dimensions = this.parseDimensions(
        item.variant_title,
        fileInfo.rawWidth,
        fileInfo.rawHeight,
        fileInfo.unit,
        fileInfo.dpi,
        item.options || [],
      );

      // Store all properties for transparency
      fileInfo.allProperties = properties.filter(
        (p: any) => !(p.name || '').startsWith('_') || (p.name || '').includes('preview') || (p.name || '').includes('upload') || (p.name || '').includes('width') || (p.name || '').includes('height')
      );

      files.push(fileInfo);
    }

    return files;
  }

  /**
   * Parse physical dimensions from variant title and/or line item properties.
   *
   * DTF Transfer prints: variant title often contains size like "11x17", "22x24", "11.5x16"
   * Customizer apps: properties may have _width, _height, unit fields
   *
   * The PNG uploaded by the customer is ALREADY at the exact print size (1:1 ratio).
   * We convert physical dimensions to pixels at 300 DPI for Penpot canvas.
   */
  private parseDimensions(
    variantTitle?: string,
    rawWidth?: string,
    rawHeight?: string,
    unit?: string,
    dpi?: number,
    options?: any[],
  ): { widthInch: number; heightInch: number; widthPx: number; heightPx: number; unit: string; dpi: number; source: string } {
    const targetDpi = dpi || 300;
    const targetUnit = unit || 'inch';

    // Strategy 1: Parse from explicit width/height properties
    if (rawWidth && rawHeight) {
      const w = parseFloat(rawWidth);
      const h = parseFloat(rawHeight);
      if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
        const wInch = targetUnit === 'cm' ? w / 2.54 : w;
        const hInch = targetUnit === 'cm' ? h / 2.54 : h;
        return {
          widthInch: wInch,
          heightInch: hInch,
          widthPx: Math.round(wInch * targetDpi),
          heightPx: Math.round(hInch * targetDpi),
          unit: targetUnit,
          dpi: targetDpi,
          source: 'properties',
        };
      }
    }

    // Strategy 2: Parse from variant title (e.g., "11x17", "22 x 24", "11.5x16 / Full Color")
    if (variantTitle) {
      const sizeMatch = variantTitle.match(/(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)/);
      if (sizeMatch) {
        const w = parseFloat(sizeMatch[1]);
        const h = parseFloat(sizeMatch[2]);
        if (w > 0 && h > 0) {
          return {
            widthInch: w,
            heightInch: h,
            widthPx: Math.round(w * targetDpi),
            heightPx: Math.round(h * targetDpi),
            unit: 'inch',
            dpi: targetDpi,
            source: 'variant_title',
          };
        }
      }
    }

    // Strategy 3: Parse from product options
    if (Array.isArray(options)) {
      for (const opt of options) {
        const name = (opt.name || '').toLowerCase();
        const value = opt.value || '';
        if (name.includes('size') || name.includes('boyut')) {
          const match = value.match(/(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)/);
          if (match) {
            const w = parseFloat(match[1]);
            const h = parseFloat(match[2]);
            if (w > 0 && h > 0) {
              return {
                widthInch: w,
                heightInch: h,
                widthPx: Math.round(w * targetDpi),
                heightPx: Math.round(h * targetDpi),
                unit: 'inch',
                dpi: targetDpi,
                source: 'product_option',
              };
            }
          }
        }
      }
    }

    // Fallback: default 11x17 (common DTF transfer size)
    return {
      widthInch: 11,
      heightInch: 17,
      widthPx: 3300,
      heightPx: 5100,
      unit: 'inch',
      dpi: targetDpi,
      source: 'default',
    };
  }

  private isUrl(value: string): boolean {
    if (!value || typeof value !== 'string') return false;
    return value.startsWith('http://') || value.startsWith('https://') || value.startsWith('//');
  }

  // ─── PENPOT API HELPERS ───

  private async getOrCreateTeam(merchantId: string): Promise<string> {
    if (!this.client) throw new Error('Penpot not initialized');

    // Check if we already have a team mapping
    const existing = await this.prisma.marketingSync.findFirst({
      where: { merchantId, entityType: 'penpot_team' },
    });

    if (existing?.dittofeedUserId) {
      return existing.dittofeedUserId; // We reuse this field to store penpotTeamId
    }

    // Get existing teams
    const teamsRes = await this.client.post('/api/rpc/command/get-teams', {});
    const teams = teamsRes.data || [];

    // Use the default team (first one)
    const teamId = teams.length > 0 ? teams[0].id : null;

    if (!teamId) {
      throw new Error('No Penpot team found');
    }

    // Save the mapping
    await this.prisma.marketingSync.create({
      data: {
        merchantId,
        entityType: 'penpot_team',
        entityId: merchantId,
        dittofeedUserId: teamId, // Reuse field for teamId storage
        syncStatus: 'synced',
        lastSyncedAt: new Date(),
      },
    });

    return teamId;
  }

  private async createProject(teamId: string, name: string): Promise<{ id: string }> {
    if (!this.client) throw new Error('Penpot not initialized');

    const res = await this.client.post('/api/rpc/command/create-project', {
      'team-id': teamId,
      name,
    });

    return { id: res.data.id };
  }

  private async createFile(projectId: string, name: string): Promise<{ id: string }> {
    if (!this.client) throw new Error('Penpot not initialized');

    const res = await this.client.post('/api/rpc/command/create-file', {
      'project-id': projectId,
      name,
    });

    return { id: res.data.id };
  }

  private async createPage(fileId: string, name: string, dimensions: { width: number; height: number }): Promise<{ id: string }> {
    if (!this.client) throw new Error('Penpot not initialized');

    // Penpot creates a default page, so we add additional pages
    const res = await this.client.post('/api/rpc/command/create-page', {
      'file-id': fileId,
      name,
      // Set frame dimensions
      width: dimensions.width,
      height: dimensions.height,
    });

    return { id: res.data?.id || 'default' };
  }

  // ─── GET DESIGN PROJECTS FOR ORDER ───
  async getDesignProjectsForOrder(orderId: string, merchantId: string) {
    const projects = await this.prisma.designProject.findMany({
      where: { orderId, merchantId },
      orderBy: { createdAt: 'desc' },
    });

    return projects.map(p => ({
      ...p,
      viewUrl: p.penpotFileId ? `${this.getPublicUrl()}/view/${p.penpotFileId}` : null,
      editUrl: p.penpotFileId ? `${this.getPublicUrl()}/workspace/${p.penpotProjectId}/${p.penpotFileId}` : null,
    }));
  }

  // ─── GET ALL DESIGN PROJECTS ───
  async getAllDesignProjects(merchantId: string, filters?: { status?: string; companyId?: string }) {
    const where: any = { merchantId };
    if (filters?.status) where.status = filters.status;
    if (filters?.companyId) where.companyId = filters.companyId;

    const projects = await this.prisma.designProject.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return projects.map(p => ({
      ...p,
      viewUrl: p.penpotFileId ? `${this.getPublicUrl()}/view/${p.penpotFileId}` : null,
      editUrl: p.penpotFileId ? `${this.getPublicUrl()}/workspace/${p.penpotProjectId}/${p.penpotFileId}` : null,
    }));
  }

  // ─── UPDATE DESIGN PROJECT STATUS ───
  async updateDesignProjectStatus(id: string, merchantId: string, status: string) {
    const project = await this.prisma.designProject.update({
      where: { id },
      data: { status },
    });

    // Track status change in Dittofeed
    if (project.companyUserId) {
      await this.dittofeed.trackDesignEvent(project.companyUserId, 'Design Status Changed', {
        designProjectId: project.id,
        orderId: project.orderId,
        status,
      });
    }

    return project;
  }

  // ─── EXPORT DESIGN ───
  async exportDesign(designProjectId: string, merchantId: string, format: 'svg' | 'pdf' | 'png' = 'pdf') {
    if (!this.isReady()) return { success: false, error: 'Penpot not initialized' };

    const project = await this.prisma.designProject.findFirst({
      where: { id: designProjectId, merchantId },
    });

    if (!project || !project.penpotFileId) {
      return { success: false, error: 'Design project not found' };
    }

    try {
      // Use Penpot exporter API
      const exporterUrl = process.env.PENPOT_EXPORTER_URL || 'http://multiservice-penpot-exporter:6061';

      const res = await axios.post(`${exporterUrl}/export`, {
        'file-id': project.penpotFileId,
        type: format,
      }, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });

      // Update project
      await this.prisma.designProject.update({
        where: { id: designProjectId },
        data: {
          exportFormat: format,
          exportedAt: new Date(),
          status: 'exported',
        },
      });

      // Track export in Dittofeed
      if (project.companyUserId) {
        await this.dittofeed.trackDesignEvent(project.companyUserId, 'Design Exported', {
          designProjectId: project.id,
          orderId: project.orderId,
          format,
        });
      }

      return {
        success: true,
        data: res.data,
        contentType: format === 'pdf' ? 'application/pdf' : format === 'svg' ? 'image/svg+xml' : 'image/png',
      };
    } catch (err: any) {
      this.logger.error(`Failed to export design ${designProjectId}: ${err.message}`);
      return { success: false, error: err.message };
    }
  }
}
