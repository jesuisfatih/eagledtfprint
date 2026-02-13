import { Module, forwardRef } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { CompanyUsersService } from './company-users.service';
import { CompanyUsersController } from './company-users.controller';
import { ShopifyCompanySyncService } from './shopify-company-sync.service';
import { ShopifyModule } from '../shopify/shopify.module';

@Module({
  imports: [forwardRef(() => ShopifyModule)],
  controllers: [CompaniesController, CompanyUsersController],
  providers: [CompaniesService, CompanyUsersService, ShopifyCompanySyncService],
  exports: [CompaniesService, CompanyUsersService],
})
export class CompaniesModule {}




