import { BadRequestException, Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CatalogService } from './catalog.service';

@Controller('catalog')
@UseGuards(JwtAuthGuard)
export class CatalogController {
  constructor(private catalogService: CatalogService) {}

  @Get('products')
  async getProducts(
    @CurrentUser('merchantId') merchantId: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('vendor') vendor?: string,
    @Query('productType') productType?: string,
    @Query('inStock') inStock?: string,
    @Query('collection') collection?: string,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }

    // If collection filter is specified, use collection-specific query
    if (collection) {
      return this.catalogService.getProductsByCollection(
        merchantId,
        collection,
        (() => { const n = page ? parseInt(page, 10) : 1; return Number.isFinite(n) ? n : 1; })(),
        (() => { const n = limit ? parseInt(limit, 10) : 20; return Number.isFinite(n) ? n : 20; })(),
      );
    }

    return this.catalogService.getProducts(merchantId, {
      search,
      page: (() => { const n = page ? parseInt(page, 10) : undefined; return n !== undefined && Number.isFinite(n) ? n : undefined; })(),
      limit: (() => { const n = limit ? parseInt(limit, 10) : undefined; return n !== undefined && Number.isFinite(n) ? n : undefined; })(),
      status,
      vendor,
      productType,
      inStock: inStock === 'true' ? true : inStock === 'false' ? false : undefined,
    });
  }

  @Get('products/filters')
  async getProductFilters(
    @CurrentUser('merchantId') merchantId: string,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    return this.catalogService.getProductFilters(merchantId);
  }

  @Get('products/search')
  async searchProducts(
    @CurrentUser('merchantId') merchantId: string,
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    if (!merchantId) {
      throw new BadRequestException('Merchant ID required');
    }
    if (!query) {
      throw new BadRequestException('Search query required');
    }
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.catalogService.searchProducts(merchantId, query, Number.isFinite(parsedLimit) ? parsedLimit : 20);
  }

  @Get('products/:id')
  async getProduct(@Param('id') id: string) {
    return this.catalogService.getProduct(id);
  }

  @Get('variants/:id')
  async getVariant(@Param('id') id: string) {
    return this.catalogService.getVariant(id);
  }
}
