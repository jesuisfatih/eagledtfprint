import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') || 'default-secret',
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.type === 'company_user') {
      const user = await this.prisma.companyUser.findUnique({
        where: { id: payload.sub },
        include: { company: true },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      return {
        sub: user.id,
        userId: user.id,
        email: user.email,
        companyId: user.companyId,
        merchantId: user.company.merchantId,
        role: user.role,
        type: 'company_user',
      };
    } else if (payload.type === 'merchant') {
      // merchantId can be in payload.merchantId or payload.sub
      const merchantId = payload.merchantId || payload.sub;
      const merchant = await this.prisma.merchant.findUnique({
        where: { id: merchantId },
      });

      if (!merchant || merchant.status !== 'active') {
        throw new UnauthorizedException('Merchant not found or inactive');
      }

      return {
        sub: merchant.id,
        userId: merchant.id,
        email: payload.email,
        merchantId: merchant.id,
        shopDomain: merchant.shopDomain,
        type: 'merchant',
      };
    }

    throw new UnauthorizedException('Invalid token type');
  }
}



