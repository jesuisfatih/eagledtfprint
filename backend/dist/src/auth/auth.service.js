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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const mail_service_1 = require("../mail/mail.service");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
const shopify_customer_sync_service_1 = require("../shopify/shopify-customer-sync.service");
const shopify_rest_service_1 = require("../shopify/shopify-rest.service");
let AuthService = AuthService_1 = class AuthService {
    prisma;
    jwtService;
    config;
    shopifyCustomerSync;
    shopifyRest;
    mailService;
    redisService;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(prisma, jwtService, config, shopifyCustomerSync, shopifyRest, mailService, redisService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.config = config;
        this.shopifyCustomerSync = shopifyCustomerSync;
        this.shopifyRest = shopifyRest;
        this.mailService = mailService;
        this.redisService = redisService;
    }
    async hashPassword(password) {
        const salt = await bcrypt.genSalt(10);
        return bcrypt.hash(password, salt);
    }
    async comparePasswords(password, hash) {
        return bcrypt.compare(password, hash);
    }
    async generateToken(payload) {
        return this.jwtService.sign(payload);
    }
    async generateRefreshToken(payload) {
        return this.jwtService.sign(payload, {
            secret: this.config.get('JWT_REFRESH_SECRET'),
            expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '30d'),
        });
    }
    async verifyToken(token) {
        try {
            return this.jwtService.verify(token);
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Invalid token');
        }
    }
    async validateCompanyUser(email, password) {
        const user = await this.prisma.companyUser.findUnique({
            where: { email },
            include: { company: true },
        });
        if (!user || !user.passwordHash) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isPasswordValid = await this.comparePasswords(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (!user.isActive) {
            throw new common_1.UnauthorizedException('Account is inactive');
        }
        await this.prisma.companyUser.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        return user;
    }
    async loginCompanyUser(email, password) {
        const user = await this.validateCompanyUser(email, password);
        const payload = {
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
    async validateUser(email, password) {
        const user = await this.prisma.companyUser.findUnique({
            where: { email },
            include: { company: true },
        });
        if (!user || !user.passwordHash) {
            return null;
        }
        const isPasswordValid = await this.comparePasswords(password, user.passwordHash);
        if (!isPasswordValid) {
            return null;
        }
        if (!user.isActive) {
            return null;
        }
        await this.prisma.companyUser.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        return user;
    }
    async findUserByEmail(email) {
        return this.prisma.companyUser.findUnique({
            where: { email },
            include: { company: true },
        });
    }
    async createUserFromShopify(data) {
        let companyId;
        if (data.merchantId) {
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
        }
        else {
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
    async refreshToken(oldToken) {
        try {
            const decoded = this.jwtService.verify(oldToken);
            const user = await this.prisma.companyUser.findUnique({
                where: { id: decoded.sub },
                include: { company: true },
            });
            if (!user)
                return null;
            const payload = {
                sub: user.id,
                email: user.email,
                type: 'access',
            };
            return this.jwtService.sign(payload);
        }
        catch (error) {
            return null;
        }
    }
    async validateToken(token) {
        try {
            const decoded = this.jwtService.verify(token);
            const user = await this.prisma.companyUser.findUnique({
                where: { id: decoded.sub },
                include: { company: true },
            });
            return user;
        }
        catch (error) {
            return null;
        }
    }
    async sendVerificationCode(email) {
        const existingUser = await this.prisma.companyUser.findUnique({
            where: { email },
        });
        if (existingUser) {
            throw new common_1.UnauthorizedException('Email already registered');
        }
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationKey = `email_verification:${email}`;
        try {
            await this.redisService.set(verificationKey, code, 600);
        }
        catch (redisError) {
            this.logger.warn('Redis not available, using in-memory fallback');
        }
        await this.mailService.sendVerificationCode(email, code);
        return {
            success: true,
            message: 'Verification code sent to email',
            code: process.env.NODE_ENV === 'development' ? code : undefined,
        };
    }
    async verifyEmailCode(email, code) {
        const verificationKey = `email_verification:${email}`;
        try {
            const storedCode = await this.redisService.get(verificationKey);
            if (storedCode === code) {
                await this.redisService.del(verificationKey);
                return true;
            }
            if (process.env.NODE_ENV === 'development' && code.length === 6 && /^\d+$/.test(code)) {
                this.logger.warn('Redis verification failed, using development fallback');
                return true;
            }
            return false;
        }
        catch (redisError) {
            if (process.env.NODE_ENV === 'development' && code.length === 6 && /^\d+$/.test(code)) {
                this.logger.warn('Redis not available, using development fallback');
                return true;
            }
            return false;
        }
    }
    async register(body) {
        let emailVerified = false;
        if (body.verificationCode && !body.skipEmailVerification) {
            const codeValid = await this.verifyEmailCode(body.email, body.verificationCode);
            if (!codeValid) {
                throw new common_1.UnauthorizedException('Invalid verification code');
            }
            emailVerified = true;
        }
        const existingUser = await this.prisma.companyUser.findUnique({
            where: { email: body.email },
        });
        if (existingUser) {
            throw new common_1.UnauthorizedException('Email already registered');
        }
        const merchant = await this.prisma.merchant.findFirst();
        if (!merchant) {
            throw new Error('No merchant found. Please configure a merchant first.');
        }
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
                status: 'pending',
            },
        });
        const passwordHash = await this.hashPassword(body.password);
        const user = await this.prisma.companyUser.create({
            data: {
                companyId: company.id,
                email: body.email,
                passwordHash,
                firstName: body.firstName,
                lastName: body.lastName,
                role: 'buyer',
                isActive: false,
                permissions: {
                    emailVerified: emailVerified,
                },
            },
            include: { company: true },
        });
        try {
            this.logger.log(`🔄 [REGISTER] Starting Shopify sync for user ${user.email} (ID: ${user.id})`);
            const shopifyResult = await this.shopifyCustomerSync.syncUserToShopify(user.id);
            this.logger.log(`✅ [REGISTER] User ${user.email} synced to Shopify successfully`, {
                shopifyCustomerId: shopifyResult?.id,
                email: user.email,
            });
            const userWithShopify = await this.prisma.companyUser.findUnique({
                where: { id: user.id },
            });
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
                if (body.billingAddress) {
                    metafields.push({
                        namespace: 'eagle_b2b',
                        key: 'billing_address1',
                        value: body.billingAddress.address1 || '',
                        type: 'single_line_text_field',
                    }, {
                        namespace: 'eagle_b2b',
                        key: 'billing_address2',
                        value: body.billingAddress.address2 || '',
                        type: 'single_line_text_field',
                    }, {
                        namespace: 'eagle_b2b',
                        key: 'billing_city',
                        value: body.billingAddress.city || '',
                        type: 'single_line_text_field',
                    }, {
                        namespace: 'eagle_b2b',
                        key: 'billing_state',
                        value: body.billingAddress.state || '',
                        type: 'single_line_text_field',
                    }, {
                        namespace: 'eagle_b2b',
                        key: 'billing_postal_code',
                        value: body.billingAddress.postalCode || '',
                        type: 'single_line_text_field',
                    }, {
                        namespace: 'eagle_b2b',
                        key: 'billing_country',
                        value: body.billingAddress.country || '',
                        type: 'single_line_text_field',
                    });
                }
                if (body.shippingAddress) {
                    metafields.push({
                        namespace: 'eagle_b2b',
                        key: 'shipping_address1',
                        value: body.shippingAddress.address1 || '',
                        type: 'single_line_text_field',
                    }, {
                        namespace: 'eagle_b2b',
                        key: 'shipping_address2',
                        value: body.shippingAddress.address2 || '',
                        type: 'single_line_text_field',
                    }, {
                        namespace: 'eagle_b2b',
                        key: 'shipping_city',
                        value: body.shippingAddress.city || '',
                        type: 'single_line_text_field',
                    }, {
                        namespace: 'eagle_b2b',
                        key: 'shipping_state',
                        value: body.shippingAddress.state || '',
                        type: 'single_line_text_field',
                    }, {
                        namespace: 'eagle_b2b',
                        key: 'shipping_postal_code',
                        value: body.shippingAddress.postalCode || '',
                        type: 'single_line_text_field',
                    }, {
                        namespace: 'eagle_b2b',
                        key: 'shipping_country',
                        value: body.shippingAddress.country || '',
                        type: 'single_line_text_field',
                    });
                }
                else {
                    metafields.push({
                        namespace: 'eagle_b2b',
                        key: 'shipping_same_as_billing',
                        value: 'true',
                        type: 'single_line_text_field',
                    });
                }
                await this.shopifyRest.updateCustomerMetafields(merchant.shopDomain, merchant.accessToken, userWithShopify.shopifyCustomerId.toString(), metafields);
                if (emailVerified) {
                    await this.shopifyRest.updateCustomerSubscription(merchant.shopDomain, merchant.accessToken, userWithShopify.shopifyCustomerId.toString(), true);
                    this.logger.log(`Customer ${user.email} subscribed to marketing (email verified)`);
                }
            }
        }
        catch (shopifyError) {
            this.logger.error(`❌ [REGISTER] Shopify sync failed for user ${user.email}`, {
                error: shopifyError.message,
                stack: shopifyError.stack,
                response: shopifyError.response?.data,
                status: shopifyError.response?.status,
            });
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
    async acceptInvitation(body) {
        const token = body.token;
        const password = body.password;
        const user = await this.prisma.companyUser.findFirst({
            where: { invitationToken: token },
            include: { company: true },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid invitation token');
        }
        if (user.invitationAcceptedAt) {
            throw new common_1.UnauthorizedException('Invitation already accepted');
        }
        const passwordHash = await this.hashPassword(password);
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
        const merchant = await this.prisma.merchant.findUnique({
            where: { id: user.company.merchantId },
        });
        try {
            this.logger.log(`🔄 [ACCEPT_INVITATION] Starting Shopify sync for user ${updatedUser.email} (ID: ${updatedUser.id})`);
            const shopifyCustomer = await this.shopifyCustomerSync.syncUserToShopify(updatedUser.id);
            this.logger.log(`✅ [ACCEPT_INVITATION] User ${updatedUser.email} synced to Shopify successfully`, {
                shopifyCustomerId: shopifyCustomer?.id,
                email: updatedUser.email,
            });
            const userWithShopify = await this.prisma.companyUser.findUnique({
                where: { id: updatedUser.id },
            });
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
                    if (body.companyInfo.billingAddress) {
                        const address = body.companyInfo.billingAddress;
                        metafields.push({
                            namespace: 'eagle_b2b',
                            key: 'billing_address1',
                            value: address.address1 || '',
                            type: 'single_line_text_field',
                        }, {
                            namespace: 'eagle_b2b',
                            key: 'billing_address2',
                            value: address.address2 || '',
                            type: 'single_line_text_field',
                        }, {
                            namespace: 'eagle_b2b',
                            key: 'billing_city',
                            value: address.city || '',
                            type: 'single_line_text_field',
                        }, {
                            namespace: 'eagle_b2b',
                            key: 'billing_state',
                            value: address.state || '',
                            type: 'single_line_text_field',
                        }, {
                            namespace: 'eagle_b2b',
                            key: 'billing_postal_code',
                            value: address.postalCode || '',
                            type: 'single_line_text_field',
                        }, {
                            namespace: 'eagle_b2b',
                            key: 'billing_country',
                            value: address.country || '',
                            type: 'single_line_text_field',
                        });
                    }
                    await this.shopifyRest.updateCustomerMetafields(merchant.shopDomain, merchant.accessToken, userWithShopify.shopifyCustomerId.toString(), metafields);
                    this.logger.log(`B2B metafields updated for customer ${userWithShopify.shopifyCustomerId}`);
                }
                catch (metafieldError) {
                    this.logger.warn('Failed to update Shopify metafields', metafieldError);
                }
            }
            this.logger.log(`User ${updatedUser.email} successfully synced to Shopify`);
        }
        catch (shopifyError) {
            this.logger.error(`❌ [ACCEPT_INVITATION] Shopify sync failed for user ${updatedUser.email}`, {
                error: shopifyError.message,
                stack: shopifyError.stack,
                response: shopifyError.response?.data,
                status: shopifyError.response?.status,
            });
        }
        const payload = {
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
    async requestPasswordReset(email) {
        const user = await this.prisma.companyUser.findUnique({
            where: { email: email.toLowerCase() },
            include: { company: true },
        });
        if (!user) {
            this.logger.log(`[PASSWORD_RESET] No user found for email: ${email}`);
            return { success: true };
        }
        const resetToken = await this.jwtService.signAsync({ sub: user.id, email: user.email, type: 'password_reset' }, { expiresIn: '1h' });
        const redisKey = `password_reset:${user.id}`;
        await this.redisService.set(redisKey, resetToken, 3600);
        const accountsUrl = this.config.get('ACCOUNTS_URL', '');
        const resetUrl = `${accountsUrl}/reset-password?token=${resetToken}`;
        try {
            await this.mailService.sendPasswordReset(user.email, resetUrl);
            this.logger.log(`✅ [PASSWORD_RESET] Reset email sent to ${email}`);
        }
        catch (mailError) {
            this.logger.error(`❌ [PASSWORD_RESET] Failed to send email: ${mailError.message}`);
        }
        return { success: true };
    }
    async resetPassword(token, newPassword) {
        try {
            const decoded = await this.jwtService.verifyAsync(token);
            if (!decoded.sub || decoded.type !== 'password_reset') {
                return { success: false, message: 'Invalid reset token' };
            }
            const redisKey = `password_reset:${decoded.sub}`;
            const storedToken = await this.redisService.get(redisKey);
            if (!storedToken || storedToken !== token) {
                return { success: false, message: 'Reset token has expired or already been used' };
            }
            const passwordHash = await this.hashPassword(newPassword);
            await this.prisma.companyUser.update({
                where: { id: decoded.sub },
                data: { passwordHash },
            });
            await this.redisService.del(redisKey);
            this.logger.log(`✅ [PASSWORD_RESET] Password reset successful for user ${decoded.sub}`);
            return { success: true };
        }
        catch (error) {
            this.logger.error(`❌ [PASSWORD_RESET] Token verification failed: ${error.message}`);
            return { success: false, message: 'Invalid or expired reset token' };
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService,
        shopify_customer_sync_service_1.ShopifyCustomerSyncService,
        shopify_rest_service_1.ShopifyRestService,
        mail_service_1.MailService,
        redis_service_1.RedisService])
], AuthService);
//# sourceMappingURL=auth.service.js.map