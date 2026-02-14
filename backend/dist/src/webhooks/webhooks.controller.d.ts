import { OrdersHandler } from './handlers/orders.handler';
import { CustomersHandler } from './handlers/customers.handler';
import type { ShopifyOrderPayload, ShopifyCustomerPayload, ShopifyWebhookHeaders } from './types/shopify-webhook.types';
export declare class WebhooksController {
    private ordersHandler;
    private customersHandler;
    constructor(ordersHandler: OrdersHandler, customersHandler: CustomersHandler);
    orderCreate(body: ShopifyOrderPayload, headers: ShopifyWebhookHeaders): Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
    }>;
    orderPaid(body: ShopifyOrderPayload, headers: ShopifyWebhookHeaders): Promise<{
        success: boolean;
    }>;
    customerCreate(body: ShopifyCustomerPayload, headers: ShopifyWebhookHeaders): Promise<{
        success: boolean;
    }>;
}
