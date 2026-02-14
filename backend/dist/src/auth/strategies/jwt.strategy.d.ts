import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../auth.service';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private config;
    private prisma;
    constructor(config: ConfigService, prisma: PrismaService);
    validate(payload: JwtPayload): Promise<{
        sub: string;
        userId: string;
        email: string;
        companyId: string;
        merchantId: string;
        role: string;
        type: string;
        shopDomain?: undefined;
    } | {
        sub: string;
        userId: string;
        email: string;
        merchantId: string;
        shopDomain: string;
        type: string;
        companyId?: undefined;
        role?: undefined;
    }>;
}
export {};
