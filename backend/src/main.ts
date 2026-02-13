import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { AppModule } from './app.module';

// BigInt serialization fix
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Increase JSON body limit for rrweb session replay payloads (FullSnapshot can be 500KB+)
  app.use(json({ limit: '10mb' }));

  const config = app.get(ConfigService);

  // CORS handled by Caddy - removed duplicate headers to prevent '*, *' error

  // Global pipes — validate DTOs that use class-validator decorators
  // NOTE: whitelist/forbidNonWhitelisted removed because they break
  // snippet-facing endpoints that use @Body() body: any (strips all fields)
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  // API prefix — exclude root so Shopify embedded app can load at /
  app.setGlobalPrefix('api/v1', {
    exclude: ['/'],
  });

  const port = config.get<number>('PORT', 4000);
  await app.listen(port);

  logger.log(`Eagle API is running on: http://localhost:${port}/api/v1`);
}

bootstrap();
