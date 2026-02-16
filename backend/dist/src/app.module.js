"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const serve_static_1 = require("@nestjs/serve-static");
const throttler_1 = require("@nestjs/throttler");
const path_1 = require("path");
const abandoned_carts_module_1 = require("./abandoned-carts/abandoned-carts.module");
const addresses_module_1 = require("./addresses/addresses.module");
const analytics_module_1 = require("./analytics/analytics.module");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const auth_module_1 = require("./auth/auth.module");
const jwt_auth_guard_1 = require("./auth/guards/jwt-auth.guard");
const carts_module_1 = require("./carts/carts.module");
const catalog_module_1 = require("./catalog/catalog.module");
const checkout_module_1 = require("./checkout/checkout.module");
const common_module_1 = require("./common/common.module");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const companies_module_1 = require("./companies/companies.module");
const dittofeed_module_1 = require("./dittofeed/dittofeed.module");
const event_bus_module_1 = require("./event-bus/event-bus.module");
const events_module_1 = require("./events/events.module");
const fingerprint_module_1 = require("./fingerprint/fingerprint.module");
const invoices_module_1 = require("./invoices/invoices.module");
const mail_module_1 = require("./mail/mail.module");
const merchants_module_1 = require("./merchants/merchants.module");
const multi_store_module_1 = require("./multi-store/multi-store.module");
const notifications_module_1 = require("./notifications/notifications.module");
const orders_module_1 = require("./orders/orders.module");
const penpot_module_1 = require("./penpot/penpot.module");
const pickup_module_1 = require("./pickup/pickup.module");
const pricing_module_1 = require("./pricing/pricing.module");
const prisma_module_1 = require("./prisma/prisma.module");
const production_module_1 = require("./production/production.module");
const quotes_module_1 = require("./quotes/quotes.module");
const redis_module_1 = require("./redis/redis.module");
const scheduler_module_1 = require("./scheduler/scheduler.module");
const settings_module_1 = require("./settings/settings.module");
const shipping_module_1 = require("./shipping/shipping.module");
const shopify_customers_module_1 = require("./shopify-customers/shopify-customers.module");
const shopify_module_1 = require("./shopify/shopify.module");
const support_tickets_module_1 = require("./support-tickets/support-tickets.module");
const sync_module_1 = require("./sync/sync.module");
const uploads_module_1 = require("./uploads/uploads.module");
const webhooks_module_1 = require("./webhooks/webhooks.module");
const wishlist_module_1 = require("./wishlist/wishlist.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: (0, path_1.join)(__dirname, '..', '..', 'uploads'),
                serveRoot: '/uploads',
            }),
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            throttler_1.ThrottlerModule.forRoot([
                {
                    name: 'short',
                    ttl: 1000,
                    limit: 10,
                },
                {
                    name: 'medium',
                    ttl: 10000,
                    limit: 50,
                },
                {
                    name: 'long',
                    ttl: 60000,
                    limit: 100,
                },
            ]),
            bull_1.BullModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (config) => ({
                    redis: {
                        host: config.get('REDIS_HOST', 'localhost'),
                        port: config.get('REDIS_PORT', 6379),
                        password: config.get('REDIS_PASSWORD'),
                    },
                }),
                inject: [config_1.ConfigService],
            }),
            prisma_module_1.PrismaModule,
            redis_module_1.RedisModule,
            common_module_1.CommonModule,
            auth_module_1.AuthModule,
            shopify_module_1.ShopifyModule,
            sync_module_1.SyncModule,
            pricing_module_1.PricingModule,
            carts_module_1.CartsModule,
            events_module_1.EventsModule,
            webhooks_module_1.WebhooksModule,
            companies_module_1.CompaniesModule,
            catalog_module_1.CatalogModule,
            orders_module_1.OrdersModule,
            checkout_module_1.CheckoutModule,
            merchants_module_1.MerchantsModule,
            mail_module_1.MailModule,
            scheduler_module_1.SchedulerModule,
            shopify_customers_module_1.ShopifyCustomersModule,
            analytics_module_1.AnalyticsModule,
            quotes_module_1.QuotesModule,
            notifications_module_1.NotificationsModule,
            settings_module_1.SettingsModule,
            uploads_module_1.UploadsModule,
            abandoned_carts_module_1.AbandonedCartsModule,
            support_tickets_module_1.SupportTicketsModule,
            wishlist_module_1.WishlistModule,
            addresses_module_1.AddressesModule,
            fingerprint_module_1.FingerprintModule,
            dittofeed_module_1.DittofeedModule,
            invoices_module_1.InvoiceModule,
            pickup_module_1.PickupModule,
            penpot_module_1.PenpotModule,
            event_bus_module_1.EventBusModule,
            production_module_1.ProductionModule,
            shipping_module_1.ShippingModule,
            multi_store_module_1.MultiStoreModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            app_service_1.AppService,
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: jwt_auth_guard_1.JwtAuthGuard,
            },
            {
                provide: core_1.APP_FILTER,
                useClass: http_exception_filter_1.AllExceptionsFilter,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map