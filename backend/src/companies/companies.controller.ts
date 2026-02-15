import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Query,
    UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompaniesService } from './companies.service';
import { CompanyIntelligenceService } from './company-intelligence.service';
import { CompanyUsersService } from './company-users.service';
import { CreateCompanyDto, GetCompaniesQueryDto, InviteUserDto, RejectCompanyDto, UpdateCompanyDto } from './dto/company.dto';

@Controller('companies')
@UseGuards(JwtAuthGuard)
export class CompaniesController {
  constructor(
    private companiesService: CompaniesService,
    private companyUsersService: CompanyUsersService,
    private companyIntelligence: CompanyIntelligenceService,
  ) {}

  @Get()
  async findAll(
    @CurrentUser('merchantId') merchantId: string,
    @Query() query: GetCompaniesQueryDto,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.companiesService.findAll(merchantId, { status: query.status, search: query.search });
  }

  @Get('stats')
  async getStats(@CurrentUser('merchantId') merchantId: string) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.companiesService.getStats(merchantId);
  }

  // ===================================================
  // COMPANY INTELLIGENCE ENDPOINTS
  // ===================================================
  @Get('intelligence/dashboard')
  async getIntelligenceDashboard(
    @CurrentUser('merchantId') merchantId: string,
  ) {
    if (!merchantId) throw new BadRequestException('Merchant ID required');
    return this.companyIntelligence.getDashboard(merchantId);
  }

  @Get('intelligence/:companyId')
  async getCompanyIntelligence(
    @CurrentUser('merchantId') merchantId: string,
    @Param('companyId') companyId: string,
  ) {
    if (!merchantId) throw new BadRequestException('Merchant ID required');
    return this.companyIntelligence.getCompanyDetail(merchantId, companyId);
  }

  @Post('intelligence/calculate')
  async calculateIntelligence(
    @CurrentUser('merchantId') merchantId: string,
  ) {
    if (!merchantId) throw new BadRequestException('Merchant ID required');
    return this.companyIntelligence.calculateAll(merchantId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser('merchantId') merchantId: string,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.companiesService.findOne(id, merchantId);
  }

  @Post()
  async create(
    @CurrentUser('merchantId') merchantId: string,
    @Body() dto: CreateCompanyDto,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.companiesService.create(merchantId, dto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser('merchantId') merchantId: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.companiesService.update(id, merchantId, dto);
  }

  @Post(':id/approve')
  async approve(
    @Param('id') id: string,
    @CurrentUser('merchantId') merchantId: string,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.companiesService.approve(id, merchantId);
  }

  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @CurrentUser('merchantId') merchantId: string,
    @Body() dto: RejectCompanyDto,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.companiesService.reject(id, merchantId, dto.reason);
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @CurrentUser('merchantId') merchantId: string,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.companiesService.delete(id, merchantId);
  }

  // Company Users
  @Get(':id/users')
  async getCompanyUsers(@Param('id') companyId: string) {
    return this.companyUsersService.findByCompany(companyId);
  }

  @Post(':id/users')
  async inviteUser(@Param('id') companyId: string, @Body() dto: InviteUserDto) {
    return this.companyUsersService.invite(companyId, dto);
  }

  @Delete(':id/users/:userId')
  async removeUser(
    @Param('id') companyId: string,
    @Param('userId') userId: string,
  ) {
    return this.companyUsersService.delete(userId);
  }

  @Post(':id/users/resend-invite')
  async resendInvite(
    @Param('id') companyId: string,
    @Body() body: { email: string },
  ) {
    if (!body.email) {
      throw new BadRequestException('Email is required');
    }
    return this.companyUsersService.resendInvitation(companyId, body.email);
  }

  @Post('users/:userId/verify-email')
  async verifyUserEmail(@Param('userId') userId: string) {
    return this.companyUsersService.verifyEmail(userId);
  }
}
