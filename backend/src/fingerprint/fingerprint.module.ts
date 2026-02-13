import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FingerprintController } from './fingerprint.controller';
import { FingerprintService } from './fingerprint.service';

@Module({
  imports: [PrismaModule],
  controllers: [FingerprintController],
  providers: [FingerprintService],
  exports: [FingerprintService],
})
export class FingerprintModule {}
