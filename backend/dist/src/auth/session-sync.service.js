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
var SessionSyncService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionSyncService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const shopify_service_1 = require("../shopify/shopify.service");
let SessionSyncService = SessionSyncService_1 = class SessionSyncService {
    prisma;
    shopify;
    jwtService;
    logger = new common_1.Logger(SessionSyncService_1.name);
    constructor(prisma, shopify, jwtService) {
        this.prisma = prisma;
        this.shopify = shopify;
        this.jwtService = jwtService;
    }
    async syncFromShopify(shopifyCustomerId, email, fingerprint) {
        try {
            let user = await this.prisma.companyUser.findFirst({
                where: {
                    OR: [
                        { shopifyCustomerId: BigInt(shopifyCustomerId) },
                        { email },
                    ],
                },
                include: { company: true },
            });
            if (!user) {
                const prospectCompany = await this.getOrCreateProspectCompany(email);
                user = await this.prisma.companyUser.create({
                    data: {
                        email,
                        shopifyCustomerId: BigInt(shopifyCustomerId),
                        firstName: '',
                        lastName: '',
                        role: 'buyer',
                        isActive: true,
                        companyId: prospectCompany.id,
                    },
                    include: { company: true },
                });
            }
            if (!user.shopifyCustomerId) {
                user = await this.prisma.companyUser.update({
                    where: { id: user.id },
                    data: { shopifyCustomerId: BigInt(shopifyCustomerId) },
                    include: { company: true },
                });
            }
            const token = this.jwtService.sign({
                sub: user.id,
                email: user.email,
                type: 'shopify_sync',
            });
            this.logger.log(`Shopify customer ${shopifyCustomerId} synced to Eagle user ${user.id}`);
            return {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    companyId: user.companyId,
                },
            };
        }
        catch (error) {
            this.logger.error('Shopify sync error:', error);
            throw error;
        }
    }
    async resolveContext(userId) {
        const user = await this.prisma.companyUser.findUnique({
            where: { id: userId },
            include: {
                company: {
                    include: {
                        pricingRules: true,
                    },
                },
            },
        });
        if (!user) {
            throw new Error('User not found');
        }
        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
            },
            company: {
                id: user.company.id,
                name: user.company.name,
                status: user.company.status,
            },
            pricing: user.company.pricingRules || [],
            shopifyCustomerId: user.shopifyCustomerId?.toString(),
        };
    }
    async getOrCreateProspectCompany(email, merchantId) {
        const domain = email.split('@')[1];
        let company = await this.prisma.company.findFirst({
            where: {
                email: { contains: domain },
                ...(merchantId ? { merchantId } : {}),
            },
        });
        if (!company) {
            if (!merchantId) {
                const merchant = await this.prisma.merchant.findFirst();
                if (!merchant) {
                    throw new Error('No merchant found to create prospect company');
                }
                merchantId = merchant.id;
            }
            company = await this.prisma.company.create({
                data: {
                    merchantId,
                    name: `Prospect - ${domain}`,
                    email,
                    status: 'prospect',
                },
            });
        }
        return company;
    }
};
exports.SessionSyncService = SessionSyncService;
exports.SessionSyncService = SessionSyncService = SessionSyncService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        shopify_service_1.ShopifyService,
        jwt_1.JwtService])
], SessionSyncService);
//# sourceMappingURL=session-sync.service.js.map