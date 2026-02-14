"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ShopifySsoService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopifySsoService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto = __importStar(require("crypto"));
const prisma_service_1 = require("../prisma/prisma.service");
let ShopifySsoService = ShopifySsoService_1 = class ShopifySsoService {
    configService;
    prisma;
    logger = new common_1.Logger(ShopifySsoService_1.name);
    apiVersion;
    constructor(configService, prisma) {
        this.configService = configService;
        this.prisma = prisma;
        this.apiVersion = this.configService.get('SHOPIFY_API_VERSION', '2024-10');
    }
    generateMultipassToken(multipassSecret, customerData) {
        if (!multipassSecret) {
            throw new Error('Multipass secret is required');
        }
        try {
            const multipassData = {
                email: customerData.email,
                created_at: new Date().toISOString(),
                first_name: customerData.firstName || '',
                last_name: customerData.lastName || '',
                identifier: customerData.customerId || customerData.email,
                return_to: customerData.returnTo || '/',
            };
            const jsonData = JSON.stringify(multipassData);
            const encryptionKey = crypto
                .createHash('sha256')
                .update(multipassSecret)
                .digest()
                .slice(0, 32);
            const signingKey = crypto
                .createHash('sha256')
                .update(multipassSecret)
                .digest();
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
            let encrypted = cipher.update(jsonData, 'utf8', 'binary');
            encrypted += cipher.final('binary');
            const ciphertext = Buffer.concat([
                iv,
                Buffer.from(encrypted, 'binary'),
            ]);
            const hmac = crypto.createHmac('sha256', signingKey);
            hmac.update(ciphertext);
            const signature = hmac.digest();
            const token = Buffer.concat([ciphertext, signature]).toString('base64');
            return encodeURIComponent(token);
        }
        catch (error) {
            this.logger.error('Multipass token generation failed', error);
            throw error;
        }
    }
    generateSsoUrl(shopDomain, multipassSecret, customerData) {
        const token = this.generateMultipassToken(multipassSecret, customerData);
        return `https://${shopDomain}/account/login/multipass/${token}`;
    }
    async verifyShopifySession(shopDomain, accessToken, shopifyCustomerId) {
        try {
            const response = await fetch(`https://${shopDomain}/admin/api/${this.apiVersion}/customers/${shopifyCustomerId}.json`, {
                headers: {
                    'X-Shopify-Access-Token': accessToken,
                },
            });
            return response.ok;
        }
        catch (error) {
            this.logger.error('Shopify session verification failed', error);
            return false;
        }
    }
};
exports.ShopifySsoService = ShopifySsoService;
exports.ShopifySsoService = ShopifySsoService = ShopifySsoService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], ShopifySsoService);
//# sourceMappingURL=shopify-sso.service.js.map