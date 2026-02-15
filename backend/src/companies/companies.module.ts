import { Module, forwardRef } from '@nestjs/common';
import { ShopifyModule } from '../shopify/shopify.module';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { CompanyIntelligenceService } from './company-intelligence.service';
import { CompanyUsersController } from './company-users.controller';
import { CompanyUsersService } from './company-users.service';
import { ShopifyCompanySyncService } from './shopify-company-sync.service';

@Module({
  imports: [forwardRef(() => ShopifyModule)],
  controllers: [CompaniesController, CompanyUsersController],
  providers: [CompaniesService, CompanyUsersService, CompanyIntelligenceService, ShopifyCompanySyncService],
  exports: [CompaniesService, CompanyUsersService, CompanyIntelligenceService],
})
export class CompaniesModule {}
