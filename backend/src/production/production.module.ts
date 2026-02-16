import { Module } from '@nestjs/common';
import { DittofeedModule } from '../dittofeed/dittofeed.module';
import { PenpotModule } from '../penpot/penpot.module';
import { PickupModule } from '../pickup/pickup.module';
import { PrismaModule } from '../prisma/prisma.module';
import { FactoryFloorController } from './factory-floor.controller';
import { FactoryFloorService } from './factory-floor.service';
import { ProductionController } from './production.controller';
import { ProductionGateway } from './production.gateway';
import { ProductionService } from './production.service';

@Module({
  imports: [PrismaModule, DittofeedModule, PenpotModule, PickupModule],
  controllers: [ProductionController, FactoryFloorController],
  providers: [ProductionService, ProductionGateway, FactoryFloorService],
  exports: [ProductionService, ProductionGateway, FactoryFloorService],
})
export class ProductionModule {}
