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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CompanyUsersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyUsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const shopify_rest_service_1 = require("../shopify/shopify-rest.service");
const crypto = __importStar(require("crypto"));
const bcrypt = __importStar(require("bcrypt"));
let CompanyUsersService = CompanyUsersService_1 = class CompanyUsersService {
    prisma;
    shopifyRest;
    logger = new common_1.Logger(CompanyUsersService_1.name);
    constructor(prisma, shopifyRest) {
        this.prisma = prisma;
        this.shopifyRest = shopifyRest;
    }
    async findByCompany(companyId) {
        return this.prisma.companyUser.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findById(userId) {
        return this.prisma.companyUser.findUnique({
            where: { id: userId },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                        merchant: {
                            select: {
                                shopDomain: true,
                            },
                        },
                    },
                },
            },
        });
    }
    async invite(companyId, data) {
        const invitationToken = crypto.randomBytes(32).toString('hex');
        return this.prisma.companyUser.create({
            data: {
                companyId,
                email: data.email,
                role: data.role || 'buyer',
                invitationToken,
                invitationSentAt: new Date(),
                isActive: false,
            },
        });
    }
    async update(userId, data) {
        return this.prisma.companyUser.update({
            where: { id: userId },
            data,
        });
    }
    async delete(userId) {
        return this.prisma.companyUser.delete({
            where: { id: userId },
        });
    }
    async verifyEmail(userId) {
        const user = await this.prisma.companyUser.findUnique({
            where: { id: userId },
            include: { company: { include: { merchant: true } } },
        });
        if (!user) {
            throw new Error('User not found');
        }
        const permissions = user.permissions || {};
        permissions.emailVerified = true;
        const updatedUser = await this.prisma.companyUser.update({
            where: { id: userId },
            data: {
                permissions,
            },
        });
        if (user.shopifyCustomerId && user.company.merchant) {
            try {
                await this.shopifyRest.updateCustomerSubscription(user.company.merchant.shopDomain, user.company.merchant.accessToken, user.shopifyCustomerId.toString(), true);
                this.logger.log(`Customer ${user.email} subscribed to marketing after email verification`);
            }
            catch (error) {
                this.logger.error(`Failed to update Shopify subscription for ${user.email}`, error);
            }
        }
        return updatedUser;
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = await this.prisma.companyUser.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.BadRequestException('User not found');
        }
        if (user.passwordHash) {
            const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
            if (!isValid) {
                throw new common_1.BadRequestException('Current password is incorrect');
            }
        }
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await this.prisma.companyUser.update({
            where: { id: userId },
            data: { passwordHash: newPasswordHash },
        });
        this.logger.log(`Password changed for user ${user.email}`);
        return { success: true, message: 'Password changed successfully' };
    }
    async getNotificationPreferences(userId) {
        const user = await this.prisma.companyUser.findUnique({
            where: { id: userId },
            select: { permissions: true },
        });
        if (!user) {
            throw new common_1.BadRequestException('User not found');
        }
        const permissions = user.permissions || {};
        const notificationPrefs = permissions.notifications || {
            orderUpdates: true,
            promotions: true,
            quoteAlerts: true,
            teamActivity: true,
            weeklyDigest: false,
        };
        return notificationPrefs;
    }
    async updateNotificationPreferences(userId, preferences) {
        const user = await this.prisma.companyUser.findUnique({
            where: { id: userId },
            select: { permissions: true },
        });
        if (!user) {
            throw new common_1.BadRequestException('User not found');
        }
        const currentPermissions = user.permissions || {};
        const updatedPermissions = {
            ...currentPermissions,
            notifications: {
                ...currentPermissions.notifications,
                ...preferences,
            },
        };
        await this.prisma.companyUser.update({
            where: { id: userId },
            data: { permissions: updatedPermissions },
        });
        this.logger.log(`Notification preferences updated for user ${userId}`);
        return updatedPermissions.notifications;
    }
    async resendInvitation(companyId, email) {
        const user = await this.prisma.companyUser.findFirst({
            where: { companyId, email },
        });
        if (!user) {
            throw new common_1.BadRequestException('User not found');
        }
        if (user.invitationAcceptedAt) {
            throw new common_1.BadRequestException('Invitation already accepted');
        }
        const invitationToken = crypto.randomBytes(32).toString('hex');
        await this.prisma.companyUser.update({
            where: { id: user.id },
            data: {
                invitationToken,
                invitationSentAt: new Date(),
            },
        });
        this.logger.log(`Invitation resent to ${email}`);
        return { success: true, message: 'Invitation resent successfully' };
    }
};
exports.CompanyUsersService = CompanyUsersService;
exports.CompanyUsersService = CompanyUsersService = CompanyUsersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => shopify_rest_service_1.ShopifyRestService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        shopify_rest_service_1.ShopifyRestService])
], CompanyUsersService);
//# sourceMappingURL=company-users.service.js.map