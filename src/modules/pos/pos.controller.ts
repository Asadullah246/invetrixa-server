import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';

import {
  TerminalService,
  SessionService,
  SaleService,
  CartService,
  RefundService,
  ReportingService,
} from './services';
import {
  CreateTerminalDto,
  UpdateTerminalDto,
  QueryTerminalDto,
  TerminalResponseDto,
  TerminalWithLocationResponseDto,
  OpenSessionDto,
  CloseSessionDto,
  QuerySessionDto,
  SessionResponseDto,
  SessionDetailResponseDto,
  CreateCartDto,
  AddCartItemDto,
  UpdateCartItemDto,
  CartResponseDto,
  CompleteSaleDto,
  CreateSaleDto,
  QuerySaleDto,
  SaleResponseDto,
  SaleDetailResponseDto,
  CreateRefundDto,
  RefundResponseDto,
} from './dto';

import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { AccessControlGuard } from '../access-control/access-control.guard';
import { RequirePermission } from '../access-control/decorator/permission.decorator';
import {
  ApiCreate,
  ApiGetAll,
  ApiGetOne,
  ApiUpdate,
  ApiDelete,
} from '@/common/decorator/api';
import { PaginatedResponse } from '@/common/dto/paginated-response.dto';
import { TenantId } from '@/common/decorator/tenant-id.decorator';
import { CurrentUserId } from '@/common/decorator/current-user-id.decorator';

@ApiTags('POS')
@Controller('pos')
@UseGuards(AuthenticatedGuard, AccessControlGuard)
export class POSController {
  constructor(
    private readonly terminalService: TerminalService,
    private readonly sessionService: SessionService,
    private readonly saleService: SaleService,
    private readonly cartService: CartService,
    private readonly refundService: RefundService,
    private readonly reportingService: ReportingService,
  ) {}

  // ==================== TERMINAL ENDPOINTS ====================

  @ApiExcludeEndpoint()
  @ApiCreate('Create a new POS terminal', {
    type: TerminalWithLocationResponseDto,
  })
  @Post('terminals')
  @RequirePermission('POS', 'pos.terminal.create')
  @HttpCode(HttpStatus.CREATED)
  async createTerminal(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() dto: CreateTerminalDto,
  ): Promise<{ message: string; data: TerminalWithLocationResponseDto }> {
    return this.terminalService.create(tenantId, userId, dto);
  }

  @ApiExcludeEndpoint()
  @ApiGetAll('Get all POS terminals with filters', {
    type: TerminalWithLocationResponseDto,
  })
  @Get('terminals')
  @RequirePermission('POS', 'pos.terminal.view')
  @HttpCode(HttpStatus.OK)
  async findAllTerminals(
    @TenantId() tenantId: string,
    @Query() query: QueryTerminalDto,
  ): Promise<PaginatedResponse<TerminalWithLocationResponseDto>> {
    return this.terminalService.findAll(tenantId, query);
  }

  @ApiExcludeEndpoint()
  @ApiGetOne('Get active terminals for a location', {
    type: TerminalResponseDto,
  })
  @Get('terminals/location/:locationId')
  @RequirePermission('POS', 'pos.terminal.view')
  @HttpCode(HttpStatus.OK)
  async getTerminalsByLocation(
    @TenantId() tenantId: string,
    @Param('locationId') locationId: string,
  ): Promise<TerminalResponseDto[]> {
    return this.terminalService.getActiveByLocation(tenantId, locationId);
  }

  @ApiExcludeEndpoint()
  @ApiGetOne('Get a single POS terminal', {
    type: TerminalWithLocationResponseDto,
  })
  @Get('terminals/:id')
  @RequirePermission('POS', 'pos.terminal.view')
  @HttpCode(HttpStatus.OK)
  async findOneTerminal(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ): Promise<TerminalWithLocationResponseDto> {
    return this.terminalService.findOne(tenantId, id);
  }

  @ApiExcludeEndpoint()
  @ApiUpdate('Update a POS terminal', { type: TerminalWithLocationResponseDto })
  @Patch('terminals/:id')
  @RequirePermission('POS', 'pos.terminal.update')
  @HttpCode(HttpStatus.OK)
  async updateTerminal(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTerminalDto,
  ): Promise<{ message: string; data: TerminalWithLocationResponseDto }> {
    return this.terminalService.update(tenantId, id, dto);
  }

  @ApiExcludeEndpoint()
  @ApiDelete('Delete a POS terminal (soft delete)')
  @Delete('terminals/:id')
  @RequirePermission('POS', 'pos.terminal.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeTerminal(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.terminalService.remove(tenantId, id);
  }

  // ==================== SESSION ENDPOINTS ====================

  @ApiExcludeEndpoint()
  @ApiCreate('Open a new POS session', { type: SessionResponseDto })
  @Post('sessions')
  @RequirePermission('POS', 'pos.session.open')
  @HttpCode(HttpStatus.CREATED)
  async openSession(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() dto: OpenSessionDto,
  ): Promise<{ message: string; data: SessionResponseDto }> {
    return this.sessionService.open(tenantId, userId, dto);
  }

  @ApiExcludeEndpoint()
  @ApiGetAll('Get all POS sessions with filters', { type: SessionResponseDto })
  @Get('sessions')
  @RequirePermission('POS', 'pos.session.view')
  @HttpCode(HttpStatus.OK)
  async findAllSessions(
    @TenantId() tenantId: string,
    @Query() query: QuerySessionDto,
  ): Promise<PaginatedResponse<SessionResponseDto>> {
    return this.sessionService.findAll(tenantId, query);
  }

  @ApiExcludeEndpoint()
  @ApiGetOne('Get current open session for a terminal', {
    type: SessionResponseDto,
  })
  @Get('sessions/terminal/:terminalId/current')
  @RequirePermission('POS', 'pos.session.view')
  @HttpCode(HttpStatus.OK)
  async getCurrentSession(
    @TenantId() tenantId: string,
    @Param('terminalId') terminalId: string,
  ): Promise<SessionResponseDto | null> {
    return this.sessionService.getOpenSession(tenantId, terminalId);
  }

  @ApiExcludeEndpoint()
  @ApiGetOne('Get a single POS session', { type: SessionDetailResponseDto })
  @Get('sessions/:id')
  @RequirePermission('POS', 'pos.session.view')
  @HttpCode(HttpStatus.OK)
  async findOneSession(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ): Promise<SessionDetailResponseDto> {
    return this.sessionService.findOne(tenantId, id);
  }

  @ApiExcludeEndpoint()
  @ApiUpdate('Close a POS session with reconciliation', {
    type: SessionDetailResponseDto,
  })
  @Patch('sessions/:id/close')
  @RequirePermission('POS', 'pos.session.close')
  @HttpCode(HttpStatus.OK)
  async closeSession(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: CloseSessionDto,
  ): Promise<{ message: string; data: SessionDetailResponseDto }> {
    return this.sessionService.close(tenantId, userId, id, dto);
  }

  // ==================== CART ENDPOINTS ====================

  @ApiCreate('Create a new cart (draft sale)', { type: CartResponseDto })
  @Post('cart')
  @RequirePermission('POS', 'pos.sale.create')
  @HttpCode(HttpStatus.CREATED)
  async createCart(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() dto: CreateCartDto,
  ): Promise<{ message: string; data: CartResponseDto }> {
    return this.cartService.createCart(tenantId, userId, dto);
  }

  @ApiUpdate('Add item to cart', { type: CartResponseDto })
  @Post('cart/:id/items')
  @RequirePermission('POS', 'pos.sale.create')
  @HttpCode(HttpStatus.OK)
  async addItemToCart(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Param('id') cartId: string,
    @Body() dto: AddCartItemDto,
  ): Promise<CartResponseDto> {
    return this.cartService.addItem(tenantId, userId, cartId, dto);
  }

  @ApiUpdate('Update cart item quantity', { type: CartResponseDto })
  @Patch('cart/:id/items/:itemId')
  @RequirePermission('POS', 'pos.sale.create')
  @HttpCode(HttpStatus.OK)
  async updateCartItem(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Param('id') cartId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    return this.cartService.updateItem(tenantId, userId, cartId, itemId, dto);
  }

  @ApiDelete('Remove item from cart')
  @Delete('cart/:id/items/:itemId')
  @RequirePermission('POS', 'pos.sale.create')
  @HttpCode(HttpStatus.OK)
  async removeCartItem(
    @TenantId() tenantId: string,
    @Param('id') cartId: string,
    @Param('itemId') itemId: string,
  ): Promise<CartResponseDto> {
    return this.cartService.removeItem(tenantId, cartId, itemId);
  }

  @ApiGetOne('Get cart details', { type: CartResponseDto })
  @Get('cart/:id')
  @RequirePermission('POS', 'pos.sale.read')
  @HttpCode(HttpStatus.OK)
  async getCart(
    @TenantId() tenantId: string,
    @Param('id') cartId: string,
  ): Promise<CartResponseDto> {
    return this.cartService.getCart(tenantId, cartId);
  }

  // ==================== SALE ENDPOINTS ====================

  /**
   * Quick Sale - One-shot sale creation with items and payment.
   * Useful for barcode scan → instant checkout scenarios.
   * Bypasses the cart flow entirely.
   */
  @ApiCreate('Create a quick sale (one-shot)', { type: SaleDetailResponseDto })
  @Post('sales/quick')
  @RequirePermission('POS', 'pos.sale.create')
  @HttpCode(HttpStatus.CREATED)
  async quickSale(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() dto: CreateSaleDto,
  ): Promise<{ message: string; data: SaleDetailResponseDto }> {
    return this.saleService.create(tenantId, userId, dto);
  }

  @ApiCreate('Complete a sale', { type: SaleDetailResponseDto })
  @Post('sales/:id/complete')
  @RequirePermission('POS', 'pos.sale.create')
  @HttpCode(HttpStatus.OK)
  async completeSale(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Param('id') saleId: string,
    @Body() dto: CompleteSaleDto,
  ): Promise<{ message: string; data: SaleDetailResponseDto }> {
    return this.saleService.complete(tenantId, userId, saleId, dto);
  }

  @ApiGetAll('Get all sales', { type: SaleResponseDto })
  @Get('sales')
  @RequirePermission('POS', 'pos.sale.read')
  @HttpCode(HttpStatus.OK)
  async findAllSales(
    @TenantId() tenantId: string,
    @Query() query: QuerySaleDto,
  ): Promise<PaginatedResponse<SaleResponseDto>> {
    return this.saleService.findAll(tenantId, query);
  }

  @ApiGetOne('Get sale details', { type: SaleDetailResponseDto })
  @Get('sales/:id')
  @RequirePermission('POS', 'pos.sale.read')
  @HttpCode(HttpStatus.OK)
  async findOneSale(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ): Promise<SaleDetailResponseDto> {
    return this.saleService.findOne(tenantId, id);
  }

  @ApiUpdate('Void a completed sale', { type: SaleDetailResponseDto })
  @Post('sales/:id/void')
  @RequirePermission('POS', 'pos.sale.void')
  @HttpCode(HttpStatus.OK)
  async voidSale(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ): Promise<{ message: string }> {
    return this.saleService.void(tenantId, userId, id, reason);
  }

  @ApiCreate('Refund a completed sale', { type: RefundResponseDto })
  @Post('sales/:id/refund')
  @RequirePermission('POS', 'pos.sale.refund') // Ensure this permission exists in AccessControl
  @HttpCode(HttpStatus.CREATED)
  async refundSale(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: CreateRefundDto,
  ): Promise<{ message: string; data: RefundResponseDto }> {
    return this.refundService.createRefund(tenantId, userId, id, dto);
  }

  // ==================== REPORTING ENDPOINTS ====================
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  @ApiOperation({ summary: 'Get daily sales summary' })
  @ApiResponse({ status: 200, description: 'Summary retrieved successfully' })
  @Get('reports/daily-summary')
  @RequirePermission('POS', 'pos.report.view') // Ensure access control
  async getDailySummary(
    @TenantId() tenantId: string,
    @Query('locationId') locationId: string,
    @Query('date') date: string,
  ) {
    // Basic validation
    if (!locationId || !date) {
      // Allow controller to handle validation via DTO usually, or manual check here
      // Ideally use a DTO with class-validator
    }

    // Default to today if no date? Or require date.
    const queryDate = date || new Date().toISOString().split('T')[0];

    const summary = await this.reportingService.getDailySummary(
      tenantId,
      locationId,
      queryDate,
    );
    return {
      data: summary || {
        // Return empty structure if no summary exists yet
        date: queryDate,
        totalSales: 0,
        totalRevenue: 0,
        // ... explicit zeros or just null
      },
    };
  }
}
