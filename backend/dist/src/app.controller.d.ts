import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';
export declare class AppController {
    private readonly appService;
    private readonly prisma;
    private readonly redis;
    private readonly config;
    constructor(appService: AppService, prisma: PrismaService, redis: RedisService, config: ConfigService);
    getRoot(shop: string, host: string, res: Response): Response<any, Record<string, any>>;
    getHealth(): Promise<any>;
}
