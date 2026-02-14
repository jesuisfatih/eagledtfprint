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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const address_dto_1 = require("./dto/address.dto");
let AddressesService = class AddressesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAddresses(userId, companyId, merchantId) {
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
    async getAddressById(id) {
        const address = await this.prisma.address.findUnique({
            where: { id },
        });
        if (!address) {
            throw new common_1.NotFoundException('Address not found');
        }
        return address;
    }
    async createAddress(userId, companyId, merchantId, dto) {
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
                isBilling: dto.type === address_dto_1.AddressType.BILLING || dto.type === address_dto_1.AddressType.BOTH,
                isShipping: dto.type === address_dto_1.AddressType.SHIPPING || dto.type === address_dto_1.AddressType.BOTH,
            },
        });
    }
    async updateAddress(id, dto) {
        const address = await this.getAddressById(id);
        if (dto.isDefault && !address.isDefault) {
            await this.clearDefaultAddresses(address.companyId, address.merchantId, dto.type);
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
                isBilling: dto.type === address_dto_1.AddressType.BILLING || dto.type === address_dto_1.AddressType.BOTH,
                isShipping: dto.type === address_dto_1.AddressType.SHIPPING || dto.type === address_dto_1.AddressType.BOTH,
            },
        });
    }
    async deleteAddress(id, userId) {
        const address = await this.getAddressById(id);
        if (address.companyUserId !== userId) {
            throw new common_1.BadRequestException('You can only delete your own addresses');
        }
        return this.prisma.address.delete({
            where: { id },
        });
    }
    async setDefaultAddress(id, userId, companyId, merchantId) {
        const address = await this.getAddressById(id);
        await this.clearDefaultAddresses(companyId, merchantId);
        return this.prisma.address.update({
            where: { id },
            data: { isDefault: true },
        });
    }
    async clearDefaultAddresses(companyId, merchantId, type) {
        const where = {
            companyId,
            merchantId,
            isDefault: true,
        };
        if (type === address_dto_1.AddressType.BILLING) {
            where.isBilling = true;
        }
        else if (type === address_dto_1.AddressType.SHIPPING) {
            where.isShipping = true;
        }
        await this.prisma.address.updateMany({
            where,
            data: { isDefault: false },
        });
    }
    async getDefaultAddress(companyId, merchantId, type) {
        const where = {
            companyId,
            merchantId,
            isDefault: true,
        };
        if (type === address_dto_1.AddressType.BILLING) {
            where.isBilling = true;
        }
        else if (type === address_dto_1.AddressType.SHIPPING) {
            where.isShipping = true;
        }
        return this.prisma.address.findFirst({ where });
    }
};
exports.AddressesService = AddressesService;
exports.AddressesService = AddressesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AddressesService);
//# sourceMappingURL=addresses.service.js.map