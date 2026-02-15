import { Module } from '@nestjs/common';
import { DittofeedModule } from '../dittofeed/dittofeed.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PenpotController } from './penpot.controller';
import { PenpotService } from './penpot.service';

@Module({
  imports: [PrismaModule, DittofeedModule],
  controllers: [PenpotController],
  providers: [PenpotService],
  exports: [PenpotService],
})
export class PenpotModule {}
