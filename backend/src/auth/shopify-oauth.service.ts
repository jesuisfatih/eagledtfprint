import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

interface ShopifyCallbackParams {
  shop: string;
  code: string;
  hmac: string;
  timestamp: string;
  state: string;
  [key: string]: string; // Allow additional params like 'host'
}

@Injectable()
export class ShopifyOauthService {
  private readonly logger = new Logger(ShopifyOauthService.name);
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly scopes: string;
  private readonly apiVersion: string;
  private readonly redirectUri: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {
    this.apiKey = this.config.get<string>('SHOPIFY_API_KEY') || '';
    this.apiSecret = this.config.get<string>('SHOPIFY_API_SECRET') || '';
    this.scopes = this.config.get<string>('SHOPIFY_SCOPES') || '';
    this.apiVersion = this.config.get<string>('SHOPIFY_API_VERSION', '2024-10');
    this.redirectUri = `${this.config.get<string>('API_URL')}/api/v1/auth/shopify/callback`;
  }

  getInstallUrl(shop: string): string {
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

  verifyHmac(params: ShopifyCallbackParams): boolean {
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

  async getAccessToken(shop: string, code: string): Promise<string> {
    try {
      const response = await axios.post(
        `https://${shop}/admin/oauth/access_token`,
        {
          client_id: this.apiKey,
          client_secret: this.apiSecret,
          code,
        },
      );

      return response.data.access_token;
    } catch (error) {
      this.logger.error('Failed to get access token', error);
      throw new UnauthorizedException('Failed to authenticate with Shopify');
    }
  }

  async getShopDetails(shop: string, accessToken: string) {
    try {
      const response = await axios.get(
        `https://${shop}/admin/api/${this.apiVersion}/shop.json`,
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
          },
        },
      );

      return response.data.shop;
    } catch (error) {
      this.logger.error('Failed to get shop details', error);
      throw new UnauthorizedException('Failed to get shop details');
    }
  }

  async handleCallback(params: ShopifyCallbackParams) {
    // Verify HMAC
    if (!this.verifyHmac(params)) {
      throw new UnauthorizedException('Invalid HMAC signature');
    }

    // Get access token
    const accessToken = await this.getAccessToken(params.shop, params.code);

    // Get shop details
    const shopDetails = await this.getShopDetails(params.shop, accessToken);

    // Create or update merchant
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

    // Generate JWT for merchant
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
}
