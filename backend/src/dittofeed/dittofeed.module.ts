import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CrossSellService } from './cross-sell.service';
import { DittofeedAdminService } from './dittofeed-admin.service';
import { DittofeedDbReaderService } from './dittofeed-db-reader.service';
import { DittofeedEmbeddedController } from './dittofeed-embedded.controller';
import { DittofeedController } from './dittofeed.controller';
import { DittofeedService } from './dittofeed.service';

@Module({
  imports: [PrismaModule],
  controllers: [DittofeedController, DittofeedEmbeddedController],
  providers: [DittofeedService, DittofeedAdminService, CrossSellService, DittofeedDbReaderService],
  exports: [DittofeedService, DittofeedAdminService, CrossSellService, DittofeedDbReaderService],
})
export class DittofeedModule {}
