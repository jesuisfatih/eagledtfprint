import { Body, Controller, Get, Headers, HttpStatus, Logger, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { ShopifyCustomerSyncService } from '../shopify/shopify-customer-sync.service';
import { ShopifyRestService } from '../shopify/shopify-rest.service';
import { ShopifySsoService } from '../shopify/shopify-sso.service';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import {
    AcceptInvitationDto,
    AdminLoginDto,
    LoginDto,
    PasswordResetDto,
    PasswordResetRequestDto,
    RegisterDto,
    SendVerificationCodeDto,
    ShopifyCustomerSyncDto,
    VerifyEmailCodeDto
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginSecurityService } from './login-security.service';
import { SessionSyncService } from './session-sync.service';
import { ShopifyOauthService } from './shopify-oauth.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private readonly adminUrl: string;

  constructor(
    private authService: AuthService,
    private sessionSyncService: SessionSyncService,
    private loginSecurity: LoginSecurityService,
    private shopifySso: ShopifySsoService,
    private shopifyCustomerSync: ShopifyCustomerSyncService,
    private shopifyRest: ShopifyRestService,
    private prisma: PrismaService,
    private shopifyOauth: ShopifyOauthService,
    private config: ConfigService,
    private jwtService: JwtService,
  ) {
    this.adminUrl = this.config.get<string>('ADMIN_URL', '');
    this.adminUsername = this.config.get<string>('ADMIN_USERNAME', 'admin');
    this.adminPassword = this.config.get<string>('ADMIN_PASSWORD', 'eagle2025');
  }

  private readonly adminUsername: string;
  private readonly adminPassword: string;

  /**
   * Admin panel login - simple username/password auth
   * Returns JWT with merchantId for API access
   * Rate limited: 5 attempts per 60 seconds to prevent brute force
   */
  @Public()
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @Post('admin-login')
  async adminLogin(
    @Body() dto: AdminLoginDto,
    @Res() res: Response,
  ) {
    try {
      // Validate credentials
      if (dto.username !== this.adminUsername || dto.password !== this.adminPassword) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: 'Invalid credentials',
        });
      }

      // Get the merchant (single-tenant for now)
      const merchant = await this.prisma.merchant.findFirst({
        where: { status: 'active' },
      });

      if (!merchant) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'No merchant configured',
        });
      }

      // Generate JWT with merchantId
      const payload = {
        sub: merchant.id,
        type: 'merchant' as const,
        merchantId: merchant.id,
        shopDomain: merchant.shopDomain,
      };

      const token = this.jwtService.sign(payload);

      this.logger.log(`✅ [ADMIN_LOGIN] Admin logged in for merchant: ${merchant.shopDomain}`);

      return res.json({
        token,
        merchantId: merchant.id,
        shopDomain: merchant.shopDomain,
      });
    } catch (error: any) {
      this.logger.error(`❌ [ADMIN_LOGIN] Login failed: ${error.message}`);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Login failed',
      });
    }
  }

  /**
   * User login - Rate limited to prevent brute force attacks
   * Includes login attempt tracking and lockout protection
   */
  @Public()
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const identifier = `${dto.email}:${clientIp}`;

    try {
      // Check if login is allowed (not locked out)
      const attemptCheck = await this.loginSecurity.checkLoginAttempt(identifier);
      if (!attemptCheck.allowed) {
        return res.status(HttpStatus.TOO_MANY_REQUESTS).json({
          success: false,
          message: attemptCheck.message,
          lockoutSeconds: attemptCheck.lockoutSeconds,
        });
      }

      const user = await this.authService.validateUser(dto.email, dto.password);

      if (!user) {
        // Record failed attempt
        const failResult = await this.loginSecurity.recordFailedAttempt(identifier);
        return res.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          message: failResult.message || 'Invalid credentials',
          remainingAttempts: failResult.remainingAttempts,
        });
      }

      // Clear failed attempts on successful login
      await this.loginSecurity.clearAttempts(identifier);

      // Generate proper JWT payload with merchantId
      const payload = {
        sub: user.id,
        email: user.email,
        type: 'company_user' as const,
        companyId: user.companyId,
        merchantId: user.company?.merchantId,
      };

      const token = await this.authService.generateToken(payload);

      this.logger.log(`✅ [LOGIN] User logged in: ${user.email}`);

      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          companyId: user.companyId,
          merchantId: user.company?.merchantId,
        },
      });
    } catch (error: any) {
      // Record failed attempt on error
      await this.loginSecurity.recordFailedAttempt(identifier);
      this.logger.error(`❌ [LOGIN] Login failed for ${dto.email}: ${error.message}`);
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'Invalid credentials',
      });
    }
  }

  @Public()
  @Get('shopify-callback')
  async shopifyCallback(
    @Query('customer_id') shopifyCustomerId: string,
    @Query('email') email: string,
    @Res() res: Response,
  ) {
    try {
      // When user logs in Shopify, Shopify redirects back here
      // We log them in Eagle automatically

      const user = await this.authService.findUserByEmail(email);

      if (!user) {
        // Create new user from Shopify customer
        const newUser = await this.authService.createUserFromShopify({
          email,
          shopifyCustomerId,
        });

        const token = await this.authService.generateToken(newUser);

        return res.redirect(
          `${this.config.get('ACCOUNTS_URL')}/login?token=${token}&auto=true`
        );
      }

      const token = await this.authService.generateToken(user);

      return res.redirect(
        `${this.config.get('ACCOUNTS_URL')}/login?token=${token}&auto=true`
      );
    } catch (error) {
      return res.redirect(`${this.config.get('ACCOUNTS_URL')}/login?error=shopify_auth_failed`);
    }
  }

  @Public()
  @Get('validate-invitation')
  async validateInvitation(@Query('token') token: string, @Res() res: Response) {
    try {
      const user = await this.prisma.companyUser.findFirst({
        where: { invitationToken: token },
        include: { company: true },
      });

      if (!user) {
        return res.status(HttpStatus.NOT_FOUND).json({
          error: 'Invalid invitation token',
        });
      }

      if (user.invitationAcceptedAt) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: 'Invitation already accepted',
        });
      }

      return res.json({
        email: user.email,
        companyName: user.company.name,
        valid: true,
      });
    } catch (error: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to validate invitation',
      });
    }
  }

  @Public()
  @Post('send-verification-code')
  async sendVerificationCode(@Body() dto: SendVerificationCodeDto, @Res() res: Response) {
    try {
      const result = await this.authService.sendVerificationCode(dto.email);
      return res.json(result);
    } catch (error: any) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: error.message || 'Failed to send verification code',
      });
    }
  }

  @Public()
  @Post('verify-email-code')
  async verifyEmailCode(@Body() dto: VerifyEmailCodeDto, @Res() res: Response) {
    try {
      const isValid = await this.authService.verifyEmailCode(dto.email, dto.code);
      return res.json({ valid: isValid });
    } catch (error: any) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: error.message || 'Failed to verify code',
      });
    }
  }

  /**
   * Request B2B Invitation - For new businesses to request access
   */
  @Public()
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  @Post('request-invitation')
  async requestInvitation(
    @Body() body: {
      email: string;
      companyName: string;
      contactName: string;
      phone?: string;
      website?: string;
      industry?: string;
      estimatedMonthlyVolume?: string;
      message?: string;
    },
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`📩 [REQUEST_INVITATION] New invitation request from ${body.email}`);

      // Store request in database for admin review
      const merchant = await this.prisma.merchant.findFirst();
      if (!merchant) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'System not configured',
        });
      }

      // Create a pending company with the request details
      const company = await this.prisma.company.create({
        data: {
          merchantId: merchant.id,
          name: body.companyName,
          email: body.email,
          phone: body.phone,
          website: body.website,
          companyGroup: 'b2b-request',
          status: 'pending',
          settings: {
            requestDetails: {
              contactName: body.contactName,
              industry: body.industry,
              estimatedMonthlyVolume: body.estimatedMonthlyVolume,
              message: body.message,
              requestedAt: new Date().toISOString(),
            },
          },
        },
      });

      this.logger.log(`✅ [REQUEST_INVITATION] Request stored for ${body.email} (Company ID: ${company.id})`);

      return res.json({
        success: true,
        message: 'Your B2B access request has been submitted. We will review and get back to you within 1-2 business days.',
        requestId: company.id,
      });
    } catch (error: any) {
      this.logger.error(`❌ [REQUEST_INVITATION] Request failed for ${body.email}: ${error.message}`);
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message || 'Failed to submit request',
      });
    }
  }

  /**
   * Forgot Password - Request password reset email
   */
  @Public()
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  @Post('forgot-password')
  async forgotPassword(@Body() dto: PasswordResetRequestDto, @Res() res: Response) {
    try {
      this.logger.log(`🔑 [FORGOT_PASSWORD] Password reset requested for ${dto.email}`);

      const result = await this.authService.requestPasswordReset(dto.email);

      // Always return success to prevent email enumeration
      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.',
      });
    } catch (error: any) {
      this.logger.error(`❌ [FORGOT_PASSWORD] Failed for ${dto.email}: ${error.message}`);
      // Still return success to prevent email enumeration
      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.',
      });
    }
  }

  /**
   * Reset Password - Complete password reset with token
   */
  @Public()
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  async resetPassword(@Body() dto: PasswordResetDto, @Res() res: Response) {
    try {
      this.logger.log(`🔑 [RESET_PASSWORD] Password reset attempt with token`);

      const result = await this.authService.resetPassword(dto.token, dto.newPassword);

      if (result.success) {
        this.logger.log(`✅ [RESET_PASSWORD] Password reset successful`);
        return res.json({
          success: true,
          message: 'Password has been reset successfully. You can now log in with your new password.',
        });
      } else {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: result.message || 'Failed to reset password',
        });
      }
    } catch (error: any) {
      this.logger.error(`❌ [RESET_PASSWORD] Failed: ${error.message}`);
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message || 'Invalid or expired reset token',
      });
    }
  }

  /**
   * User registration - Rate limited to prevent spam
   */
  @Public()
  @Throttle({ short: { limit: 3, ttl: 60000 }, medium: { limit: 10, ttl: 300000 } })
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res() res: Response) {
    try {
      this.logger.log(`📝 [REGISTER] Registration request received for email: ${dto.email}`);
      const result = await this.authService.register(dto);
      this.logger.log(`✅ [REGISTER] Registration successful for email: ${dto.email}`);
      return res.json(result);
    } catch (error: any) {
      this.logger.error(`❌ [REGISTER] Registration failed for email: ${dto.email}`, {
        error: error.message,
        stack: error.stack,
      });
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: error.message || 'Registration failed',
      });
    }
  }

  /**
   * Accept invitation - Rate limited
   */
  @Public()
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @Post('accept-invitation')
  async acceptInvitation(@Body() dto: AcceptInvitationDto) {
    try {
      this.logger.log(`📝 [ACCEPT_INVITATION] Invitation acceptance request received for token: ${dto.token?.substring(0, 10)}...`);
      const result = await this.authService.acceptInvitation(dto);
      this.logger.log(`✅ [ACCEPT_INVITATION] Invitation accepted successfully`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ [ACCEPT_INVITATION] Invitation acceptance failed`, {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  @Public()
  @Post('shopify-customer-sync')
  async syncShopifyCustomer(@Body() dto: ShopifyCustomerSyncDto) {
    return this.sessionSyncService.syncFromShopify(
      dto.shopifyCustomerId,
      dto.email,
      dto.fingerprint
    );
  }

  @Public()
  @Get('resolve')
  async resolveContext(@Headers('authorization') auth: string) {
    const token = auth?.replace('Bearer ', '');
    if (!token) {
      return { error: 'No token provided' };
    }

    try {
      const decoded: any = this.authService['jwtService'].verify(token);
      return this.sessionSyncService.resolveContext(decoded.sub);
    } catch (error) {
      return { error: 'Invalid token' };
    }
  }

  @Public()
  @Post('refresh')
  async refreshToken(@Body() body: { token: string }, @Res() res: Response) {
    try {
      const newToken = await this.authService.refreshToken(body.token);

      if (!newToken) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: 'Invalid or expired token',
        });
      }

      return res.json({ token: newToken });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Token refresh failed',
      });
    }
  }

  @Public()
  @Get('ping')
  async ping(@Res() res: Response) {
    return res.json({ status: 'ok', timestamp: new Date().toISOString() });
  }

  @Public()
  @Post('validate')
  async validateToken(@Body() body: { token: string }, @Res() res: Response) {
    try {
      const user = await this.authService.validateToken(body.token);

      if (!user) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          valid: false,
        });
      }

      return res.json({ valid: true, user });
    } catch (error) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        valid: false,
      });
    }
  }

  /**
   * Generate Shopify SSO URL for logged-in user
   * Used when user logs in at the accounts portal and wants to go to Shopify
   *
   * Usage:
   * POST /api/v1/auth/shopify-sso
   * Headers: Authorization: Bearer {token}
   * Body: { returnTo?: string }
   */
  @UseGuards(JwtAuthGuard)
  @Post('shopify-sso')
  async getShopifySsoUrl(
    @CurrentUser() user: any,
    @Body() body: { returnTo?: string },
    @Res() res: Response,
  ) {
    try {
      // 1. Ensure user is synced to Shopify
      if (!user.shopifyCustomerId) {
        await this.shopifyCustomerSync.syncUserToShopify(user.id);
        // Reload user
        const updatedUser = await this.prisma.companyUser.findUnique({
          where: { id: user.id },
        });
        if (updatedUser) {
          user.shopifyCustomerId = updatedUser.shopifyCustomerId;
        }
      }

      // 2. Get merchant settings for SSO mode
      const company = await this.prisma.company.findUnique({
        where: { id: user.companyId },
        include: { merchant: true },
      });

      if (!company?.merchant) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: 'Merchant not found',
        });
      }

      const settings = (company.merchant.settings as any) || {};
      const ssoMode = settings.ssoMode || 'alternative';
      const returnTo = body.returnTo || '/checkout';

      // 3. Generate SSO URL based on mode
      if (ssoMode === 'multipass' && settings.multipassSecret) {
        // Multipass SSO (Shopify Plus) - use merchant-specific credentials
        const ssoUrl = this.shopifySso.generateSsoUrl(
          company.merchant.shopDomain,
          settings.multipassSecret,
          {
            email: user.email,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            customerId: user.shopifyCustomerId?.toString(),
            returnTo,
          },
        );

        return res.json({
          ssoUrl,
          mode: 'multipass',
        });
      } else {
        // Alternative: Customer Account API invite token
        try {
          if (!user.shopifyCustomerId) {
            throw new Error('Customer not synced to Shopify');
          }

          // Create customer invite token
          const inviteResponse = await this.shopifyRest.createCustomerInvite(
            company.merchant.shopDomain,
            company.merchant.accessToken,
            user.shopifyCustomerId.toString(),
          );

          // Extract invite token from URL
          const inviteUrl = inviteResponse.customer_invite?.invite_url || '';
          const tokenMatch = inviteUrl.match(/token=([^&]+)/);
          const inviteToken = tokenMatch ? tokenMatch[1] : null;

          if (inviteToken) {
            // Use invite token in login URL
            const shopDomain = company.merchant.shopDomain;
            const loginUrl = `https://${shopDomain}/account/login?email=${encodeURIComponent(user.email)}&token=${inviteToken}&return_to=${encodeURIComponent(returnTo)}`;

            return res.json({
              ssoUrl: loginUrl,
              mode: 'customer_account_api',
              message: 'Customer invite token created. User will be logged in automatically.',
            });
          } else {
            // Fallback: Just email
            const shopDomain = company.merchant.shopDomain;
            const loginUrl = `https://${shopDomain}/account/login?email=${encodeURIComponent(user.email)}&return_to=${encodeURIComponent(returnTo)}`;

            return res.json({
              ssoUrl: loginUrl,
              mode: 'email_only',
              message: 'Email pre-filled. Customer must enter password.',
            });
          }
        } catch (inviteError: any) {
          this.logger.warn('Customer invite failed, using email-only login', inviteError);
          // Fallback: Just email
          const shopDomain = company.merchant.shopDomain;
          const loginUrl = `https://${shopDomain}/account/login?email=${encodeURIComponent(user.email)}&return_to=${encodeURIComponent(returnTo)}`;

          return res.json({
            ssoUrl: loginUrl,
            mode: 'email_only',
            message: 'Email pre-filled. Customer must enter password.',
          });
        }
      }
    } catch (error: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: `SSO generation failed: ${error.message}`,
      });
    }
  }


  @Public()
  @Get('user')
  async getCurrentUser(@Query('token') token: string, @Res() res: Response) {
    try {
      const user = await this.authService.validateToken(token);

      if (!user) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          message: 'Invalid token',
        });
      }

      return res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        companyId: user.companyId,
        shopifyCustomerId: user.shopifyCustomerId?.toString(),
      });
    } catch (error) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        message: 'Invalid token',
      });
    }
  }

  /**
   * Shopify OAuth Install - Redirect to Shopify OAuth
   * Used for admin panel login
   * GET /api/v1/auth/shopify/install?shop=your-shop.myshopify.com
   */
  @Public()
  @Get('shopify/install')
  async shopifyInstall(
    @Query('shop') shop: string,
    @Res() res: Response,
  ) {
    try {
      if (!shop) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: 'Shop domain is required',
          example: '/auth/shopify/install?shop=your-shop.myshopify.com',
        });
      }

      // Normalize shop domain
      const shopDomain = shop.includes('.myshopify.com')
        ? shop
        : `${shop}.myshopify.com`;

      this.logger.log(`🔐 [OAUTH] Starting OAuth install for shop: ${shopDomain}`);

      const installUrl = this.shopifyOauth.getInstallUrl(shopDomain);

      return res.redirect(installUrl);
    } catch (error: any) {
      this.logger.error(`❌ [OAUTH] Install failed: ${error.message}`);
      return res.redirect(`${this.adminUrl}/login?error=oauth_install_failed`);
    }
  }

  /**
   * Shopify OAuth Callback - Handle OAuth response from Shopify
   * GET /api/v1/auth/shopify/callback
   */
  @Public()
  @Get('shopify/callback')
  async shopifyOauthCallback(
    @Query() query: Record<string, string>,
    @Res() res: Response,
  ) {
    const shop = query.shop;
    try {
      this.logger.log(`🔐 [OAUTH] Callback received for shop: ${shop}, params: ${Object.keys(query).join(',')}`);

      // Handle OAuth callback - pass ALL query params for proper HMAC verification
      const result = await this.shopifyOauth.handleCallback(query as any);

      this.logger.log(`✅ [OAUTH] OAuth successful for merchant: ${result.merchant.id}`);

      // Redirect to admin panel with JWT token
      return res.redirect(`${this.adminUrl}/login?token=${result.accessToken}&shop=${shop}`);
    } catch (error: any) {
      this.logger.error(`❌ [OAUTH] Callback failed: ${error.message}`);
      return res.redirect(`${this.adminUrl}/login?error=oauth_failed&message=${encodeURIComponent(error.message)}`);
    }
  }

  /**
   * Get password policy for frontend validation
   * PUBLIC endpoint - no auth required
   */
  @Public()
  @Get('password-policy')
  async getPasswordPolicy() {
    return {
      success: true,
      policy: this.loginSecurity.getPasswordPolicy(),
    };
  }

  /**
   * Validate password strength
   * PUBLIC endpoint - for registration/password change forms
   */
  @Public()
  @Post('validate-password')
  async validatePassword(@Body() body: { password: string }) {
    const result = this.loginSecurity.validatePassword(body.password);
    const strength = this.loginSecurity.calculatePasswordStrength(body.password);

    return {
      success: true,
      valid: result.valid,
      errors: result.errors,
      strength,
      strengthLabel: this.getStrengthLabel(strength),
    };
  }

  private getStrengthLabel(strength: number): string {
    const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
    return labels[Math.min(strength, 4)];
  }
}
