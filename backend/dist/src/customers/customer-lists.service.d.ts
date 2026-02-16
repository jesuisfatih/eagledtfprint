import { PrismaService } from '../prisma/prisma.service';
export declare class CustomerListsService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    private getAlarmDefinitions;
    generateSmartAlarms(merchantId: string): Promise<{
        generated: number;
        alarms: any[];
    }>;
    findAllLists(merchantId: string): Promise<{
        customerCount: any;
        _count: {
            items: number;
        };
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        description: string | null;
        color: string | null;
        icon: string | null;
        isSystem: boolean;
        systemType: string | null;
    }[]>;
    getListWithCustomers(listId: string, merchantId: string): Promise<{
        customerCount: any;
        items: {
            shopifyCustomer: {
                shopifyCustomerId: string;
                lastOrderId: any;
                insight: {
                    clvScore: number | null;
                    projectedClv: number | null;
                    avgOrderValue: number | null;
                    maxOrderValue: number | null;
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    shopifyCustomerId: string;
                    lastOrderAt: Date | null;
                    firstOrderAt: Date | null;
                    daysSinceLastOrder: number | null;
                    churnRisk: string | null;
                    clvTier: string | null;
                    rfmRecency: number | null;
                    rfmFrequency: number | null;
                    rfmMonetary: number | null;
                    rfmSegment: string | null;
                    healthScore: number | null;
                    avgDaysBetweenOrders: number | null;
                    purchaseFrequency: string | null;
                    preferredCategories: import("@prisma/client/runtime/client").JsonValue | null;
                    preferredVendors: import("@prisma/client/runtime/client").JsonValue | null;
                    orderTrend: string | null;
                    customerSince: Date | null;
                    isReturning: boolean;
                    deepMetrics: import("@prisma/client/runtime/client").JsonValue | null;
                    calculatedAt: Date;
                } | null;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                merchantId: string;
                email: string | null;
                firstName: string | null;
                lastName: string | null;
                phone: string | null;
                addresses: import("@prisma/client/runtime/client").JsonValue | null;
                tags: string | null;
                note: string | null;
                totalSpent: import("@prisma/client-runtime-utils").Decimal | null;
                ordersCount: number;
                rawData: import("@prisma/client/runtime/client").JsonValue | null;
                verifiedEmail: boolean | null;
                acceptsMarketing: boolean | null;
                marketingOptInLevel: string | null;
                taxExempt: boolean | null;
                state: string | null;
                currency: string | null;
                locale: string | null;
                lastOrderAt: Date | null;
                averageOrderValue: import("@prisma/client-runtime-utils").Decimal | null;
                metafields: import("@prisma/client/runtime/client").JsonValue | null;
                syncedAt: Date;
            };
            id: string;
            shopifyCustomerId: string;
            notes: string | null;
            listId: string;
            addedAt: Date;
        }[];
        _count: {
            items: number;
        };
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        description: string | null;
        color: string | null;
        icon: string | null;
        isSystem: boolean;
        systemType: string | null;
    }>;
    createList(merchantId: string, data: {
        name: string;
        description?: string;
        color?: string;
        icon?: string;
    }): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        description: string | null;
        color: string | null;
        icon: string | null;
        isSystem: boolean;
        systemType: string | null;
    }>;
    updateList(listId: string, merchantId: string, data: {
        name?: string;
        description?: string;
        color?: string;
        icon?: string;
    }): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        description: string | null;
        color: string | null;
        icon: string | null;
        isSystem: boolean;
        systemType: string | null;
    }>;
    deleteList(listId: string, merchantId: string): Promise<{
        deleted: boolean;
    }>;
    addCustomersToList(listId: string, merchantId: string, customerIds: string[], notes?: string): Promise<{
        added: number;
        listId: string;
    }>;
    removeCustomersFromList(listId: string, merchantId: string, customerIds: string[]): Promise<{
        removed: number;
    }>;
    updateItemNote(itemId: string, notes: string): Promise<{
        id: string;
        shopifyCustomerId: string;
        notes: string | null;
        listId: string;
        addedAt: Date;
    }>;
    getAlarmSummary(merchantId: string): Promise<{
        id: string;
        systemType: string | null;
        name: string;
        description: string | null;
        color: string | null;
        icon: string | null;
        customerCount: any;
        preview: {
            id: string;
            name: string;
            email: string | null;
            totalSpent: number;
            ordersCount: number;
            daysSinceLastOrder: number | null | undefined;
            churnRisk: string | null | undefined;
        }[];
    }[]>;
}
