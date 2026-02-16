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
var PrismaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("@prisma/client");
const pg_1 = require("pg");
let PrismaService = PrismaService_1 = class PrismaService {
    config;
    logger = new common_1.Logger(PrismaService_1.name);
    prisma;
    pool;
    constructor(config) {
        this.config = config;
        const dbUrl = this.config.get('DATABASE_URL') || process.env.DATABASE_URL;
        this.pool = new pg_1.Pool({ connectionString: dbUrl });
        const adapter = new adapter_pg_1.PrismaPg(this.pool);
        this.prisma = new client_1.PrismaClient({ adapter });
    }
    async $connect() {
        return this.prisma.$connect();
    }
    async $disconnect() {
        return this.prisma.$disconnect();
    }
    $queryRaw(query, ...values) {
        return this.prisma.$queryRaw(query, ...values);
    }
    $executeRaw(query, ...values) {
        return this.prisma.$executeRaw(query, ...values);
    }
    $queryRawUnsafe(query, ...values) {
        return this.prisma.$queryRawUnsafe(query, ...values);
    }
    $transaction(fn) {
        return this.prisma.$transaction(fn);
    }
    get merchant() {
        return this.prisma.merchant;
    }
    get shopifyCustomer() {
        return this.prisma.shopifyCustomer;
    }
    get company() {
        return this.prisma.company;
    }
    get companyUser() {
        return this.prisma.companyUser;
    }
    get catalogProduct() {
        return this.prisma.catalogProduct;
    }
    get catalogVariant() {
        return this.prisma.catalogVariant;
    }
    get pricingRule() {
        return this.prisma.pricingRule;
    }
    get cart() {
        return this.prisma.cart;
    }
    get cartItem() {
        return this.prisma.cartItem;
    }
    get orderLocal() {
        return this.prisma.orderLocal;
    }
    get activityLog() {
        return this.prisma.activityLog;
    }
    get discountCode() {
        return this.prisma.discountCode;
    }
    get syncLog() {
        return this.prisma.syncLog;
    }
    get syncState() {
        return this.prisma.syncState;
    }
    get wishlist() {
        return this.prisma.wishlist;
    }
    get wishlistItem() {
        return this.prisma.wishlistItem;
    }
    get address() {
        return this.prisma.address;
    }
    get supportTicket() {
        return this.prisma.supportTicket;
    }
    get ticketResponse() {
        return this.prisma.ticketResponse;
    }
    get visitorFingerprint() {
        return this.prisma.visitorFingerprint;
    }
    get visitorIdentity() {
        return this.prisma.visitorIdentity;
    }
    get visitorSession() {
        return this.prisma.visitorSession;
    }
    get visitorEvent() {
        return this.prisma.visitorEvent;
    }
    get companyIntelligence() {
        return this.prisma.companyIntelligence;
    }
    get trafficAttribution() {
        return this.prisma.trafficAttribution;
    }
    get invoice() {
        return this.prisma.invoice;
    }
    get quote() {
        return this.prisma.quote;
    }
    get pickupShelf() {
        return this.prisma.pickupShelf;
    }
    get pickupOrder() {
        return this.prisma.pickupOrder;
    }
    get customerInsight() {
        return this.prisma.customerInsight;
    }
    get proactiveOffer() {
        return this.prisma.proactiveOffer;
    }
    get customerList() {
        return this.prisma.customerList;
    }
    get customerListItem() {
        return this.prisma.customerListItem;
    }
    get designProject() {
        return this.prisma.designProject;
    }
    get marketingSync() {
        return this.prisma.marketingSync;
    }
    get productionJob() {
        return this.prisma.productionJob;
    }
    get printer() {
        return this.prisma.printer;
    }
    get gangSheetBatch() {
        return this.prisma.gangSheetBatch;
    }
    async onModuleInit() {
        try {
            await this.$connect();
            this.logger.log('✅ Database connected successfully');
            const envToken = this.config.get('SHOPIFY_ACCESS_TOKEN');
            const envDomain = this.config.get('SHOPIFY_STORE_DOMAIN');
            const isPlaceholder = !envToken || ['PLACEHOLDER', 'temp', 'YOUR_TOKEN_HERE'].includes(envToken);
            const existingMerchant = await this.prisma.merchant.findFirst();
            if (!existingMerchant && envDomain) {
                try {
                    const tokenToUse = isPlaceholder ? 'awaiting-oauth' : envToken;
                    await this.prisma.merchant.create({
                        data: {
                            shopDomain: envDomain,
                            accessToken: tokenToUse,
                            scope: this.config.get('SHOPIFY_SCOPES', ''),
                            status: 'active',
                            settings: {},
                        },
                    });
                    this.logger.log(`🏪 Auto-seeded merchant for ${envDomain} (token: ${isPlaceholder ? 'awaiting OAuth' : 'from env'})`);
                }
                catch (seedErr) {
                    this.logger.warn('⚠️ Could not auto-seed merchant', seedErr);
                }
            }
            else if (existingMerchant && !isPlaceholder && envDomain) {
                try {
                    const merchant = await this.prisma.merchant.findFirst({
                        where: { shopDomain: envDomain },
                    });
                    if (merchant && merchant.accessToken !== envToken) {
                        await this.prisma.merchant.update({
                            where: { id: merchant.id },
                            data: { accessToken: envToken },
                        });
                        await this.prisma.syncState.updateMany({
                            where: { merchantId: merchant.id },
                            data: { consecutiveFailures: 0, lastError: null, status: 'idle' },
                        });
                        this.logger.log(`🔑 Merchant access token synced from env for ${envDomain}`);
                    }
                }
                catch (tokenErr) {
                    this.logger.warn('⚠️ Could not sync merchant token from env', tokenErr);
                }
            }
            else if (isPlaceholder && existingMerchant) {
                this.logger.log('ℹ️ Skipping env token sync — env token is placeholder, using DB token');
            }
        }
        catch (error) {
            this.logger.error('❌ Failed to connect to database', error);
            throw error;
        }
    }
    async onModuleDestroy() {
        await this.$disconnect();
        this.logger.log('Database disconnected');
    }
    async cleanDatabase() {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Cannot clean database in production');
        }
        const models = Object.keys(this)
            .filter((key) => !key.startsWith('_') && !key.startsWith('$'))
            .filter((key) => typeof this[key] === 'object');
        return Promise.all(models.map((modelKey) => this[modelKey].deleteMany()));
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = PrismaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], PrismaService);
//# sourceMappingURL=prisma.service.js.map