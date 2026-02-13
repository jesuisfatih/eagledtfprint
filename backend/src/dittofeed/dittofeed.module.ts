import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DittofeedController } from './dittofeed.controller';
import { DittofeedService } from './dittofeed.service';

@Module({
  imports: [PrismaModule],
  controllers: [DittofeedController],
  providers: [DittofeedService],
  exports: [DittofeedService],
})
export class DittofeedModule {}
