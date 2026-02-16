import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MultiStoreService } from './multi-store.service';

@Controller('multi-store')
@UseGuards(JwtAuthGuard)
export class MultiStoreController {
  constructor(private readonly multiStoreService: MultiStoreService) {}

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STORE MANAGEMENT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** List all stores */
  @Get('stores')
  async listStores() {
    return this.multiStoreService.listStores();
  }

  /** Get store config */
  @Get('stores/:merchantId/config')
  async getStoreConfig(@Param('merchantId') merchantId: string) {
    return this.multiStoreService.getStoreConfig(merchantId);
  }

  /** Onboard new store (full Dittofeed setup) */
  @Post('stores/onboard')
  async onboardStore(@Body() body: any) {
    return this.multiStoreService.onboardNewStore(body);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CROSS-STORE ANALYTICS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Cross-store analytics dashboard */
  @Get('analytics')
  async getCrossStoreAnalytics() {
    return this.multiStoreService.getCrossStoreAnalytics();
  }

  /** Cross-store customers */
  @Get('customers/cross-store')
  async getCrossStoreCustomers(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.multiStoreService.getCrossStoreCustomers(Number.isFinite(parsedLimit) ? parsedLimit : 50);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PRODUCTION LOAD BALANCING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Production load across stores */
  @Get('production/load-balance')
  async getLoadBalance() {
    return this.multiStoreService.getProductionLoadBalance();
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MOBILE FACTORY DASHBOARD
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Mobile factory floor dashboard */
  @Get('mobile/dashboard')
  async getMobileDashboard(@CurrentUser('merchantId') merchantId: string) {
    return this.multiStoreService.getMobileFactoryDashboard(merchantId);
  }
}
