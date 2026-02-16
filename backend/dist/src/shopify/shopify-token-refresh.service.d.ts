import { HttpService } from '@nestjs/axios';
import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export declare class ShopifyTokenRefreshService implements OnModuleInit {
    private config;
    private prisma;
    private httpService;
    private readonly logger;
    constructor(config: ConfigService, prisma: PrismaService, httpService: HttpService);
    onModuleInit(): Promise<void>;
    handleTokenRefresh(): Promise<void>;
    refreshTokenForMerchant(merchant: {
        id: string;
        shopDomain: string;
    }): Promise<any>;
}
