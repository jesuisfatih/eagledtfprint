import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto, UpdateAddressDto, AddressType } from './dto/address.dto';

@Injectable()
export class AddressesService {
  constructor(private prisma: PrismaService) {}

  async getAddresses(userId: string, companyId: string, merchantId: string) {
    return this.prisma.address.findMany({
      where: {
        merchantId,
        OR: [
          { companyUserId: userId },
          { companyId },
        ],
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async getAddressById(id: string) {
    const address = await this.prisma.address.findUnique({
      where: { id },
    });
    
    if (!address) {
      throw new NotFoundException('Address not found');
    }
    
    return address;
  }

  async createAddress(
    userId: string,
    companyId: string,
    merchantId: string,
    dto: CreateAddressDto,
  ) {
    // If this is set as default, clear other defaults
    if (dto.isDefault) {
      await this.clearDefaultAddresses(companyId, merchantId, dto.type);
    }

    return this.prisma.address.create({
      data: {
        merchantId,
        companyId,
        companyUserId: userId,
        label: dto.label,
        firstName: dto.firstName,
        lastName: dto.lastName,
        company: dto.company,
        address1: dto.address1,
        address2: dto.address2,
        city: dto.city,
        province: dto.province,
        provinceCode: dto.provinceCode,
        country: dto.country,
        countryCode: dto.countryCode || 'US',
        zip: dto.zip,
        phone: dto.phone,
        isDefault: dto.isDefault || false,
        isBilling: dto.type === AddressType.BILLING || dto.type === AddressType.BOTH,
        isShipping: dto.type === AddressType.SHIPPING || dto.type === AddressType.BOTH,
      },
    });
  }

  async updateAddress(id: string, dto: UpdateAddressDto) {
    const address = await this.getAddressById(id);

    // If setting as default, clear other defaults
    if (dto.isDefault && !address.isDefault) {
      await this.clearDefaultAddresses(
        address.companyId,
        address.merchantId,
        dto.type,
      );
    }

    return this.prisma.address.update({
      where: { id },
      data: {
        label: dto.label,
        firstName: dto.firstName,
        lastName: dto.lastName,
        company: dto.company,
        address1: dto.address1,
        address2: dto.address2,
        city: dto.city,
        province: dto.province,
        provinceCode: dto.provinceCode,
        country: dto.country,
        countryCode: dto.countryCode,
        zip: dto.zip,
        phone: dto.phone,
        isDefault: dto.isDefault,
        isBilling: dto.type === AddressType.BILLING || dto.type === AddressType.BOTH,
        isShipping: dto.type === AddressType.SHIPPING || dto.type === AddressType.BOTH,
      },
    });
  }

  async deleteAddress(id: string, userId: string) {
    const address = await this.getAddressById(id);

    if (address.companyUserId !== userId) {
      throw new BadRequestException('You can only delete your own addresses');
    }

    return this.prisma.address.delete({
      where: { id },
    });
  }

  async setDefaultAddress(
    id: string,
    userId: string,
    companyId: string,
    merchantId: string,
  ) {
    const address = await this.getAddressById(id);

    // Clear other defaults
    await this.clearDefaultAddresses(companyId, merchantId);

    return this.prisma.address.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  private async clearDefaultAddresses(
    companyId: string,
    merchantId: string,
    type?: AddressType,
  ) {
    const where: any = {
      companyId,
      merchantId,
      isDefault: true,
    };

    if (type === AddressType.BILLING) {
      where.isBilling = true;
    } else if (type === AddressType.SHIPPING) {
      where.isShipping = true;
    }

    await this.prisma.address.updateMany({
      where,
      data: { isDefault: false },
    });
  }

  async getDefaultAddress(
    companyId: string,
    merchantId: string,
    type: AddressType,
  ) {
    const where: any = {
      companyId,
      merchantId,
      isDefault: true,
    };

    if (type === AddressType.BILLING) {
      where.isBilling = true;
    } else if (type === AddressType.SHIPPING) {
      where.isShipping = true;
    }

    return this.prisma.address.findFirst({ where });
  }
}
