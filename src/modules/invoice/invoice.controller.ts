import {
  Controller,
  Get,
  Post,
  Patch,
  Query,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { AccessControlGuard } from '../access-control/access-control.guard';
import { TenantId } from '@/common/decorator/tenant-id.decorator';
import { CurrentUserId } from '@/common/decorator/current-user-id.decorator';
import { RequirePermission } from '../access-control/decorator/permission.decorator';
import {
  ApiCreate,
  ApiGetAll,
  ApiGetOne,
  ApiUpdate,
} from '@/common/decorator/api';
import { PaginatedResponse } from '@/common/dto/paginated-response.dto';
import { InvoiceService } from './services';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  QueryInvoiceDto,
  CreateInvoicePaymentDto,
  InvoiceResponseDto,
  InvoiceDetailResponseDto,
} from './dto';

@ApiTags('Invoice')
@Controller('invoices')
@UseGuards(AuthenticatedGuard, AccessControlGuard)
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  // ==================== CREATE ====================

  @ApiCreate('Create a new quote or invoice', {
    type: InvoiceDetailResponseDto,
  })
  @Post()
  @RequirePermission('INVOICE', 'invoice.create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() dto: CreateInvoiceDto,
  ): Promise<{ message: string; data: InvoiceDetailResponseDto }> {
    return this.invoiceService.create(tenantId, userId, dto);
  }

  // ==================== READ ====================

  @ApiGetAll('Get all invoices/quotes', { type: InvoiceResponseDto })
  @Get()
  @RequirePermission('INVOICE', 'invoice.read')
  @HttpCode(HttpStatus.OK)
  async findAll(
    @TenantId() tenantId: string,
    @Query() query: QueryInvoiceDto,
  ): Promise<PaginatedResponse<InvoiceResponseDto>> {
    return this.invoiceService.findAll(tenantId, query);
  }

  @ApiGetOne('Get invoice details', { type: InvoiceDetailResponseDto })
  @Get(':id')
  @RequirePermission('INVOICE', 'invoice.read')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ): Promise<InvoiceDetailResponseDto> {
    return this.invoiceService.findOne(tenantId, id);
  }

  // ==================== UPDATE ====================

  @ApiUpdate('Update a draft invoice', { type: InvoiceDetailResponseDto })
  @Patch(':id')
  @RequirePermission('INVOICE', 'invoice.update')
  @HttpCode(HttpStatus.OK)
  async update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ): Promise<{ message: string; data: InvoiceDetailResponseDto }> {
    return this.invoiceService.update(tenantId, id, dto);
  }

  // ==================== STATUS TRANSITIONS ====================

  @ApiUpdate('Mark invoice as sent', { type: InvoiceDetailResponseDto })
  @Post(':id/send')
  @RequirePermission('INVOICE', 'invoice.update')
  @HttpCode(HttpStatus.OK)
  async send(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ): Promise<{ message: string; data: InvoiceDetailResponseDto }> {
    return this.invoiceService.markAsSent(tenantId, id);
  }

  @ApiCreate('Convert quote to invoice', { type: InvoiceDetailResponseDto })
  @Post(':id/convert')
  @RequirePermission('INVOICE', 'invoice.create')
  @HttpCode(HttpStatus.CREATED)
  async convertToInvoice(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Param('id') quoteId: string,
  ): Promise<{ message: string; data: InvoiceDetailResponseDto }> {
    return this.invoiceService.convertToInvoice(tenantId, userId, quoteId);
  }

  @ApiCreate('Record payment against invoice', {
    type: InvoiceDetailResponseDto,
  })
  @Post(':id/payment')
  @RequirePermission('INVOICE', 'invoice.payment')
  @HttpCode(HttpStatus.OK)
  async recordPayment(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Param('id') invoiceId: string,
    @Body() dto: CreateInvoicePaymentDto,
  ): Promise<{ message: string; data: InvoiceDetailResponseDto }> {
    return this.invoiceService.recordPayment(tenantId, userId, invoiceId, dto);
  }

  @ApiUpdate('Cancel an invoice', {})
  @Post(':id/cancel')
  @RequirePermission('INVOICE', 'invoice.cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    return this.invoiceService.cancel(tenantId, id);
  }
}
