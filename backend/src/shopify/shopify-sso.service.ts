import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShopifySsoService {
  private readonly logger = new Logger(ShopifySsoService.name);
  private readonly apiVersion: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.apiVersion = this.configService.get<string>('SHOPIFY_API_VERSION', '2024-10');
  }

  /**
   * Generate Shopify Multipass token for SSO
   * User logs in Eagle → Automatically logged in Shopify
   * @param multipassSecret - The merchant's multipass secret from Shopify Admin
   */
  generateMultipassToken(
    multipassSecret: string,
    customerData: {
      email: string;
      firstName?: string;
      lastName?: string;
      customerId?: string;
      returnTo?: string;
    },
  ): string {
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

      // Step 1: JSON encode
      const jsonData = JSON.stringify(multipassData);

      // Step 2: Encrypt with AES-256-CBC
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

      // Step 3: Add signature (HMAC-SHA256)
      const ciphertext = Buffer.concat([
        iv,
        Buffer.from(encrypted, 'binary'),
      ]);

      const hmac = crypto.createHmac('sha256', signingKey);
      hmac.update(ciphertext);
      const signature = hmac.digest();

      // Step 4: Combine and encode
      const token = Buffer.concat([ciphertext, signature]).toString('base64');

      // Step 5: URL encode
      return encodeURIComponent(token);
    } catch (error) {
      this.logger.error('Multipass token generation failed', error);
      throw error;
    }
  }

  /**
   * Generate Shopify SSO URL for a specific merchant
   * @param shopDomain - The merchant's Shopify store domain
   * @param multipassSecret - The merchant's multipass secret
   */
  generateSsoUrl(
    shopDomain: string,
    multipassSecret: string,
    customerData: {
      email: string;
      firstName?: string;
      lastName?: string;
      customerId?: string;
      returnTo?: string;
    },
  ): string {
    const token = this.generateMultipassToken(multipassSecret, customerData);
    return `https://${shopDomain}/account/login/multipass/${token}`;
  }

  /**
   * Verify Shopify customer is logged in
   * Check if customer has valid Shopify session
   * @param shopDomain - The merchant's Shopify store domain
   * @param accessToken - The merchant's Shopify access token
   */
  async verifyShopifySession(
    shopDomain: string,
    accessToken: string,
    shopifyCustomerId: string,
  ): Promise<boolean> {
    try {
      // Check if customer exists in Shopify
      const response = await fetch(
        `https://${shopDomain}/admin/api/${this.apiVersion}/customers/${shopifyCustomerId}.json`,
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
          },
        }
      );

      return response.ok;
    } catch (error) {
      this.logger.error('Shopify session verification failed', error);
      return false;
    }
  }
}

