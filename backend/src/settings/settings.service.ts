import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getMerchantSettings(merchantId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: {
        id: true,
        shopDomain: true,
        settings: true,
        snippetEnabled: true,
        planName: true,
        lastSyncAt: true,
      },
    });

    // Get sync stats
    const [totalCustomers, syncedCustomers, totalProducts, totalOrders] = await Promise.all([
      this.prisma.companyUser.count({ where: { company: { merchantId } } }),
      this.prisma.companyUser.count({ where: { company: { merchantId }, shopifyCustomerId: { not: null } } }),
      this.prisma.catalogProduct.count({ where: { merchantId } }),
      this.prisma.orderLocal.count({ where: { merchantId } }),
    ]);

    return {
      ...merchant,
      stats: {
        totalCustomers,
        syncedCustomers,
        totalProducts,
        totalOrders,
      },
    };
  }

  async updateMerchantSettings(merchantId: string, settings: any) {
    return this.prisma.merchant.update({
      where: { id: merchantId },
      data: {
        settings: settings,
        updatedAt: new Date(),
      },
    });
  }

  async toggleSnippet(merchantId: string, enabled: boolean) {
    return this.prisma.merchant.update({
      where: { id: merchantId },
      data: { snippetEnabled: enabled },
    });
  }

  async getCompanySettings(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        settings: true,
        companyGroup: true,
        status: true,
      },
    });
    return company;
  }

  async updateCompanySettings(companyId: string, settings: any) {
    return this.prisma.company.update({
      where: { id: companyId },
      data: {
        settings: settings,
        updatedAt: new Date(),
      },
    });
  }

  async getSsoSettings(merchantId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { settings: true },
    });

    const settings = (merchant?.settings as any) || {};
    return {
      mode: settings.ssoMode || 'alternative',
      multipassSecret: settings.multipassSecret || '',
      storefrontToken: settings.storefrontToken || '',
    };
  }

  async updateSsoSettings(merchantId: string, ssoSettings: { mode: string; multipassSecret?: string; storefrontToken?: string }) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { settings: true },
    });

    const currentSettings = (merchant?.settings as any) || {};
    const updatedSettings = {
      ...currentSettings,
      ssoMode: ssoSettings.mode,
      multipassSecret: ssoSettings.multipassSecret || currentSettings.multipassSecret || '',
      storefrontToken: ssoSettings.storefrontToken || currentSettings.storefrontToken || '',
    };

    return this.prisma.merchant.update({
      where: { id: merchantId },
      data: {
        settings: updatedSettings,
        updatedAt: new Date(),
      },
    });
  }
}

