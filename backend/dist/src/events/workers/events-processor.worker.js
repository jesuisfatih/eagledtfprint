"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EventsProcessorWorker_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsProcessorWorker = void 0;
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../../prisma/prisma.service");
const shopify_service_1 = require("../../shopify/shopify.service");
let EventsProcessorWorker = EventsProcessorWorker_1 = class EventsProcessorWorker {
    prisma;
    shopifyService;
    jwtService;
    logger = new common_1.Logger(EventsProcessorWorker_1.name);
    constructor(prisma, shopifyService, jwtService) {
        this.prisma = prisma;
        this.shopifyService = shopifyService;
        this.jwtService = jwtService;
    }
    async processEvent(job) {
        const event = job.data;
        try {
            const merchant = await this.shopifyService.getMerchantByShopDomain(event.shop);
            if (!merchant) {
                this.logger.warn(`Merchant not found for shop: ${event.shop}`);
                return;
            }
            let companyId;
            let companyUserId;
            if (event.eagleToken) {
                try {
                    const payload = this.jwtService.verify(event.eagleToken);
                    if (payload && payload.sub) {
                        const user = await this.prisma.companyUser.findUnique({
                            where: { id: payload.sub },
                        });
                        if (user) {
                            companyUserId = user.id;
                            companyId = user.companyId;
                        }
                    }
                }
                catch (jwtError) {
                    this.logger.warn(`Invalid eagleToken in event: ${jwtError.message}`);
                }
            }
            else if (event.shopifyCustomerId) {
                const user = await this.prisma.companyUser.findFirst({
                    where: { shopifyCustomerId: BigInt(event.shopifyCustomerId) },
                });
                if (user) {
                    companyUserId = user.id;
                    companyId = user.companyId;
                }
            }
            let productId;
            let variantId;
            let shopifyProductId;
            let shopifyVariantId;
            if (event.payload?.productId) {
                shopifyProductId = BigInt(event.payload.productId);
                const product = await this.prisma.catalogProduct.findFirst({
                    where: { shopifyProductId },
                });
                if (product) {
                    productId = product.id;
                }
            }
            if (event.payload?.variantId) {
                shopifyVariantId = BigInt(event.payload.variantId);
                const variant = await this.prisma.catalogVariant.findFirst({
                    where: { shopifyVariantId },
                });
                if (variant) {
                    variantId = variant.id;
                    if (!productId) {
                        productId = variant.productId;
                    }
                }
            }
            await this.prisma.activityLog.create({
                data: {
                    merchantId: merchant.id,
                    companyId,
                    companyUserId,
                    shopifyCustomerId: event.shopifyCustomerId ? BigInt(event.shopifyCustomerId) : null,
                    sessionId: event.sessionId,
                    eagleToken: event.eagleToken,
                    eventType: event.eventType,
                    productId,
                    variantId,
                    shopifyProductId,
                    shopifyVariantId,
                    payload: event.payload,
                    ipAddress: event.ipAddress,
                    userAgent: event.userAgent,
                    referrer: event.referrer,
                },
            });
            this.logger.log(`Event processed: ${event.eventType} for shop ${event.shop}`);
        }
        catch (error) {
            this.logger.error('Failed to process event', error);
            throw error;
        }
    }
};
exports.EventsProcessorWorker = EventsProcessorWorker;
__decorate([
    (0, bull_1.Process)('process-event'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EventsProcessorWorker.prototype, "processEvent", null);
exports.EventsProcessorWorker = EventsProcessorWorker = EventsProcessorWorker_1 = __decorate([
    (0, bull_1.Processor)('events-raw-queue'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        shopify_service_1.ShopifyService,
        jwt_1.JwtService])
], EventsProcessorWorker);
//# sourceMappingURL=events-processor.worker.js.map