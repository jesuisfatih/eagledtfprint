import { Controller, Post, Body, Headers, HttpCode, UseGuards } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { WebhookAuthGuard } from '../common/guards/webhook-auth.guard';
import { OrdersHandler } from './handlers/orders.handler';
import { CustomersHandler } from './handlers/customers.handler';
import type { ShopifyOrderPayload, ShopifyCustomerPayload, ShopifyWebhookHeaders } from './types/shopify-webhook.types';

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private ordersHandler: OrdersHandler,
    private customersHandler: CustomersHandler,
  ) {}

  @Public()
  @UseGuards(WebhookAuthGuard)
  @Post('orders/create')
  @HttpCode(200)
  async orderCreate(
    @Body() body: ShopifyOrderPayload,
    @Headers() headers: ShopifyWebhookHeaders,
  ) {
    return this.ordersHandler.handleOrderCreate(body, headers);
  }

  @Public()
  @UseGuards(WebhookAuthGuard)
  @Post('orders/paid')
  @HttpCode(200)
  async orderPaid(
    @Body() body: ShopifyOrderPayload,
    @Headers() headers: ShopifyWebhookHeaders,
  ) {
    return this.ordersHandler.handleOrderPaid(body, headers);
  }

  @Public()
  @UseGuards(WebhookAuthGuard)
  @Post('customers/create')
  @HttpCode(200)
  async customerCreate(
    @Body() body: ShopifyCustomerPayload,
    @Headers() headers: ShopifyWebhookHeaders,
  ) {
    return this.customersHandler.handleCustomerCreate(body, headers);
  }
}

