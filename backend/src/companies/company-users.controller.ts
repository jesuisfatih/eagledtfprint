import {
    BadRequestException,
    Body,
    Controller,
    Get,
    NotFoundException,
    Param,
    Put,
    UseGuards
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanyUsersService } from './company-users.service';

@Controller('company-users')
@UseGuards(JwtAuthGuard)
export class CompanyUsersController {
  constructor(private companyUsersService: CompanyUsersService) {}

  @Get('me')
  async getMyProfile(@CurrentUser('sub') userId: string) {
    const user = await this.companyUsersService.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  @Put('me')
  async updateMyProfile(
    @CurrentUser('sub') userId: string,
    @Body() body: { firstName?: string; lastName?: string; phone?: string },
  ) {
    const updateData: any = {};

    if (body.firstName !== undefined) updateData.firstName = body.firstName;
    if (body.lastName !== undefined) updateData.lastName = body.lastName;
    if (body.phone !== undefined) updateData.phone = body.phone;

    return this.companyUsersService.update(userId, updateData);
  }

  /**
   * YUKSEK-001: Password change endpoint
   */
  @Put('me/password')
  async changePassword(
    @CurrentUser('sub') userId: string,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    if (!body.currentPassword || !body.newPassword) {
      throw new BadRequestException('Current password and new password are required');
    }

    if (body.newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }

    return this.companyUsersService.changePassword(userId, body.currentPassword, body.newPassword);
  }

  /**
   * YUKSEK-002: Notification preferences endpoint
   */
  @Get('me/notifications')
  async getNotificationPreferences(@CurrentUser('sub') userId: string) {
    return this.companyUsersService.getNotificationPreferences(userId);
  }

  @Put('me/notifications')
  async updateNotificationPreferences(
    @CurrentUser('sub') userId: string,
    @Body() preferences: {
      orderUpdates?: boolean;
      promotions?: boolean;
      quoteAlerts?: boolean;
      teamActivity?: boolean;
      weeklyDigest?: boolean;
    },
  ) {
    return this.companyUsersService.updateNotificationPreferences(userId, preferences);
  }

  /**
   * Admin: Update user role
   */
  @Put(':id/role')
  async updateUserRole(
    @Param('id') userId: string,
    @Body() body: { role: string },
  ) {
    if (!body.role) {
      throw new BadRequestException('Role is required');
    }
    return this.companyUsersService.update(userId, { role: body.role });
  }

  /**
   * Admin: Toggle user active status
   */
  @Put(':id/status')
  async updateUserStatus(
    @Param('id') userId: string,
    @Body() body: { isActive: boolean },
  ) {
    if (body.isActive === undefined) {
      throw new BadRequestException('isActive is required');
    }
    return this.companyUsersService.update(userId, { isActive: body.isActive });
  }
}
