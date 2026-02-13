import { Controller, Get, Put, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateMerchantSettingsDto, UpdateCompanySettingsDto, UpdateSsoSettingsDto, ToggleSnippetDto } from './dto/settings.dto';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get('merchant')
  async getMerchantSettings(@CurrentUser('merchantId') merchantId: string) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.settingsService.getMerchantSettings(merchantId);
  }

  @Put('merchant')
  async updateMerchantSettings(
    @CurrentUser('merchantId') merchantId: string,
    @Body() dto: UpdateMerchantSettingsDto,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.settingsService.updateMerchantSettings(merchantId, dto);
  }

  @Put('snippet/toggle')
  async toggleSnippet(
    @CurrentUser('merchantId') merchantId: string,
    @Body() dto: ToggleSnippetDto,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.settingsService.toggleSnippet(merchantId, dto.enabled);
  }

  @Get('company')
  async getCompanySettings(@CurrentUser('companyId') companyId: string) {
    if (!companyId) {
      throw new BadRequestException('Company ID required');
    }
    return this.settingsService.getCompanySettings(companyId);
  }

  @Put('company')
  async updateCompanySettings(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpdateCompanySettingsDto,
  ) {
    if (!companyId) {
      throw new BadRequestException('Company ID required');
    }
    return this.settingsService.updateCompanySettings(companyId, dto);
  }

  @Get('sso')
  async getSsoSettings(@CurrentUser('merchantId') merchantId: string) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.settingsService.getSsoSettings(merchantId);
  }

  @Put('sso')
  async updateSsoSettings(
    @CurrentUser('merchantId') merchantId: string,
    @Body() dto: UpdateSsoSettingsDto,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.settingsService.updateSsoSettings(merchantId, dto);
  }
}

