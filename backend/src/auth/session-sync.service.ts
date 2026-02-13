import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ShopifyService } from '../shopify/shopify.service';

@Injectable()
export class SessionSyncService {
  private readonly logger = new Logger(SessionSyncService.name);

  constructor(
    private prisma: PrismaService,
    private shopify: ShopifyService,
    private jwtService: JwtService,
  ) {}

  async syncFromShopify(shopifyCustomerId: string, email: string, fingerprint?: string) {
    try {
      // Find user by Shopify ID or email
      let user = await this.prisma.companyUser.findFirst({
        where: {
          OR: [
            { shopifyCustomerId: BigInt(shopifyCustomerId) },
            { email },
          ],
        },
        include: { company: true },
      });

      // Create prospect user if not exists
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

      // Update Shopify ID if missing
      if (!user.shopifyCustomerId) {
        user = await this.prisma.companyUser.update({
          where: { id: user.id },
          data: { shopifyCustomerId: BigInt(shopifyCustomerId) },
          include: { company: true },
        });
      }

      // Generate session token
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
    } catch (error) {
      this.logger.error('Shopify sync error:', error);
      throw error;
    }
  }

  async resolveContext(userId: string) {
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

  private async getOrCreateProspectCompany(email: string, merchantId?: string) {
    const domain = email.split('@')[1];
    
    // Find existing company
    let company = await this.prisma.company.findFirst({
      where: { 
        email: { contains: domain },
        ...(merchantId ? { merchantId } : {}),
      },
    });

    if (!company) {
      // Need merchantId to create company
      if (!merchantId) {
        // Try to find any merchant as fallback
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
}

