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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ShopifyOauthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopifyOauthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const axios_1 = __importDefault(require("axios"));
const crypto = __importStar(require("crypto"));
const prisma_service_1 = require("../prisma/prisma.service");
let ShopifyOauthService = ShopifyOauthService_1 = class ShopifyOauthService {
    config;
    prisma;
    jwtService;
    logger = new common_1.Logger(ShopifyOauthService_1.name);
    apiKey;
    apiSecret;
    scopes;
    apiVersion;
    redirectUri;
    constructor(config, prisma, jwtService) {
        this.config = config;
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.apiKey = this.config.get('SHOPIFY_API_KEY') || '';
        this.apiSecret = this.config.get('SHOPIFY_API_SECRET') || '';
        this.scopes = this.config.get('SHOPIFY_SCOPES') || '';
        this.apiVersion = this.config.get('SHOPIFY_API_VERSION', '2024-10');
        this.redirectUri = `${this.config.get('API_URL')}/api/v1/auth/shopify/callback`;
    }
    getInstallUrl(shop) {
        const nonce = crypto.randomBytes(16).toString('hex');
        const shopDomain = shop.endsWith('.myshopify.com') ? shop : `${shop}.myshopify.com`;
        const params = new URLSearchParams({
            client_id: this.apiKey,
            scope: this.scopes,
            redirect_uri: this.redirectUri,
            state: nonce,
        });
        return `https://${shopDomain}/admin/oauth/authorize?${params.toString()}`;
    }
    verifyHmac(params) {
        const { hmac, ...rest } = params;
        const queryString = Object.keys(rest)
            .sort()
            .map((key) => `${key}=${rest[key]}`)
            .join('&');
        const hash = crypto
            .createHmac('sha256', this.apiSecret)
            .update(queryString)
            .digest('hex');
        this.logger.debug(`HMAC verify: computed=${hash}, received=${hmac}, match=${hash === hmac}`);
        return hash === hmac;
    }
    async getAccessToken(shop, code) {
        try {
            const response = await axios_1.default.post(`https://${shop}/admin/oauth/access_token`, {
                client_id: this.apiKey,
                client_secret: this.apiSecret,
                code,
            });
            return response.data.access_token;
        }
        catch (error) {
            this.logger.error('Failed to get access token', error);
            throw new common_1.UnauthorizedException('Failed to authenticate with Shopify');
        }
    }
    async getShopDetails(shop, accessToken) {
        try {
            const response = await axios_1.default.get(`https://${shop}/admin/api/${this.apiVersion}/shop.json`, {
                headers: {
                    'X-Shopify-Access-Token': accessToken,
                },
            });
            return response.data.shop;
        }
        catch (error) {
            this.logger.error('Failed to get shop details', error);
            throw new common_1.UnauthorizedException('Failed to get shop details');
        }
    }
    async handleCallback(params) {
        if (!this.verifyHmac(params)) {
            throw new common_1.UnauthorizedException('Invalid HMAC signature');
        }
        const accessToken = await this.getAccessToken(params.shop, params.code);
        const shopDetails = await this.getShopDetails(params.shop, accessToken);
        const merchant = await this.prisma.merchant.upsert({
            where: { shopDomain: params.shop },
            create: {
                shopDomain: params.shop,
                shopifyShopId: BigInt(shopDetails.id),
                accessToken,
                scope: this.scopes,
                status: 'active',
            },
            update: {
                accessToken,
                scope: this.scopes,
                shopifyShopId: BigInt(shopDetails.id),
                status: 'active',
            },
        });
        this.logger.log(`Merchant ${merchant.shopDomain} authenticated successfully`);
        const jwtPayload = {
            sub: merchant.id,
            merchantId: merchant.id,
            shopDomain: merchant.shopDomain,
            type: 'merchant',
        };
        const jwtToken = this.jwtService.sign(jwtPayload);
        return {
            merchant,
            accessToken: jwtToken,
        };
    }
};
exports.ShopifyOauthService = ShopifyOauthService;
exports.ShopifyOauthService = ShopifyOauthService = ShopifyOauthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        jwt_1.JwtService])
], ShopifyOauthService);
//# sourceMappingURL=shopify-oauth.service.js.map