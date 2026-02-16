import { CustomerListsService } from './customer-lists.service';
export declare class CustomerListsController {
    private readonly listsService;
    constructor(listsService: CustomerListsService);
    findAll(merchantId: string): Promise<{
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
    generateAlarms(merchantId: string): Promise<{
        generated: number;
        alarms: any[];
    }>;
    createList(merchantId: string, body: {
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
    getList(merchantId: string, id: string): Promise<{
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
    updateList(merchantId: string, id: string, body: {
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
    deleteList(merchantId: string, id: string): Promise<{
        deleted: boolean;
    }>;
    addCustomers(merchantId: string, id: string, body: {
        customerIds: string[];
        notes?: string;
    }): Promise<{
        added: number;
        listId: string;
    }>;
    removeCustomers(merchantId: string, id: string, body: {
        customerIds: string[];
    }): Promise<{
        removed: number;
    }>;
    updateItemNote(itemId: string, notes: string): Promise<{
        id: string;
        shopifyCustomerId: string;
        notes: string | null;
        listId: string;
        addedAt: Date;
    }>;
}
