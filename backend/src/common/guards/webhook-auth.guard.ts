import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class WebhookAuthGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const hmac = request.headers['x-shopify-hmac-sha256'];
    const body = request.body;

    if (!hmac) {
      throw new UnauthorizedException('Missing HMAC signature');
    }

    const secret = this.config.get<string>('SHOPIFY_API_SECRET') || '';
    const hash = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(body))
      .digest('base64');

    if (hash !== hmac) {
      throw new UnauthorizedException('Invalid HMAC signature');
    }

    return true;
  }
}



