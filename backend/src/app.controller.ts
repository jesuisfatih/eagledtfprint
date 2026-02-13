import { Controller, Get, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  @Public()
  getRoot(@Query('shop') shop: string, @Query('host') host: string, @Res() res: Response) {
    const adminUrl = this.config.get<string>('ADMIN_URL', 'https://app.eagledtfsupply.com');

    // If loaded inside Shopify admin (has host param), show embedded app page
    if (host || shop) {
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Eagle B2B Engine</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f6f6f7; color: #1a1a1a; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .container { text-align: center; padding: 48px; max-width: 480px; }
    .logo { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
    p { font-size: 15px; color: #616161; line-height: 1.6; margin-bottom: 24px; }
    .btn { display: inline-block; padding: 12px 24px; background: #007aff; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; transition: background 0.2s; }
    .btn:hover { background: #0056b3; }
    .status { margin-top: 24px; padding: 12px 16px; background: #e8f5e9; border-radius: 8px; font-size: 13px; color: #2e7d32; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">🦅</div>
    <h1>Eagle B2B Engine</h1>
    <p>Your B2B commerce engine is active and running. Manage pricing rules, company accounts, fingerprinting, and real-time visitor tracking from the admin panel.</p>
    <a href="${adminUrl}" target="_blank" class="btn">Open Admin Panel →</a>
    <div class="status">✅ Connected to ${shop || 'your Shopify store'}</div>
  </div>
</body>
</html>`;
      return res.type('html').send(html);
    }

    // Direct API access — return JSON
    return res.json({
      name: 'Eagle B2B Engine',
      version: '1.0.0',
      status: 'running',
      admin: adminUrl,
    });
  }

  @Get('health')
  @Public()
  async getHealth() {
    const checks: any = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };

    // Check database
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'ok' };
    } catch (error) {
      checks.database = { status: 'error', message: error.message };
      checks.status = 'degraded';
    }

    // Check Redis
    try {
      const client = this.redis.getClient();
      await client.ping();
      checks.redis = { status: 'ok' };
    } catch (error) {
      checks.redis = { status: 'error', message: error.message };
      checks.status = 'degraded';
    }

    return checks;
  }
}
