import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Automatically refreshes Shopify access tokens using Client Credentials Grant.
 *
 * Partner Custom App tokens obtained via client_credentials grant expire every 24 hours.
 * This service runs every 12 hours to refresh the token well before expiration,
 * and also refreshes on application startup.
 */
@Injectable()
export class ShopifyTokenRefreshService implements OnModuleInit {
  private readonly logger = new Logger(ShopifyTokenRefreshService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {}

  /**
   * Refresh token immediately on startup
   */
  async onModuleInit() {
    // Small delay to ensure DB is connected
    setTimeout(() => this.handleTokenRefresh(), 5000);
  }

  /**
   * Refresh token every 12 hours (token expires in 24h, so 12h gives plenty of buffer)
   */
  @Cron('0 */12 * * *')
  async handleTokenRefresh() {
    this.logger.log('Starting scheduled Shopify token refresh...');

    const merchants = await this.prisma.merchant.findMany({
      where: { status: 'active' },
    });

    for (const merchant of merchants) {
      try {
        await this.refreshTokenForMerchant(merchant);
      } catch (error) {
        this.logger.error(
          `Failed to refresh token for ${merchant.shopDomain}: ${error.message}`,
        );
      }
    }
  }

  /**
   * Refresh token for a specific merchant using Client Credentials Grant.
   * Can also be called manually from controllers.
   */
  async refreshTokenForMerchant(merchant: { id: string; shopDomain: string }) {
    const clientId = this.config.get<string>('SHOPIFY_API_KEY');
    const clientSecret = this.config.get<string>('SHOPIFY_API_SECRET');

    if (!clientId || !clientSecret) {
      this.logger.warn('SHOPIFY_API_KEY or SHOPIFY_API_SECRET not set — skipping token refresh');
      return null;
    }

    const url = `https://${merchant.shopDomain}/admin/oauth/access_token`;

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, {
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'client_credentials',
        }),
      );

      const { access_token, expires_in } = response.data;

      if (!access_token) {
        throw new Error('No access_token in response');
      }

      // Update merchant record in DB
      await this.prisma.merchant.update({
        where: { id: merchant.id },
        data: { accessToken: access_token },
      });

      const expiresInHours = Math.round(expires_in / 3600);
      this.logger.log(
        `🔑 Token refreshed for ${merchant.shopDomain} (expires in ${expiresInHours}h)`,
      );

      return access_token;
    } catch (error) {
      const status = error?.response?.status;
      const message = error?.response?.data || error.message;
      this.logger.error(
        `Token refresh failed for ${merchant.shopDomain} [${status}]: ${JSON.stringify(message)}`,
      );
      throw error;
    }
  }
}
