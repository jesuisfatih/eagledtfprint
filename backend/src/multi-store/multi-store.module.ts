import { Module } from '@nestjs/common';
import { DittofeedModule } from '../dittofeed/dittofeed.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MultiStoreController } from './multi-store.controller';
import { MultiStoreService } from './multi-store.service';

@Module({
  imports: [PrismaModule, DittofeedModule],
  controllers: [MultiStoreController],
  providers: [MultiStoreService],
  exports: [MultiStoreService],
})
export class MultiStoreModule {}
