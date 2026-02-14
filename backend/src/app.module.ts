import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';
import { AbandonedCartsModule } from './abandoned-carts/abandoned-carts.module';
import { AddressesModule } from './addresses/addresses.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { CartsModule } from './carts/carts.module';
import { CatalogModule } from './catalog/catalog.module';
import { CheckoutModule } from './checkout/checkout.module';
import { CommonModule } from './common/common.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { CompaniesModule } from './companies/companies.module';
import { DittofeedModule } from './dittofeed/dittofeed.module';
import { EventsModule } from './events/events.module';
import { FingerprintModule } from './fingerprint/fingerprint.module';
import { InvoiceModule } from './invoices/invoices.module';
import { MailModule } from './mail/mail.module';
import { MerchantsModule } from './merchants/merchants.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OrdersModule } from './orders/orders.module';
import { PickupModule } from './pickup/pickup.module';
import { PricingModule } from './pricing/pricing.module';
import { PrismaModule } from './prisma/prisma.module';
import { QuotesModule } from './quotes/quotes.module';
import { RedisModule } from './redis/redis.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { SettingsModule } from './settings/settings.module';
import { ShopifyCustomersModule } from './shopify-customers/shopify-customers.module';
import { ShopifyModule } from './shopify/shopify.module';
import { SupportTicketsModule } from './support-tickets/support-tickets.module';
import { SyncModule } from './sync/sync.module';
import { UploadsModule } from './uploads/uploads.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { WishlistModule } from './wishlist/wishlist.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Rate limiting: 100 requests per 60 seconds (global default)
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 10, // 10 requests per second
      },
      {
        name: 'medium',
        ttl: 10000, // 10 seconds
        limit: 50, // 50 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests per minute
      },
    ]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    RedisModule,
    CommonModule,
    AuthModule,
    ShopifyModule,
    SyncModule,
    PricingModule,
    CartsModule,
    EventsModule,
    WebhooksModule,
    CompaniesModule,
    CatalogModule,
    OrdersModule,
    CheckoutModule,
    MerchantsModule,
    MailModule,
    SchedulerModule,
    ShopifyCustomersModule,
    AnalyticsModule,
    QuotesModule,
    NotificationsModule,
    SettingsModule,
    UploadsModule,
    AbandonedCartsModule,
    SupportTicketsModule,
    WishlistModule,
    AddressesModule,
    FingerprintModule,
    DittofeedModule,
    InvoiceModule,
    PickupModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
