import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ShopifyAdminDiscountService } from './shopify-admin-discount.service';
import { ShopifyCustomerSyncService } from './shopify-customer-sync.service';
import { ShopifyGraphqlService } from './shopify-graphql.service';
import { ShopifyRestService } from './shopify-rest.service';
import { ShopifySsoService } from './shopify-sso.service';
import { ShopifyStorefrontService } from './shopify-storefront.service';
import { ShopifyTokenRefreshService } from './shopify-token-refresh.service';
import { ShopifyService } from './shopify.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [
    ShopifyGraphqlService,
    ShopifyCustomerSyncService,
    ShopifySsoService,
    ShopifyService,
    ShopifyRestService,
    ShopifyAdminDiscountService,
    ShopifyStorefrontService,
    ShopifyTokenRefreshService,
    PrismaService,
  ],
  exports: [
    ShopifyGraphqlService,
    ShopifyCustomerSyncService,
    ShopifySsoService,
    ShopifyService,
    ShopifyRestService,
    ShopifyAdminDiscountService,
    ShopifyStorefrontService,
    ShopifyTokenRefreshService,
  ],
})
export class ShopifyModule {}
