import { Body, Controller, Get, Param, Patch, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InvoiceService } from './invoices.service';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  async create(@Req() req: any, @Body() body: any) {
    return this.invoiceService.createInvoice(req.user.merchantId, body);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/invoices',
      filename: (_req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `inv-${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (_req, file, cb) => {
      const allowed = ['.pdf', '.png', '.jpg', '.jpeg'];
      if (allowed.includes(extname(file.originalname).toLowerCase())) {
        cb(null, true);
      } else {
        cb(new Error('Only PDF, PNG, JPG files are allowed'), false);
      }
    },
  }))
  async uploadInvoice(
    @Req() req: any,
    @UploadedFile() file: any,
    @Body() body: any,
  ) {
    const fileUrl = `/uploads/invoices/${file.filename}`;

    // If invoiceId is provided, update existing invoice's fileUrl
    if (body.invoiceId) {
      return this.invoiceService.updateFileUrl(body.invoiceId, req.user.merchantId, fileUrl);
    }

    // Otherwise create a new invoice with the uploaded file
    return this.invoiceService.createInvoice(req.user.merchantId, {
      ...body,
      fileUrl,
    });
  }

  @Get('statistics')
  async getStatistics(@Req() req: any) {
    return this.invoiceService.getStatistics(req.user.merchantId);
  }

  @Get()
  async findAll(@Req() req: any, @Query() query: any) {
    return this.invoiceService.findAll(req.user.merchantId, query);
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.invoiceService.findOne(id, req.user.merchantId);
  }

  @Patch(':id/status')
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('amountPaid') amountPaid?: number,
  ) {
    return this.invoiceService.updateStatus(id, req.user.merchantId, status, amountPaid);
  }

  @Post(':id/record-payment')
  async recordPayment(
    @Req() req: any,
    @Param('id') id: string,
    @Body('amount') amount: number,
  ) {
    return this.invoiceService.recordPayment(id, req.user.merchantId, amount);
  }

  @Post(':id/duplicate')
  async duplicateInvoice(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.invoiceService.duplicateInvoice(id, req.user.merchantId);
  }

  @Post('mark-overdue')
  async markOverdue(@Req() req: any) {
    return this.invoiceService.markOverdueInvoices(req.user.merchantId);
  }
}
