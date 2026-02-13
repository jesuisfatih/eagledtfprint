import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { ShopifyService } from './shopify.service';

@Injectable()
export class ShopifyRestService {
  private readonly logger = new Logger(ShopifyRestService.name);

  constructor(
    private httpService: HttpService,
    private shopifyService: ShopifyService,
  ) {}

  async get<T>(shop: string, accessToken: string, path: string): Promise<T> {
    const url = this.shopifyService.buildAdminApiUrl(shop, path);

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        }),
      );

      return response.data as T;
    } catch (error) {
      this.logger.error(`REST GET failed: ${url}`, error.response?.data);
      throw error;
    }
  }

  async post<T>(shop: string, accessToken: string, path: string, data: any): Promise<T> {
    const url = this.shopifyService.buildAdminApiUrl(shop, path);

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, data, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        }),
      );

      return response.data as T;
    } catch (error) {
      this.logger.error(`REST POST failed: ${url}`, error.response?.data);
      throw error;
    }
  }

  async put<T>(shop: string, accessToken: string, path: string, data: any): Promise<T> {
    const url = this.shopifyService.buildAdminApiUrl(shop, path);

    try {
      const response = await firstValueFrom(
        this.httpService.put(url, data, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        }),
      );

      return response.data as T;
    } catch (error) {
      this.logger.error(`REST PUT failed: ${url}`, error.response?.data);
      throw error;
    }
  }

  async delete<T>(shop: string, accessToken: string, path: string): Promise<T> {
    const url = this.shopifyService.buildAdminApiUrl(shop, path);

    try {
      const response = await firstValueFrom(
        this.httpService.delete(url, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        }),
      );

      return response.data as T;
    } catch (error) {
      this.logger.error(`REST DELETE failed: ${url}`, error.response?.data);
      throw error;
    }
  }

  // Specific Shopify endpoints
  async getCustomers(shop: string, accessToken: string, limit = 250) {
    return this.get(shop, accessToken, `/customers.json?limit=${limit}`);
  }

  /**
   * Create customer invite token for login
   * Returns invite token that can be used in login URL
   */
  async createCustomerInvite(
    shop: string,
    accessToken: string,
    customerId: string,
  ): Promise<{ customer_invite: { to: string; from: string; subject: string; custom_message: string; invite_url: string } }> {
    const url = this.shopifyService.buildAdminApiUrl(shop, `/customers/${customerId}/send_invite.json`);

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          url,
          {
            customer_invite: {
              to: '', // Will use customer's email
              from: '', // Will use shop email
              subject: 'Welcome to our store',
              custom_message: 'Please login to complete your purchase',
            },
          },
          {
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Customer invite failed: ${url}`, error.response?.data);
      throw error;
    }
  }

  /**
   * Update customer subscription status (accepts_marketing)
   */
  async updateCustomerSubscription(
    shop: string,
    accessToken: string,
    customerId: string,
    acceptsMarketing: boolean,
  ): Promise<any> {
    const url = this.shopifyService.buildAdminApiUrl(shop, `/customers/${customerId}.json`);

    try {
      const response = await firstValueFrom(
        this.httpService.put(
          url,
          {
            customer: {
              accepts_marketing: acceptsMarketing,
            },
          },
          {
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(`Customer subscription update failed: ${url}`, error.response?.data);
      throw error;
    }
  }

  /**
   * Update customer metafields (B2B data)
   */
  async updateCustomerMetafields(
    shop: string,
    accessToken: string,
    customerId: string,
    metafields: Array<{
      namespace: string;
      key: string;
      value: string;
      type: string;
    }>,
  ): Promise<any> {
    // First, get existing metafields
    const getUrl = this.shopifyService.buildAdminApiUrl(shop, `/customers/${customerId}/metafields.json`);

    try {
      // Delete existing metafields in namespace
      const existingResponse = await firstValueFrom(
        this.httpService.get(getUrl, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        }),
      );

      const existingMetafields = existingResponse.data.metafields || [];

      // Delete existing metafields
      for (const metafield of existingMetafields) {
        if (metafields.some(m => m.namespace === metafield.namespace && m.key === metafield.key)) {
          await firstValueFrom(
            this.httpService.delete(
              this.shopifyService.buildAdminApiUrl(shop, `/metafields/${metafield.id}.json`),
              {
                headers: {
                  'X-Shopify-Access-Token': accessToken,
                  'Content-Type': 'application/json',
                },
              },
            ),
          );
        }
      }

      // Create new metafields
      const createUrl = this.shopifyService.buildAdminApiUrl(shop, '/metafields.json');
      const results: any[] = [];

      for (const metafield of metafields) {
        const response = await firstValueFrom(
          this.httpService.post(
            createUrl,
            {
              metafield: {
                namespace: metafield.namespace,
                key: metafield.key,
                value: metafield.value,
                type: metafield.type,
                owner_resource: 'customer',
                owner_id: customerId,
              },
            },
            {
              headers: {
                'X-Shopify-Access-Token': accessToken,
                'Content-Type': 'application/json',
              },
            },
          ),
        );
        if (response.data?.metafield) {
          results.push(response.data.metafield);
        }
      }

      return results;
    } catch (error) {
      this.logger.error(`Metafield update failed: ${getUrl}`, error.response?.data);
      throw error;
    }
  }

  /**
   * Get customer metafields
   */
  async getCustomerMetafields(
    shop: string,
    accessToken: string,
    customerId: string,
  ): Promise<any[]> {
    const url = this.shopifyService.buildAdminApiUrl(shop, `/customers/${customerId}/metafields.json`);

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        }),
      );

      return response.data.metafields || [];
    } catch (error) {
      this.logger.error(`Get metafields failed: ${url}`, error.response?.data);
      return [];
    }
  }

  async getProducts(shop: string, accessToken: string, limit = 250) {
    return this.get(shop, accessToken, `/products.json?limit=${limit}`);
  }

  async getOrders(shop: string, accessToken: string, limit = 250) {
    return this.get(shop, accessToken, `/orders.json?limit=${limit}&status=any`);
  }
}
