import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressesController {
  constructor(private addressesService: AddressesService) {}

  // Get all addresses
  @Get()
  async getAddresses(
    @CurrentUser('sub') userId: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('merchantId') merchantId: string,
  ) {
    if (!userId || !merchantId) {
      throw new BadRequestException('User ID and Merchant ID required');
    }
    return this.addressesService.getAddresses(userId, companyId, merchantId);
  }

  // Get single address
  @Get(':id')
  async getAddress(@Param('id') id: string) {
    return this.addressesService.getAddressById(id);
  }

  // Create new address
  @Post()
  async createAddress(
    @CurrentUser('sub') userId: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('merchantId') merchantId: string,
    @Body() dto: CreateAddressDto,
  ) {
    if (!userId || !merchantId) {
      throw new BadRequestException('User ID and Merchant ID required');
    }
    return this.addressesService.createAddress(userId, companyId, merchantId, dto);
  }

  // Update address
  @Put(':id')
  async updateAddress(
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.updateAddress(id, dto);
  }

  // Delete address
  @Delete(':id')
  async deleteAddress(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    await this.addressesService.deleteAddress(id, userId);
    return { success: true };
  }

  // Set as default address
  @Post(':id/default')
  async setDefaultAddress(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('merchantId') merchantId: string,
  ) {
    return this.addressesService.setDefaultAddress(id, userId, companyId, merchantId);
  }
}
