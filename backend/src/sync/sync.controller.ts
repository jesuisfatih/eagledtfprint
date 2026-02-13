import { BadRequestException, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { SyncEntityType } from './sync-state.service';
import { SyncService } from './sync.service';

@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private syncService: SyncService) {}

  @Post('initial')
  async triggerInitialSync(@CurrentUser('merchantId') merchantId: string) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.syncService.triggerInitialSync(merchantId);
  }

  @Post('customers')
  async triggerCustomersSync(@CurrentUser('merchantId') merchantId: string) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.syncService.triggerCustomersSync(merchantId);
  }

  @Post('products')
  async triggerProductsSync(@CurrentUser('merchantId') merchantId: string) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.syncService.triggerProductsSync(merchantId);
  }

  @Post('orders')
  async triggerOrdersSync(@CurrentUser('merchantId') merchantId: string) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.syncService.triggerOrdersSync(merchantId);
  }

  @Get('status')
  async getSyncStatus(@CurrentUser('merchantId') merchantId: string) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.syncService.getSyncStatus(merchantId);
  }

  /**
   * Reset a specific entity sync (clears failures, re-enables sync).
   */
  @Post('reset/:entityType')
  async resetEntitySync(
    @CurrentUser('merchantId') merchantId: string,
    @Param('entityType') entityType: string,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }

    const validTypes: SyncEntityType[] = ['customers', 'products', 'orders'];
    if (!validTypes.includes(entityType as SyncEntityType)) {
      throw new BadRequestException(`Invalid entity type. Must be one of: ${validTypes.join(', ')}`);
    }

    return this.syncService.resetEntitySync(merchantId, entityType as SyncEntityType);
  }

  /**
   * Reset ALL sync states for full re-sync.
   */
  @Post('reset-all')
  async resetAllSync(@CurrentUser('merchantId') merchantId: string) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.syncService.resetAllSync(merchantId);
  }
}
