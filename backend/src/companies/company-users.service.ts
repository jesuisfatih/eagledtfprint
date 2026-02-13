import { Injectable, Logger, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ShopifyRestService } from '../shopify/shopify-rest.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CompanyUsersService {
  private readonly logger = new Logger(CompanyUsersService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ShopifyRestService))
    private shopifyRest: ShopifyRestService,
  ) {}

  async findByCompany(companyId: string) {
    return this.prisma.companyUser.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(userId: string) {
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

  async invite(companyId: string, data: { email: string; role?: string }) {
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

  async update(userId: string, data: any) {
    return this.prisma.companyUser.update({
      where: { id: userId },
      data,
    });
  }

  async delete(userId: string) {
    return this.prisma.companyUser.delete({
      where: { id: userId },
    });
  }

  async verifyEmail(userId: string) {
    const user = await this.prisma.companyUser.findUnique({
      where: { id: userId },
      include: { company: { include: { merchant: true } } },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const permissions = (user.permissions as any) || {};
    permissions.emailVerified = true;

    const updatedUser = await this.prisma.companyUser.update({
      where: { id: userId },
      data: {
        permissions,
      },
    });

    // Update Shopify subscription if customer exists
    if (user.shopifyCustomerId && user.company.merchant) {
      try {
        await this.shopifyRest.updateCustomerSubscription(
          user.company.merchant.shopDomain,
          user.company.merchant.accessToken,
          user.shopifyCustomerId.toString(),
          true, // Subscribe to marketing
        );
        this.logger.log(`Customer ${user.email} subscribed to marketing after email verification`);
      } catch (error: any) {
        this.logger.error(`Failed to update Shopify subscription for ${user.email}`, error);
        // Continue anyway - email is verified
      }
    }

    return updatedUser;
  }

  /**
   * YUKSEK-001: Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.companyUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Verify current password
    if (user.passwordHash) {
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        throw new BadRequestException('Current password is incorrect');
      }
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.companyUser.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    this.logger.log(`Password changed for user ${user.email}`);

    return { success: true, message: 'Password changed successfully' };
  }

  /**
   * YUKSEK-002: Get notification preferences
   */
  async getNotificationPreferences(userId: string) {
    const user = await this.prisma.companyUser.findUnique({
      where: { id: userId },
      select: { permissions: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const permissions = (user.permissions as any) || {};
    const notificationPrefs = permissions.notifications || {
      orderUpdates: true,
      promotions: true,
      quoteAlerts: true,
      teamActivity: true,
      weeklyDigest: false,
    };

    return notificationPrefs;
  }

  /**
   * YUKSEK-002: Update notification preferences
   */
  async updateNotificationPreferences(userId: string, preferences: any) {
    const user = await this.prisma.companyUser.findUnique({
      where: { id: userId },
      select: { permissions: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const currentPermissions = (user.permissions as any) || {};
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

  /**
   * YUKSEK-004: Resend invitation email
   */
  async resendInvitation(companyId: string, email: string) {
    const user = await this.prisma.companyUser.findFirst({
      where: { companyId, email },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.invitationAcceptedAt) {
      throw new BadRequestException('Invitation already accepted');
    }

    // Generate new invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');

    await this.prisma.companyUser.update({
      where: { id: user.id },
      data: {
        invitationToken,
        invitationSentAt: new Date(),
      },
    });

    this.logger.log(`Invitation resent to ${email}`);

    // TODO: Send invitation email via mail service

    return { success: true, message: 'Invitation resent successfully' };
  }
}




