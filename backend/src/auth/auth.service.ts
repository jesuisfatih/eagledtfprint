import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ShopifyCustomerSyncService } from '../shopify/shopify-customer-sync.service';
import { ShopifyRestService } from '../shopify/shopify-rest.service';

export interface JwtPayload {
  sub: string;
  email: string;
  type: 'merchant' | 'company_user';
  merchantId?: string;
  companyId?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private shopifyCustomerSync: ShopifyCustomerSyncService,
    private shopifyRest: ShopifyRestService,
    private mailService: MailService,
    private redisService: RedisService,
  ) {}

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  async comparePasswords(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async generateToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.sign(payload as any);
  }

  async generateRefreshToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.sign(payload as any, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '30d'),
    } as any);
  }

  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async validateCompanyUser(email: string, password: string) {
    const user = await this.prisma.companyUser.findUnique({
      where: { email },
      include: { company: true },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.comparePasswords(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Update last login
    await this.prisma.companyUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return user;
  }

  async loginCompanyUser(email: string, password: string) {
    const user = await this.validateCompanyUser(email, password);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      type: 'company_user',
      companyId: user.companyId,
      merchantId: user.company.merchantId,
    };

    const accessToken = await this.generateToken(payload);
    const refreshToken = await this.generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId,
        merchantId: user.company.merchantId,
      },
    };
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.companyUser.findUnique({
      where: { email },
      include: { company: true },
    });

    if (!user || !user.passwordHash) {
      return null;
    }

    // Verify password with bcrypt
    const isPasswordValid = await this.comparePasswords(password, user.passwordHash);

    if (!isPasswordValid) {
      return null;
    }

    if (!user.isActive) {
      return null;
    }

    // Update last login
    await this.prisma.companyUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return user;
  }

  async findUserByEmail(email: string): Promise<any> {
    return this.prisma.companyUser.findUnique({
      where: { email },
      include: { company: true },
    });
  }

  async createUserFromShopify(data: { email: string; shopifyCustomerId: string; merchantId?: string }): Promise<any> {
    // Find or create a default company for Shopify customers
    let companyId: string;

    if (data.merchantId) {
      // Find or create default company for this merchant
      let company = await this.prisma.company.findFirst({
        where: {
          merchantId: data.merchantId,
          name: 'Shopify Customers',
        },
      });

      if (!company) {
        company = await this.prisma.company.create({
          data: {
            merchantId: data.merchantId,
            name: 'Shopify Customers',
            status: 'active',
          },
        });
      }
      companyId = company.id;
    } else {
      // Fallback: find any company
      const company = await this.prisma.company.findFirst();
      if (!company) {
        throw new Error('No company found to assign Shopify customer');
      }
      companyId = company.id;
    }

    return this.prisma.companyUser.create({
      data: {
        email: data.email,
        shopifyCustomerId: BigInt(data.shopifyCustomerId),
        firstName: '',
        lastName: '',
        role: 'buyer',
        companyId,
        isActive: true,
      },
      include: { company: true },
    });
  }

  async refreshToken(oldToken: string): Promise<string | null> {
    try {
      const decoded: any = this.jwtService.verify(oldToken);
      const user = await this.prisma.companyUser.findUnique({
        where: { id: decoded.sub },
        include: { company: true },
      });

      if (!user) return null;

      const payload = {
        sub: user.id,
        email: user.email,
        type: 'access',
      };

      return this.jwtService.sign(payload);
    } catch (error) {
      return null;
    }
  }

  async validateToken(token: string): Promise<any> {
    try {
      const decoded = this.jwtService.verify(token);
      const user = await this.prisma.companyUser.findUnique({
        where: { id: decoded.sub },
        include: { company: true },
      });

      return user;
    } catch (error) {
      return null;
    }
  }

  /**
   * Send email verification code
   */
  async sendVerificationCode(email: string) {
    // Check if email already exists
    const existingUser = await this.prisma.companyUser.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new UnauthorizedException('Email already registered');
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store code in Redis with 10 minute expiry
    const verificationKey = `email_verification:${email}`;
    try {
      await this.redisService.set(verificationKey, code, 600); // 10 minutes
    } catch (redisError) {
      this.logger.warn('Redis not available, using in-memory fallback');
      // Fallback: In development, we'll still work
    }

    // Send email
    await this.mailService.sendVerificationCode(email, code);

    return {
      success: true,
      message: 'Verification code sent to email',
      // In development, return code for testing
      code: process.env.NODE_ENV === 'development' ? code : undefined,
    };
  }

  /**
   * Verify email code
   */
  async verifyEmailCode(email: string, code: string): Promise<boolean> {
    const verificationKey = `email_verification:${email}`;

    try {
      const storedCode = await this.redisService.get(verificationKey);

      if (storedCode === code) {
        // Delete code after successful verification
        await this.redisService.del(verificationKey);
        return true;
      }

      // Fallback for development if Redis fails
      if (process.env.NODE_ENV === 'development' && code.length === 6 && /^\d+$/.test(code)) {
        this.logger.warn('Redis verification failed, using development fallback');
        return true;
      }

      return false;
    } catch (redisError) {
      // Fallback for development
      if (process.env.NODE_ENV === 'development' && code.length === 6 && /^\d+$/.test(code)) {
        this.logger.warn('Redis not available, using development fallback');
        return true;
      }
      return false;
    }
  }

  /**
   * Register new user (without invitation)
   */
  async register(body: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    accountType: 'b2b' | 'normal';
    companyName?: string;
    taxId?: string;
    billingAddress: any;
    shippingAddress?: any;
    verificationCode?: string;
    skipEmailVerification?: boolean;
  }) {
    // Verify email code if provided
    let emailVerified = false;
    if (body.verificationCode && !body.skipEmailVerification) {
      const codeValid = await this.verifyEmailCode(body.email, body.verificationCode);
      if (!codeValid) {
        throw new UnauthorizedException('Invalid verification code');
      }
      emailVerified = true;
    }

    // Check if email already exists
    const existingUser = await this.prisma.companyUser.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      throw new UnauthorizedException('Email already registered');
    }

    // Get default merchant (or first merchant)
    const merchant = await this.prisma.merchant.findFirst();
    if (!merchant) {
      throw new Error('No merchant found. Please configure a merchant first.');
    }

    // Create company
    const company = await this.prisma.company.create({
      data: {
        merchantId: merchant.id,
        name: body.companyName || body.accountType === 'b2b' ? `${body.firstName} ${body.lastName} Company` : `${body.firstName} ${body.lastName}`,
        taxId: body.taxId,
        phone: body.phone,
        email: body.email,
        billingAddress: body.billingAddress,
        shippingAddress: body.shippingAddress || body.billingAddress,
        companyGroup: body.accountType === 'b2b' ? 'b2b' : 'normal',
        status: 'pending', // Requires admin approval
      },
    });

    // Create user
    const passwordHash = await this.hashPassword(body.password);
    const user = await this.prisma.companyUser.create({
      data: {
        companyId: company.id,
        email: body.email,
        passwordHash,
        firstName: body.firstName,
        lastName: body.lastName,
        role: 'buyer',
        isActive: false, // Inactive until admin approval
        // Store email verification status in settings JSON
        permissions: {
          emailVerified: emailVerified,
        },
      },
      include: { company: true },
    });

    // Sync to Shopify immediately (even if email not verified)
    try {
      this.logger.log(`🔄 [REGISTER] Starting Shopify sync for user ${user.email} (ID: ${user.id})`);
      const shopifyResult = await this.shopifyCustomerSync.syncUserToShopify(user.id);
      this.logger.log(`✅ [REGISTER] User ${user.email} synced to Shopify successfully`, {
        shopifyCustomerId: shopifyResult?.id,
        email: user.email,
      });

      // Reload user to get Shopify ID
      const userWithShopify = await this.prisma.companyUser.findUnique({
        where: { id: user.id },
      });

      // Update Shopify metafields
      if (userWithShopify?.shopifyCustomerId && merchant) {
        this.logger.log(`📝 [REGISTER] Updating Shopify metafields for user ${user.email}`, {
          shopifyCustomerId: userWithShopify.shopifyCustomerId.toString(),
        });

        const metafields = [
          {
            namespace: 'eagle_b2b',
            key: 'account_type',
            value: body.accountType,
            type: 'single_line_text_field',
          },
          {
            namespace: 'eagle_b2b',
            key: 'company_name',
            value: company.name,
            type: 'single_line_text_field',
          },
          {
            namespace: 'eagle_b2b',
            key: 'tax_id',
            value: body.taxId || '',
            type: 'single_line_text_field',
          },
          {
            namespace: 'eagle_b2b',
            key: 'company_id',
            value: company.id,
            type: 'single_line_text_field',
          },
          {
            namespace: 'eagle_b2b',
            key: 'status',
            value: 'pending',
            type: 'single_line_text_field',
          },
        ];

        // Add billing address metafields
        if (body.billingAddress) {
          metafields.push(
            {
              namespace: 'eagle_b2b',
              key: 'billing_address1',
              value: body.billingAddress.address1 || '',
              type: 'single_line_text_field',
            },
            {
              namespace: 'eagle_b2b',
              key: 'billing_address2',
              value: body.billingAddress.address2 || '',
              type: 'single_line_text_field',
            },
            {
              namespace: 'eagle_b2b',
              key: 'billing_city',
              value: body.billingAddress.city || '',
              type: 'single_line_text_field',
            },
            {
              namespace: 'eagle_b2b',
              key: 'billing_state',
              value: body.billingAddress.state || '',
              type: 'single_line_text_field',
            },
            {
              namespace: 'eagle_b2b',
              key: 'billing_postal_code',
              value: body.billingAddress.postalCode || '',
              type: 'single_line_text_field',
            },
            {
              namespace: 'eagle_b2b',
              key: 'billing_country',
              value: body.billingAddress.country || '',
              type: 'single_line_text_field',
            },
          );
        }

        // Add shipping address metafields (if different from billing)
        if (body.shippingAddress) {
          metafields.push(
            {
              namespace: 'eagle_b2b',
              key: 'shipping_address1',
              value: body.shippingAddress.address1 || '',
              type: 'single_line_text_field',
            },
            {
              namespace: 'eagle_b2b',
              key: 'shipping_address2',
              value: body.shippingAddress.address2 || '',
              type: 'single_line_text_field',
            },
            {
              namespace: 'eagle_b2b',
              key: 'shipping_city',
              value: body.shippingAddress.city || '',
              type: 'single_line_text_field',
            },
            {
              namespace: 'eagle_b2b',
              key: 'shipping_state',
              value: body.shippingAddress.state || '',
              type: 'single_line_text_field',
            },
            {
              namespace: 'eagle_b2b',
              key: 'shipping_postal_code',
              value: body.shippingAddress.postalCode || '',
              type: 'single_line_text_field',
            },
            {
              namespace: 'eagle_b2b',
              key: 'shipping_country',
              value: body.shippingAddress.country || '',
              type: 'single_line_text_field',
            },
          );
        } else {
          // If same as billing, mark it
          metafields.push({
            namespace: 'eagle_b2b',
            key: 'shipping_same_as_billing',
            value: 'true',
            type: 'single_line_text_field',
          });
        }

        await this.shopifyRest.updateCustomerMetafields(
          merchant.shopDomain,
          merchant.accessToken,
          userWithShopify.shopifyCustomerId.toString(),
          metafields,
        );

        // Update subscription status based on email verification
        if (emailVerified) {
          await this.shopifyRest.updateCustomerSubscription(
            merchant.shopDomain,
            merchant.accessToken,
            userWithShopify.shopifyCustomerId.toString(),
            true, // Subscribe to marketing
          );
          this.logger.log(`Customer ${user.email} subscribed to marketing (email verified)`);
        }
      }
    } catch (shopifyError: any) {
      this.logger.error(`❌ [REGISTER] Shopify sync failed for user ${user.email}`, {
        error: shopifyError.message,
        stack: shopifyError.stack,
        response: shopifyError.response?.data,
        status: shopifyError.response?.status,
      });
      // Continue anyway - user is registered
    }

    return {
      success: true,
      message: 'Registration successful. Your account is pending admin approval.',
      user: {
        id: user.id,
        email: user.email,
        companyId: company.id,
        status: 'pending',
      },
    };
  }

  async acceptInvitation(body: any) {
    const token = body.token;
    const password = body.password;
    const user = await this.prisma.companyUser.findFirst({
      where: { invitationToken: token },
      include: { company: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid invitation token');
    }

    if (user.invitationAcceptedAt) {
      throw new UnauthorizedException('Invitation already accepted');
    }

    const passwordHash = await this.hashPassword(password);

    // Update user
    const updatedUser = await this.prisma.companyUser.update({
      where: { id: user.id },
      data: {
        passwordHash,
        firstName: body.firstName || user.firstName,
        lastName: body.lastName || user.lastName,
        invitationAcceptedAt: new Date(),
        invitationToken: null,
        isActive: true,
      },
      include: { company: true },
    });

    // Update company if info provided
    let updatedCompany = user.company;
    if (body.companyInfo) {
      updatedCompany = await this.prisma.company.update({
        where: { id: user.companyId },
        data: {
          name: body.companyInfo.name || user.company.name,
          taxId: body.companyInfo.taxId,
          phone: body.companyInfo.phone,
          billingAddress: body.companyInfo.billingAddress,
          status: 'active',
        },
      });
    }

    // Get merchant for Shopify sync
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: user.company.merchantId },
    });

    // Sync user to Shopify after registration
    try {
      this.logger.log(`🔄 [ACCEPT_INVITATION] Starting Shopify sync for user ${updatedUser.email} (ID: ${updatedUser.id})`);

      // Sync user to Shopify
      const shopifyCustomer = await this.shopifyCustomerSync.syncUserToShopify(updatedUser.id);
      this.logger.log(`✅ [ACCEPT_INVITATION] User ${updatedUser.email} synced to Shopify successfully`, {
        shopifyCustomerId: shopifyCustomer?.id,
        email: updatedUser.email,
      });

      // Reload user to get Shopify customer ID
      const userWithShopify = await this.prisma.companyUser.findUnique({
        where: { id: updatedUser.id },
      });

      // Update Shopify customer with B2B metafields if company info provided
      if (merchant && body.companyInfo && userWithShopify?.shopifyCustomerId) {
        try {
          const metafields = [
            {
              namespace: 'eagle_b2b',
              key: 'company_name',
              value: body.companyInfo.name || '',
              type: 'single_line_text_field',
            },
            {
              namespace: 'eagle_b2b',
              key: 'tax_id',
              value: body.companyInfo.taxId || '',
              type: 'single_line_text_field',
            },
            {
              namespace: 'eagle_b2b',
              key: 'company_id',
              value: updatedUser.companyId,
              type: 'single_line_text_field',
            },
          ];

          // Add address metafields if provided
          if (body.companyInfo.billingAddress) {
            const address = body.companyInfo.billingAddress;
            metafields.push(
              {
                namespace: 'eagle_b2b',
                key: 'billing_address1',
                value: address.address1 || '',
                type: 'single_line_text_field',
              },
              {
                namespace: 'eagle_b2b',
                key: 'billing_address2',
                value: address.address2 || '',
                type: 'single_line_text_field',
              },
              {
                namespace: 'eagle_b2b',
                key: 'billing_city',
                value: address.city || '',
                type: 'single_line_text_field',
              },
              {
                namespace: 'eagle_b2b',
                key: 'billing_state',
                value: address.state || '',
                type: 'single_line_text_field',
              },
              {
                namespace: 'eagle_b2b',
                key: 'billing_postal_code',
                value: address.postalCode || '',
                type: 'single_line_text_field',
              },
              {
                namespace: 'eagle_b2b',
                key: 'billing_country',
                value: address.country || '',
                type: 'single_line_text_field',
              },
            );
          }

          await this.shopifyRest.updateCustomerMetafields(
            merchant.shopDomain,
            merchant.accessToken,
            userWithShopify.shopifyCustomerId.toString(),
            metafields,
          );

          this.logger.log(`B2B metafields updated for customer ${userWithShopify.shopifyCustomerId}`);
        } catch (metafieldError: any) {
          this.logger.warn('Failed to update Shopify metafields', metafieldError);
          // Continue anyway - customer is created
        }
      }

      this.logger.log(`User ${updatedUser.email} successfully synced to Shopify`);
    } catch (shopifyError: any) {
      this.logger.error(`❌ [ACCEPT_INVITATION] Shopify sync failed for user ${updatedUser.email}`, {
        error: shopifyError.message,
        stack: shopifyError.stack,
        response: shopifyError.response?.data,
        status: shopifyError.response?.status,
      });
      // Continue anyway - user is registered in Eagle
    }

    const payload: JwtPayload = {
      sub: updatedUser.id,
      email: updatedUser.email,
      type: 'company_user',
      companyId: updatedUser.companyId,
      merchantId: user.company.merchantId,
    };

    const accessToken = await this.generateToken(payload);
    const refreshToken = await this.generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        companyId: updatedUser.companyId,
      },
    };
  }

  /**
   * Request password reset - sends email with reset link
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean }> {
    const user = await this.prisma.companyUser.findUnique({
      where: { email: email.toLowerCase() },
      include: { company: true },
    });

    if (!user) {
      // Don't reveal if user exists
      this.logger.log(`[PASSWORD_RESET] No user found for email: ${email}`);
      return { success: true };
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, type: 'password_reset' },
      { expiresIn: '1h' }
    );

    // Store token in Redis with 1 hour TTL
    const redisKey = `password_reset:${user.id}`;
    await this.redisService.set(redisKey, resetToken, 3600);

    // Send password reset email
    const accountsUrl = this.config.get<string>('ACCOUNTS_URL', '');
    const resetUrl = `${accountsUrl}/reset-password?token=${resetToken}`;

    try {
      await this.mailService.sendPasswordReset(user.email, resetUrl);
      this.logger.log(`✅ [PASSWORD_RESET] Reset email sent to ${email}`);
    } catch (mailError: any) {
      this.logger.error(`❌ [PASSWORD_RESET] Failed to send email: ${mailError.message}`);
      // Still return success to prevent enumeration
    }

    return { success: true };
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message?: string }> {
    try {
      // Verify token
      const decoded = await this.jwtService.verifyAsync(token);

      if (!decoded.sub || decoded.type !== 'password_reset') {
        return { success: false, message: 'Invalid reset token' };
      }

      // Check if token is in Redis (one-time use)
      const redisKey = `password_reset:${decoded.sub}`;
      const storedToken = await this.redisService.get(redisKey);

      if (!storedToken || storedToken !== token) {
        return { success: false, message: 'Reset token has expired or already been used' };
      }

      // Update password
      const passwordHash = await this.hashPassword(newPassword);
      await this.prisma.companyUser.update({
        where: { id: decoded.sub },
        data: { passwordHash },
      });

      // Delete token from Redis (one-time use)
      await this.redisService.del(redisKey);

      this.logger.log(`✅ [PASSWORD_RESET] Password reset successful for user ${decoded.sub}`);
      return { success: true };
    } catch (error: any) {
      this.logger.error(`❌ [PASSWORD_RESET] Token verification failed: ${error.message}`);
      return { success: false, message: 'Invalid or expired reset token' };
    }
  }
}
