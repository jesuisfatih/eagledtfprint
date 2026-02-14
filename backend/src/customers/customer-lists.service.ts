import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Customer Lists Service
 * - Custom lists (drag & drop, manual select, named groups)
 * - Smart alarm lists (auto-generated based on intelligence data)
 */

interface AlertDefinition {
  systemType: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  filter: (customer: any) => boolean;
  priority: number; // lower = more important
}

@Injectable()
export class CustomerListsService {
  private readonly logger = new Logger(CustomerListsService.name);

  constructor(private prisma: PrismaService) {}

  // ===================================================
  // SMART ALARM DEFINITIONS
  // ===================================================
  private getAlarmDefinitions(): AlertDefinition[] {
    return [
      {
        systemType: 'churn_alarm',
        name: '🚨 Churn Alarm — About to Lose',
        description: 'Customers with high/critical churn risk who haven\'t ordered recently & have significant spend history',
        color: '#ef4444',
        icon: 'alert-triangle',
        priority: 1,
        filter: (c) => {
          const dm = c.insight?.deepMetrics;
          const risk = c.insight?.churnRisk;
          return (risk === 'high' || risk === 'critical') &&
            Number(c.totalSpent || 0) > 100 &&
            (dm?.churnProbability >= 60 || c.insight?.daysSinceLastOrder > 45);
        },
      },
      {
        systemType: 'attention_needed',
        name: '⚠️ Needs Attention — Slowing Down',
        description: 'Previously active customers whose order frequency is declining or spending is dropping',
        color: '#f59e0b',
        icon: 'eye',
        priority: 2,
        filter: (c) => {
          const dm = c.insight?.deepMetrics;
          if (!dm) return false;
          return (c.insight?.rfmSegment === 'need_attention' ||
            c.insight?.rfmSegment === 'about_to_sleep') &&
            c.ordersCount >= 2;
        },
      },
      {
        systemType: 'dormant_whales',
        name: '💤 Dormant Whales — High-Value Sleepers',
        description: 'Big spenders who haven\'t ordered in a while — huge reactivation potential',
        color: '#8b5cf6',
        icon: 'diamond',
        priority: 3,
        filter: (c) => {
          const dm = c.insight?.deepMetrics;
          return dm?.isDormantHighValue === true ||
            (Number(c.totalSpent || 0) > 500 &&
              c.insight?.daysSinceLastOrder > 60 &&
              c.ordersCount >= 3);
        },
      },
      {
        systemType: 'frequency_drop',
        name: '📉 Frequency Drop — Ordering Less',
        description: 'Customers whose order frequency has significantly declined compared to their usual pattern',
        color: '#f97316',
        icon: 'chart-arrows',
        priority: 4,
        filter: (c) => {
          const dm = c.insight?.deepMetrics;
          if (!dm || c.ordersCount < 3) return false;
          return dm.orderGrowthRate < -30 || dm.engagementVelocity === 'declining';
        },
      },
      {
        systemType: 'rising_stars',
        name: '🚀 Rising Stars — Growing Fast',
        description: 'New or mid-tier customers showing rapid growth in orders and spending',
        color: '#3b82f6',
        icon: 'rocket',
        priority: 5,
        filter: (c) => {
          const dm = c.insight?.deepMetrics;
          return dm?.isRisingStar === true ||
            (dm?.spendingGrowthRate > 50 && dm?.orderGrowthRate > 30);
        },
      },
      {
        systemType: 'vip_candidates',
        name: '🌟 VIP Candidates — Ready to Upgrade',
        description: 'Customers showing elite-level metrics who could be upgraded to VIP status',
        color: '#eab308',
        icon: 'crown',
        priority: 6,
        filter: (c) => {
          const dm = c.insight?.deepMetrics;
          return dm?.isVipCandidate === true;
        },
      },
      {
        systemType: 'comeback_window',
        name: '⏰ Comeback Window — Act Now',
        description: 'Customers within their predicted reactivation window — perfect timing for outreach',
        color: '#06b6d4',
        icon: 'clock',
        priority: 7,
        filter: (c) => {
          const dm = c.insight?.deepMetrics;
          if (!dm || !dm.predictedNextOrderDays) return false;
          const daysSince = c.insight?.daysSinceLastOrder || 0;
          const predicted = dm.predictedNextOrderDays;
          // They are 0-7 days past their predicted next order window
          return daysSince >= predicted && daysSince <= predicted + 7;
        },
      },
      {
        systemType: 'discount_sensitive',
        name: '🏷️ Discount Responsive — Offer Driven',
        description: 'Customers who primarily buy with discounts — perfect targets for promotions',
        color: '#10b981',
        icon: 'discount-2',
        priority: 8,
        filter: (c) => {
          const dm = c.insight?.deepMetrics;
          return dm?.discountUsageRate > 60 && c.ordersCount >= 2;
        },
      },
    ];
  }

  // ===================================================
  // GENERATE SMART ALARMS
  // ===================================================
  async generateSmartAlarms(merchantId: string): Promise<{ generated: number; alarms: any[] }> {
    this.logger.log(`Generating smart alarms for merchant: ${merchantId}`);

    // Get all customers with insights
    const customers = await this.prisma.shopifyCustomer.findMany({
      where: { merchantId },
      include: { insight: true },
    });

    const definitions = this.getAlarmDefinitions();
    const results: any[] = [];

    for (const def of definitions) {
      // Find matching customers
      const matchingCustomers = customers.filter(c => {
        try { return def.filter(c); }
        catch { return false; }
      });

      if (matchingCustomers.length === 0) continue;

      // Upsert system list
      let list = await this.prisma.customerList.findFirst({
        where: { merchantId, isSystem: true, systemType: def.systemType },
      });

      if (!list) {
        list = await this.prisma.customerList.create({
          data: {
            merchantId,
            name: def.name,
            description: def.description,
            color: def.color,
            icon: def.icon,
            isSystem: true,
            systemType: def.systemType,
          },
        });
      } else {
        // Update name/desc in case we changed it
        await this.prisma.customerList.update({
          where: { id: list.id },
          data: { name: def.name, description: def.description, color: def.color, icon: def.icon },
        });
      }

      // Clear old items and re-populate
      await this.prisma.customerListItem.deleteMany({ where: { listId: list.id } });

      // Add matching customers (up to 1000)
      const toAdd = matchingCustomers.slice(0, 1000);
      for (const customer of toAdd) {
        await this.prisma.customerListItem.create({
          data: {
            listId: list.id,
            shopifyCustomerId: customer.id,
          },
        });
      }

      results.push({
        systemType: def.systemType,
        name: def.name,
        count: toAdd.length,
        priority: def.priority,
        color: def.color,
        icon: def.icon,
      });
    }

    // Clean up empty system lists
    const systemLists = await this.prisma.customerList.findMany({
      where: { merchantId, isSystem: true },
      include: { _count: { select: { items: true } } },
    });

    for (const sl of systemLists) {
      if ((sl as any)._count.items === 0) {
        await this.prisma.customerList.delete({ where: { id: sl.id } });
      }
    }

    return {
      generated: results.length,
      alarms: results.sort((a, b) => a.priority - b.priority),
    };
  }

  // ===================================================
  // GET ALL LISTS (System + Custom)
  // ===================================================
  async findAllLists(merchantId: string) {
    const lists = await this.prisma.customerList.findMany({
      where: { merchantId },
      include: {
        _count: { select: { items: true } },
      },
      orderBy: [{ isSystem: 'desc' }, { createdAt: 'desc' }],
    });

    return lists.map(l => ({
      ...l,
      customerCount: (l as any)._count.items,
    }));
  }

  // ===================================================
  // GET LIST WITH CUSTOMERS
  // ===================================================
  async getListWithCustomers(listId: string, merchantId: string) {
    const list = await this.prisma.customerList.findFirst({
      where: { id: listId, merchantId },
      include: {
        items: {
          include: {
            shopifyCustomer: {
              include: { insight: true },
            },
          },
          orderBy: { addedAt: 'desc' },
          take: 1000,
        },
        _count: { select: { items: true } },
      },
    });

    if (!list) throw new NotFoundException('List not found');

    return {
      ...list,
      customerCount: (list as any)._count.items,
      items: list.items.map(item => ({
        ...item,
        shopifyCustomer: {
          ...item.shopifyCustomer,
          shopifyCustomerId: item.shopifyCustomer.shopifyCustomerId.toString(),
          lastOrderId: (item.shopifyCustomer as any).lastOrderId?.toString() || null,
          insight: item.shopifyCustomer.insight ? {
            ...item.shopifyCustomer.insight,
            clvScore: item.shopifyCustomer.insight.clvScore ? Number(item.shopifyCustomer.insight.clvScore) : null,
            projectedClv: item.shopifyCustomer.insight.projectedClv ? Number(item.shopifyCustomer.insight.projectedClv) : null,
            avgOrderValue: item.shopifyCustomer.insight.avgOrderValue ? Number(item.shopifyCustomer.insight.avgOrderValue) : null,
            maxOrderValue: item.shopifyCustomer.insight.maxOrderValue ? Number(item.shopifyCustomer.insight.maxOrderValue) : null,
          } : null,
        },
      })),
    };
  }

  // ===================================================
  // CREATE CUSTOM LIST
  // ===================================================
  async createList(merchantId: string, data: { name: string; description?: string; color?: string; icon?: string }) {
    return this.prisma.customerList.create({
      data: {
        merchantId,
        name: data.name,
        description: data.description,
        color: data.color || '#3b82f6',
        icon: data.icon || 'list',
        isSystem: false,
      },
    });
  }

  // ===================================================
  // UPDATE LIST
  // ===================================================
  async updateList(listId: string, merchantId: string, data: { name?: string; description?: string; color?: string; icon?: string }) {
    const list = await this.prisma.customerList.findFirst({
      where: { id: listId, merchantId, isSystem: false },
    });
    if (!list) throw new NotFoundException('List not found or is a system list');

    return this.prisma.customerList.update({
      where: { id: listId },
      data,
    });
  }

  // ===================================================
  // DELETE LIST
  // ===================================================
  async deleteList(listId: string, merchantId: string) {
    const list = await this.prisma.customerList.findFirst({
      where: { id: listId, merchantId, isSystem: false },
    });
    if (!list) throw new NotFoundException('List not found or is a system list');

    await this.prisma.customerList.delete({ where: { id: listId } });
    return { deleted: true };
  }

  // ===================================================
  // ADD CUSTOMERS TO LIST (batch add up to 1000)
  // ===================================================
  async addCustomersToList(listId: string, merchantId: string, customerIds: string[], notes?: string) {
    const list = await this.prisma.customerList.findFirst({
      where: { id: listId, merchantId },
    });
    if (!list) throw new NotFoundException('List not found');

    // Limit to 1000
    const ids = customerIds.slice(0, 1000);
    let added = 0;

    for (const customerId of ids) {
      try {
        await this.prisma.customerListItem.create({
          data: {
            listId,
            shopifyCustomerId: customerId,
            notes,
          },
        });
        added++;
      } catch {
        // Skip duplicates (unique constraint)
      }
    }

    return { added, listId };
  }

  // ===================================================
  // REMOVE CUSTOMERS FROM LIST
  // ===================================================
  async removeCustomersFromList(listId: string, merchantId: string, customerIds: string[]) {
    const list = await this.prisma.customerList.findFirst({
      where: { id: listId, merchantId },
    });
    if (!list) throw new NotFoundException('List not found');

    const result = await this.prisma.customerListItem.deleteMany({
      where: {
        listId,
        shopifyCustomerId: { in: customerIds },
      },
    });

    return { removed: result.count };
  }

  // ===================================================
  // UPDATE ITEM NOTE
  // ===================================================
  async updateItemNote(itemId: string, notes: string) {
    return this.prisma.customerListItem.update({
      where: { id: itemId },
      data: { notes },
    });
  }

  // ===================================================
  // GET SMART ALARM SUMMARY (for dashboard)
  // ===================================================
  async getAlarmSummary(merchantId: string) {
    const systemLists = await this.prisma.customerList.findMany({
      where: { merchantId, isSystem: true },
      include: {
        _count: { select: { items: true } },
        items: {
          take: 5,
          include: {
            shopifyCustomer: {
              include: { insight: true },
            },
          },
          orderBy: { addedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return systemLists.map(list => ({
      id: list.id,
      systemType: list.systemType,
      name: list.name,
      description: list.description,
      color: list.color,
      icon: list.icon,
      customerCount: (list as any)._count.items,
      preview: list.items.map(item => ({
        id: item.shopifyCustomer.id,
        name: `${item.shopifyCustomer.firstName || ''} ${item.shopifyCustomer.lastName || ''}`.trim(),
        email: item.shopifyCustomer.email,
        totalSpent: Number(item.shopifyCustomer.totalSpent || 0),
        ordersCount: item.shopifyCustomer.ordersCount,
        daysSinceLastOrder: item.shopifyCustomer.insight?.daysSinceLastOrder,
        churnRisk: item.shopifyCustomer.insight?.churnRisk,
      })),
    }));
  }
}
