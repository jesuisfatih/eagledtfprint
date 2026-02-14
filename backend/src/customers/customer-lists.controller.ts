import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CustomerListsService } from './customer-lists.service';

@Controller('customer-lists')
@UseGuards(JwtAuthGuard)
export class CustomerListsController {
  constructor(private readonly listsService: CustomerListsService) {}

  // GET all lists (system + custom)
  @Get()
  async findAll(@CurrentUser('merchantId') merchantId: string) {
    if (!merchantId) throw new BadRequestException('Merchant ID required');
    return this.listsService.findAllLists(merchantId);
  }

  // GET smart alarm summary for dashboard
  @Get('alarms/summary')
  async getAlarmSummary(@CurrentUser('merchantId') merchantId: string) {
    if (!merchantId) throw new BadRequestException('Merchant ID required');
    return this.listsService.getAlarmSummary(merchantId);
  }

  // POST generate/refresh smart alarms
  @Post('alarms/generate')
  async generateAlarms(@CurrentUser('merchantId') merchantId: string) {
    if (!merchantId) throw new BadRequestException('Merchant ID required');
    return this.listsService.generateSmartAlarms(merchantId);
  }

  // POST create custom list
  @Post()
  async createList(
    @CurrentUser('merchantId') merchantId: string,
    @Body() body: { name: string; description?: string; color?: string; icon?: string },
  ) {
    if (!merchantId) throw new BadRequestException('Merchant ID required');
    if (!body.name) throw new BadRequestException('List name required');
    return this.listsService.createList(merchantId, body);
  }

  // GET list with customers
  @Get(':id')
  async getList(@CurrentUser('merchantId') merchantId: string, @Param('id') id: string) {
    if (!merchantId) throw new BadRequestException('Merchant ID required');
    return this.listsService.getListWithCustomers(id, merchantId);
  }

  // PATCH update list
  @Patch(':id')
  async updateList(
    @CurrentUser('merchantId') merchantId: string,
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; color?: string; icon?: string },
  ) {
    if (!merchantId) throw new BadRequestException('Merchant ID required');
    return this.listsService.updateList(id, merchantId, body);
  }

  // DELETE list (custom only)
  @Delete(':id')
  async deleteList(@CurrentUser('merchantId') merchantId: string, @Param('id') id: string) {
    if (!merchantId) throw new BadRequestException('Merchant ID required');
    return this.listsService.deleteList(id, merchantId);
  }

  // POST add customers to list
  @Post(':id/customers')
  async addCustomers(
    @CurrentUser('merchantId') merchantId: string,
    @Param('id') id: string,
    @Body() body: { customerIds: string[]; notes?: string },
  ) {
    if (!merchantId) throw new BadRequestException('Merchant ID required');
    if (!body.customerIds?.length) throw new BadRequestException('Customer IDs required');
    return this.listsService.addCustomersToList(id, merchantId, body.customerIds, body.notes);
  }

  // DELETE remove customers from list
  @Delete(':id/customers')
  async removeCustomers(
    @CurrentUser('merchantId') merchantId: string,
    @Param('id') id: string,
    @Body() body: { customerIds: string[] },
  ) {
    if (!merchantId) throw new BadRequestException('Merchant ID required');
    return this.listsService.removeCustomersFromList(id, merchantId, body.customerIds);
  }

  // PATCH update item note
  @Patch('items/:itemId/note')
  async updateItemNote(
    @Param('itemId') itemId: string,
    @Body('notes') notes: string,
  ) {
    return this.listsService.updateItemNote(itemId, notes);
  }
}
