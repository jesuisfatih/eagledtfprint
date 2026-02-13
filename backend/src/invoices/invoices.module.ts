import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ShopifyModule } from '../shopify/shopify.module';
import { InvoiceController } from './invoices.controller';
import { InvoiceService } from './invoices.service';

@Module({
  imports: [PrismaModule, ShopifyModule],
  providers: [InvoiceService],
  controllers: [InvoiceController],
  exports: [InvoiceService],
})
export class InvoiceModule {}
