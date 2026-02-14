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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuthController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const auth_service_1 = require("./auth.service");
const session_sync_service_1 = require("./session-sync.service");
const login_security_service_1 = require("./login-security.service");
const public_decorator_1 = require("./decorators/public.decorator");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
const current_user_decorator_1 = require("./decorators/current-user.decorator");
const shopify_sso_service_1 = require("../shopify/shopify-sso.service");
const shopify_customer_sync_service_1 = require("../shopify/shopify-customer-sync.service");
const shopify_rest_service_1 = require("../shopify/shopify-rest.service");
const prisma_service_1 = require("../prisma/prisma.service");
const shopify_oauth_service_1 = require("./shopify-oauth.service");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const auth_dto_1 = require("./dto/auth.dto");
let AuthController = AuthController_1 = class AuthController {
    authService;
    sessionSyncService;
    loginSecurity;
    shopifySso;
    shopifyCustomerSync;
    shopifyRest;
    prisma;
    shopifyOauth;
    config;
    jwtService;
    logger = new common_1.Logger(AuthController_1.name);
    adminUrl;
    constructor(authService, sessionSyncService, loginSecurity, shopifySso, shopifyCustomerSync, shopifyRest, prisma, shopifyOauth, config, jwtService) {
        this.authService = authService;
        this.sessionSyncService = sessionSyncService;
        this.loginSecurity = loginSecurity;
        this.shopifySso = shopifySso;
        this.shopifyCustomerSync = shopifyCustomerSync;
        this.shopifyRest = shopifyRest;
        this.prisma = prisma;
        this.shopifyOauth = shopifyOauth;
        this.config = config;
        this.jwtService = jwtService;
        this.adminUrl = this.config.get('ADMIN_URL', 'https://admin.eagledtfsupply.com');
        this.adminUsername = this.config.get('ADMIN_USERNAME', 'admin');
        this.adminPassword = this.config.get('ADMIN_PASSWORD', 'eagle2025');
    }
    adminUsername;
    adminPassword;
    async adminLogin(dto, res) {
        try {
            if (dto.username !== this.adminUsername || dto.password !== this.adminPassword) {
                return res.status(common_1.HttpStatus.UNAUTHORIZED).json({
                    message: 'Invalid credentials',
                });
            }
            const merchant = await this.prisma.merchant.findFirst({
                where: { status: 'active' },
            });
            if (!merchant) {
                return res.status(common_1.HttpStatus.NOT_FOUND).json({
                    message: 'No merchant configured',
                });
            }
            const payload = {
                sub: merchant.id,
                type: 'merchant',
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
        }
        catch (error) {
            this.logger.error(`❌ [ADMIN_LOGIN] Login failed: ${error.message}`);
            return res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Login failed',
            });
        }
    }
    async login(dto, req, res) {
        const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
        const identifier = `${dto.email}:${clientIp}`;
        try {
            const attemptCheck = await this.loginSecurity.checkLoginAttempt(identifier);
            if (!attemptCheck.allowed) {
                return res.status(common_1.HttpStatus.TOO_MANY_REQUESTS).json({
                    success: false,
                    message: attemptCheck.message,
                    lockoutSeconds: attemptCheck.lockoutSeconds,
                });
            }
            const user = await this.authService.validateUser(dto.email, dto.password);
            if (!user) {
                const failResult = await this.loginSecurity.recordFailedAttempt(identifier);
                return res.status(common_1.HttpStatus.UNAUTHORIZED).json({
                    success: false,
                    message: failResult.message || 'Invalid credentials',
                    remainingAttempts: failResult.remainingAttempts,
                });
            }
            await this.loginSecurity.clearAttempts(identifier);
            const payload = {
                sub: user.id,
                email: user.email,
                type: 'company_user',
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
        }
        catch (error) {
            await this.loginSecurity.recordFailedAttempt(identifier);
            this.logger.error(`❌ [LOGIN] Login failed for ${dto.email}: ${error.message}`);
            return res.status(common_1.HttpStatus.UNAUTHORIZED).json({
                success: false,
                message: 'Invalid credentials',
            });
        }
    }
    async shopifyCallback(shopifyCustomerId, email, res) {
        try {
            const user = await this.authService.findUserByEmail(email);
            if (!user) {
                const newUser = await this.authService.createUserFromShopify({
                    email,
                    shopifyCustomerId,
                });
                const token = await this.authService.generateToken(newUser);
                return res.redirect(`https://accounts.eagledtfsupply.com/login?token=${token}&auto=true`);
            }
            const token = await this.authService.generateToken(user);
            return res.redirect(`https://accounts.eagledtfsupply.com/login?token=${token}&auto=true`);
        }
        catch (error) {
            return res.redirect('https://accounts.eagledtfsupply.com/login?error=shopify_auth_failed');
        }
    }
    async validateInvitation(token, res) {
        try {
            const user = await this.prisma.companyUser.findFirst({
                where: { invitationToken: token },
                include: { company: true },
            });
            if (!user) {
                return res.status(common_1.HttpStatus.NOT_FOUND).json({
                    error: 'Invalid invitation token',
                });
            }
            if (user.invitationAcceptedAt) {
                return res.status(common_1.HttpStatus.BAD_REQUEST).json({
                    error: 'Invitation already accepted',
                });
            }
            return res.json({
                email: user.email,
                companyName: user.company.name,
                valid: true,
            });
        }
        catch (error) {
            return res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
                error: 'Failed to validate invitation',
            });
        }
    }
    async sendVerificationCode(dto, res) {
        try {
            const result = await this.authService.sendVerificationCode(dto.email);
            return res.json(result);
        }
        catch (error) {
            return res.status(common_1.HttpStatus.BAD_REQUEST).json({
                error: error.message || 'Failed to send verification code',
            });
        }
    }
    async verifyEmailCode(dto, res) {
        try {
            const isValid = await this.authService.verifyEmailCode(dto.email, dto.code);
            return res.json({ valid: isValid });
        }
        catch (error) {
            return res.status(common_1.HttpStatus.BAD_REQUEST).json({
                error: error.message || 'Failed to verify code',
            });
        }
    }
    async requestInvitation(body, res) {
        try {
            this.logger.log(`📩 [REQUEST_INVITATION] New invitation request from ${body.email}`);
            const merchant = await this.prisma.merchant.findFirst();
            if (!merchant) {
                return res.status(common_1.HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: 'System not configured',
                });
            }
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
        }
        catch (error) {
            this.logger.error(`❌ [REQUEST_INVITATION] Request failed for ${body.email}: ${error.message}`);
            return res.status(common_1.HttpStatus.BAD_REQUEST).json({
                success: false,
                message: error.message || 'Failed to submit request',
            });
        }
    }
    async forgotPassword(dto, res) {
        try {
            this.logger.log(`🔑 [FORGOT_PASSWORD] Password reset requested for ${dto.email}`);
            const result = await this.authService.requestPasswordReset(dto.email);
            return res.json({
                success: true,
                message: 'If an account exists with this email, you will receive a password reset link.',
            });
        }
        catch (error) {
            this.logger.error(`❌ [FORGOT_PASSWORD] Failed for ${dto.email}: ${error.message}`);
            return res.json({
                success: true,
                message: 'If an account exists with this email, you will receive a password reset link.',
            });
        }
    }
    async resetPassword(dto, res) {
        try {
            this.logger.log(`🔑 [RESET_PASSWORD] Password reset attempt with token`);
            const result = await this.authService.resetPassword(dto.token, dto.newPassword);
            if (result.success) {
                this.logger.log(`✅ [RESET_PASSWORD] Password reset successful`);
                return res.json({
                    success: true,
                    message: 'Password has been reset successfully. You can now log in with your new password.',
                });
            }
            else {
                return res.status(common_1.HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: result.message || 'Failed to reset password',
                });
            }
        }
        catch (error) {
            this.logger.error(`❌ [RESET_PASSWORD] Failed: ${error.message}`);
            return res.status(common_1.HttpStatus.BAD_REQUEST).json({
                success: false,
                message: error.message || 'Invalid or expired reset token',
            });
        }
    }
    async register(dto, res) {
        try {
            this.logger.log(`📝 [REGISTER] Registration request received for email: ${dto.email}`);
            const result = await this.authService.register(dto);
            this.logger.log(`✅ [REGISTER] Registration successful for email: ${dto.email}`);
            return res.json(result);
        }
        catch (error) {
            this.logger.error(`❌ [REGISTER] Registration failed for email: ${dto.email}`, {
                error: error.message,
                stack: error.stack,
            });
            return res.status(common_1.HttpStatus.BAD_REQUEST).json({
                error: error.message || 'Registration failed',
            });
        }
    }
    async acceptInvitation(dto) {
        try {
            this.logger.log(`📝 [ACCEPT_INVITATION] Invitation acceptance request received for token: ${dto.token?.substring(0, 10)}...`);
            const result = await this.authService.acceptInvitation(dto);
            this.logger.log(`✅ [ACCEPT_INVITATION] Invitation accepted successfully`);
            return result;
        }
        catch (error) {
            this.logger.error(`❌ [ACCEPT_INVITATION] Invitation acceptance failed`, {
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }
    async syncShopifyCustomer(dto) {
        return this.sessionSyncService.syncFromShopify(dto.shopifyCustomerId, dto.email, dto.fingerprint);
    }
    async resolveContext(auth) {
        const token = auth?.replace('Bearer ', '');
        if (!token) {
            return { error: 'No token provided' };
        }
        try {
            const decoded = this.authService['jwtService'].verify(token);
            return this.sessionSyncService.resolveContext(decoded.sub);
        }
        catch (error) {
            return { error: 'Invalid token' };
        }
    }
    async refreshToken(body, res) {
        try {
            const newToken = await this.authService.refreshToken(body.token);
            if (!newToken) {
                return res.status(common_1.HttpStatus.UNAUTHORIZED).json({
                    message: 'Invalid or expired token',
                });
            }
            return res.json({ token: newToken });
        }
        catch (error) {
            return res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
                message: 'Token refresh failed',
            });
        }
    }
    async ping(res) {
        return res.json({ status: 'ok', timestamp: new Date().toISOString() });
    }
    async validateToken(body, res) {
        try {
            const user = await this.authService.validateToken(body.token);
            if (!user) {
                return res.status(common_1.HttpStatus.UNAUTHORIZED).json({
                    valid: false,
                });
            }
            return res.json({ valid: true, user });
        }
        catch (error) {
            return res.status(common_1.HttpStatus.UNAUTHORIZED).json({
                valid: false,
            });
        }
    }
    async getShopifySsoUrl(user, body, res) {
        try {
            if (!user.shopifyCustomerId) {
                await this.shopifyCustomerSync.syncUserToShopify(user.id);
                const updatedUser = await this.prisma.companyUser.findUnique({
                    where: { id: user.id },
                });
                if (updatedUser) {
                    user.shopifyCustomerId = updatedUser.shopifyCustomerId;
                }
            }
            const company = await this.prisma.company.findUnique({
                where: { id: user.companyId },
                include: { merchant: true },
            });
            if (!company?.merchant) {
                return res.status(common_1.HttpStatus.BAD_REQUEST).json({
                    error: 'Merchant not found',
                });
            }
            const settings = company.merchant.settings || {};
            const ssoMode = settings.ssoMode || 'alternative';
            const returnTo = body.returnTo || '/checkout';
            if (ssoMode === 'multipass' && settings.multipassSecret) {
                const ssoUrl = this.shopifySso.generateSsoUrl(company.merchant.shopDomain, settings.multipassSecret, {
                    email: user.email,
                    firstName: user.firstName || '',
                    lastName: user.lastName || '',
                    customerId: user.shopifyCustomerId?.toString(),
                    returnTo,
                });
                return res.json({
                    ssoUrl,
                    mode: 'multipass',
                });
            }
            else {
                try {
                    if (!user.shopifyCustomerId) {
                        throw new Error('Customer not synced to Shopify');
                    }
                    const inviteResponse = await this.shopifyRest.createCustomerInvite(company.merchant.shopDomain, company.merchant.accessToken, user.shopifyCustomerId.toString());
                    const inviteUrl = inviteResponse.customer_invite?.invite_url || '';
                    const tokenMatch = inviteUrl.match(/token=([^&]+)/);
                    const inviteToken = tokenMatch ? tokenMatch[1] : null;
                    if (inviteToken) {
                        const shopDomain = company.merchant.shopDomain;
                        const loginUrl = `https://${shopDomain}/account/login?email=${encodeURIComponent(user.email)}&token=${inviteToken}&return_to=${encodeURIComponent(returnTo)}`;
                        return res.json({
                            ssoUrl: loginUrl,
                            mode: 'customer_account_api',
                            message: 'Customer invite token created. User will be logged in automatically.',
                        });
                    }
                    else {
                        const shopDomain = company.merchant.shopDomain;
                        const loginUrl = `https://${shopDomain}/account/login?email=${encodeURIComponent(user.email)}&return_to=${encodeURIComponent(returnTo)}`;
                        return res.json({
                            ssoUrl: loginUrl,
                            mode: 'email_only',
                            message: 'Email pre-filled. Customer must enter password.',
                        });
                    }
                }
                catch (inviteError) {
                    this.logger.warn('Customer invite failed, using email-only login', inviteError);
                    const shopDomain = company.merchant.shopDomain;
                    const loginUrl = `https://${shopDomain}/account/login?email=${encodeURIComponent(user.email)}&return_to=${encodeURIComponent(returnTo)}`;
                    return res.json({
                        ssoUrl: loginUrl,
                        mode: 'email_only',
                        message: 'Email pre-filled. Customer must enter password.',
                    });
                }
            }
        }
        catch (error) {
            return res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
                error: `SSO generation failed: ${error.message}`,
            });
        }
    }
    async getCurrentUser(token, res) {
        try {
            const user = await this.authService.validateToken(token);
            if (!user) {
                return res.status(common_1.HttpStatus.UNAUTHORIZED).json({
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
        }
        catch (error) {
            return res.status(common_1.HttpStatus.UNAUTHORIZED).json({
                message: 'Invalid token',
            });
        }
    }
    async shopifyInstall(shop, res) {
        try {
            if (!shop) {
                return res.status(common_1.HttpStatus.BAD_REQUEST).json({
                    error: 'Shop domain is required',
                    example: '/auth/shopify/install?shop=your-shop.myshopify.com',
                });
            }
            const shopDomain = shop.includes('.myshopify.com')
                ? shop
                : `${shop}.myshopify.com`;
            this.logger.log(`🔐 [OAUTH] Starting OAuth install for shop: ${shopDomain}`);
            const installUrl = this.shopifyOauth.getInstallUrl(shopDomain);
            return res.redirect(installUrl);
        }
        catch (error) {
            this.logger.error(`❌ [OAUTH] Install failed: ${error.message}`);
            return res.redirect(`${this.adminUrl}/login?error=oauth_install_failed`);
        }
    }
    async shopifyOauthCallback(code, shop, hmac, timestamp, state, res) {
        try {
            this.logger.log(`🔐 [OAUTH] Callback received for shop: ${shop}`);
            const result = await this.shopifyOauth.handleCallback({
                code,
                shop,
                hmac,
                timestamp,
                state,
            });
            this.logger.log(`✅ [OAUTH] OAuth successful for merchant: ${result.merchant.id}`);
            return res.redirect(`${this.adminUrl}/login?token=${result.accessToken}&shop=${shop}`);
        }
        catch (error) {
            this.logger.error(`❌ [OAUTH] Callback failed: ${error.message}`);
            return res.redirect(`${this.adminUrl}/login?error=oauth_failed&message=${encodeURIComponent(error.message)}`);
        }
    }
    async getPasswordPolicy() {
        return {
            success: true,
            policy: this.loginSecurity.getPasswordPolicy(),
        };
    }
    async validatePassword(body) {
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
    getStrengthLabel(strength) {
        const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
        return labels[Math.min(strength, 4)];
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ short: { limit: 5, ttl: 60000 } }),
    (0, common_1.Post)('admin-login'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.AdminLoginDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "adminLogin", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ short: { limit: 5, ttl: 60000 } }),
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.LoginDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('shopify-callback'),
    __param(0, (0, common_1.Query)('customer_id')),
    __param(1, (0, common_1.Query)('email')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "shopifyCallback", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('validate-invitation'),
    __param(0, (0, common_1.Query)('token')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "validateInvitation", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('send-verification-code'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.SendVerificationCodeDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendVerificationCode", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('verify-email-code'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.VerifyEmailCodeDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyEmailCode", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ short: { limit: 3, ttl: 60000 } }),
    (0, common_1.Post)('request-invitation'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "requestInvitation", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ short: { limit: 3, ttl: 60000 } }),
    (0, common_1.Post)('forgot-password'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.PasswordResetRequestDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ short: { limit: 5, ttl: 60000 } }),
    (0, common_1.Post)('reset-password'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.PasswordResetDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ short: { limit: 3, ttl: 60000 }, medium: { limit: 10, ttl: 300000 } }),
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.RegisterDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ short: { limit: 5, ttl: 60000 } }),
    (0, common_1.Post)('accept-invitation'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.AcceptInvitationDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "acceptInvitation", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('shopify-customer-sync'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.ShopifyCustomerSyncDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "syncShopifyCustomer", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('resolve'),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resolveContext", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('refresh'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refreshToken", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('ping'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "ping", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('validate'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "validateToken", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('shopify-sso'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getShopifySsoUrl", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('user'),
    __param(0, (0, common_1.Query)('token')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getCurrentUser", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('shopify/install'),
    __param(0, (0, common_1.Query)('shop')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "shopifyInstall", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('shopify/callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('shop')),
    __param(2, (0, common_1.Query)('hmac')),
    __param(3, (0, common_1.Query)('timestamp')),
    __param(4, (0, common_1.Query)('state')),
    __param(5, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "shopifyOauthCallback", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('password-policy'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getPasswordPolicy", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('validate-password'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "validatePassword", null);
exports.AuthController = AuthController = AuthController_1 = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        session_sync_service_1.SessionSyncService,
        login_security_service_1.LoginSecurityService,
        shopify_sso_service_1.ShopifySsoService,
        shopify_customer_sync_service_1.ShopifyCustomerSyncService,
        shopify_rest_service_1.ShopifyRestService,
        prisma_service_1.PrismaService,
        shopify_oauth_service_1.ShopifyOauthService,
        config_1.ConfigService,
        jwt_1.JwtService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map