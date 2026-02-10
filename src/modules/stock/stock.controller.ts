import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { PricingMethod, StockReferenceType } from 'generated/prisma/client';

import {
  MovementService,
  BalanceService,
  TransferService,
  ReservationService,
} from './services';
import {
  QueryMovementDto,
  QueryBalanceDto,
  QueryLowStockDto,
  MovementWithRelationsResponseDto,
  MovementDetailResponseDto,
  BalanceWithRelationsResponseDto,
  ProductBalanceSummaryDto,
  LocationBalanceSummaryDto,
  LowStockItemDto,
  ValuationReportDto,
  CreateTransferDto,
  ShipTransferDto,
  ReceiveTransferDto,
  QueryTransferDto,
  CreateTransferResponseDto,
  TransferWithRelationsResponseDto,
  TransferDetailResponseDto,
  BulkStockInDto,
  BulkStockInResponseDto,
  BulkStockOutDto,
  BulkStockOutResponseDto,
  BulkStockAdjustDto,
  BulkStockAdjustResponseDto,
  CreateReservationDto,
  UpdateReservationDto,
  QueryReservationDto,
  ReservationWithRelationsResponseDto,
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
import { ValuationQueryDto } from './dto/balance/valuation-query.dto';

@ApiTags('Stock')
@Controller('stocks')
@UseGuards(AuthenticatedGuard, AccessControlGuard)
export class StockController {
  constructor(
    private readonly movementService: MovementService,
    private readonly balanceService: BalanceService,
    private readonly transferService: TransferService,
    private readonly reservationService: ReservationService,
  ) {}

  // ==================== STOCK MOVEMENT ENDPOINTS ====================

  @ApiCreate('Receive stock (single or multiple products)', {
    type: BulkStockInResponseDto,
  })
  @Post('in')
  @RequirePermission('Stock', 'stock.movement.create')
  @HttpCode(HttpStatus.CREATED)
  async stockIn(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() dto: BulkStockInDto,
  ): Promise<BulkStockInResponseDto> {
    return this.movementService.stockIn(tenantId, userId, dto);
  }

  // hide from swagger this api
  @ApiExcludeEndpoint()
  @ApiCreate('Remove stock (single or multiple products)', {
    type: BulkStockOutResponseDto,
    additionalResponses: [{ status: 400, description: 'Insufficient stock' }],
  })
  @Post('out')
  @RequirePermission('Stock', 'stock.movement.create')
  @HttpCode(HttpStatus.CREATED)
  async stockOut(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() dto: BulkStockOutDto,
  ): Promise<BulkStockOutResponseDto> {
    return this.movementService.stockOut(tenantId, userId, dto);
  }

  @ApiCreate('Customer return (increases stock)', {
    type: BulkStockInResponseDto,
  })
  @Post('return')
  @RequirePermission('Stock', 'stock.movement.create')
  @HttpCode(HttpStatus.CREATED)
  async stockReturn(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() dto: BulkStockInDto,
  ): Promise<BulkStockInResponseDto> {
    // Force reference type to RETURN for customer returns
    return this.movementService.stockIn(tenantId, userId, {
      ...dto,
      referenceType: StockReferenceType.RETURN,
    });
  }

  @ApiCreate('Manual stock adjustment (multiple products, +/- quantity)', {
    type: BulkStockAdjustResponseDto,
    additionalResponses: [
      {
        status: 400,
        description: 'Insufficient stock for negative adjustment',
      },
    ],
  })
  @Post('adjust')
  @RequirePermission('Stock', 'stock.movement.create')
  @HttpCode(HttpStatus.CREATED)
  async adjust(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() dto: BulkStockAdjustDto,
  ): Promise<BulkStockAdjustResponseDto> {
    return this.movementService.adjust(tenantId, userId, dto);
  }

  @ApiGetAll('Get all stock movements with filters', {
    type: MovementWithRelationsResponseDto,
  })
  @Get('movements')
  @RequirePermission('Inventory', 'stock.view')
  @HttpCode(HttpStatus.OK)
  async findAllMovements(
    @TenantId() tenantId: string,
    @Query() query: QueryMovementDto,
  ): Promise<PaginatedResponse<MovementWithRelationsResponseDto>> {
    return this.movementService.findAll(tenantId, query);
  }

  @ApiGetOne('Get single stock movement by ID', {
    type: MovementDetailResponseDto,
  })
  @Get('movements/:id')
  @RequirePermission('Inventory', 'stock.view')
  @HttpCode(HttpStatus.OK)
  async findOneMovement(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ): Promise<MovementDetailResponseDto> {
    return this.movementService.findOne(tenantId, id);
  }

  // ==================== INVENTORY BALANCE ENDPOINTS ====================

  @ApiGetAll('Get all inventory balances with filters', {
    type: BalanceWithRelationsResponseDto,
  })
  @Get('balance')
  @RequirePermission('Inventory', 'stock.view')
  @HttpCode(HttpStatus.OK)
  async findAllBalances(
    @TenantId() tenantId: string,
    @Query() query: QueryBalanceDto,
  ): Promise<PaginatedResponse<BalanceWithRelationsResponseDto>> {
    return this.balanceService.findAll(tenantId, query);
  }

  @ApiGetOne('Get stock balance for a specific product', {
    type: ProductBalanceSummaryDto,
  })
  @Get('balance/products/:id')
  @RequirePermission('Inventory', 'stock.view')
  @HttpCode(HttpStatus.OK)
  async findBalanceByProduct(
    @TenantId() tenantId: string,
    @Param('id') productId: string,
  ): Promise<ProductBalanceSummaryDto> {
    return this.balanceService.findByProduct(tenantId, productId);
  }

  @ApiGetOne('Get stock balance for a specific location', {
    type: LocationBalanceSummaryDto,
  })
  @Get('balance/locations/:id')
  @RequirePermission('Inventory', 'stock.view')
  @HttpCode(HttpStatus.OK)
  async findBalanceByLocation(
    @TenantId() tenantId: string,
    @Param('id') locationId: string,
  ): Promise<LocationBalanceSummaryDto> {
    return this.balanceService.findByLocation(tenantId, locationId);
  }

  @ApiGetAll('Get products below reorder level', {
    type: LowStockItemDto,
  })
  @Get('low-stock')
  @RequirePermission('Inventory', 'stock.view')
  @HttpCode(HttpStatus.OK)
  async findLowStock(
    @TenantId() tenantId: string,
    @Query() query: QueryLowStockDto,
  ): Promise<PaginatedResponse<LowStockItemDto>> {
    return this.balanceService.findLowStock(tenantId, query);
  }

  @ApiExcludeEndpoint()
  @ApiGetOne('Get inventory valuation report', {
    type: ValuationReportDto,
  })
  @Get('valuation')
  @RequirePermission('Inventory', 'stock.view')
  @HttpCode(HttpStatus.OK)
  async getValuation(
    @TenantId() tenantId: string,
    @Query() query: ValuationQueryDto,
  ): Promise<ValuationReportDto> {
    const method = query.method ?? PricingMethod.FIFO;
    return this.balanceService.getValuation(tenantId, method);
  }

  // ==================== STOCK TRANSFER ENDPOINTS ====================

  @ApiCreate('Create a new stock transfer (DRAFT)', {
    type: CreateTransferResponseDto,
  })
  @Post('transfers')
  @RequirePermission('Inventory', 'transfer.create')
  @HttpCode(HttpStatus.CREATED)
  async createTransfer(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() dto: CreateTransferDto,
  ): Promise<{ message: string; data: CreateTransferResponseDto }> {
    return this.transferService.create(tenantId, userId, dto);
  }

  @ApiGetAll('Get all transfers with filters', {
    type: TransferWithRelationsResponseDto,
  })
  @Get('transfers')
  @RequirePermission('Inventory', 'transfer.view')
  @HttpCode(HttpStatus.OK)
  async findAllTransfers(
    @TenantId() tenantId: string,
    @Query() query: QueryTransferDto,
  ): Promise<PaginatedResponse<TransferWithRelationsResponseDto>> {
    return this.transferService.findAll(tenantId, query);
  }

  @ApiGetOne('Get single transfer by ID', {
    type: TransferDetailResponseDto,
  })
  @Get('transfers/:id')
  @RequirePermission('Inventory', 'transfer.view')
  @HttpCode(HttpStatus.OK)
  async findOneTransfer(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ): Promise<TransferDetailResponseDto> {
    return this.transferService.findOne(tenantId, id);
  }

  @ApiUpdate('Ship transfer (DRAFT → IN_TRANSIT)')
  @Patch('transfers/:id/ship')
  @RequirePermission('Inventory', 'transfer.ship')
  @HttpCode(HttpStatus.OK)
  async shipTransfer(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto?: ShipTransferDto,
  ): Promise<{ message: string }> {
    return this.transferService.ship(tenantId, userId, id, dto);
  }

  @ApiUpdate('Receive transfer (IN_TRANSIT → COMPLETED)')
  @Patch('transfers/:id/receive')
  @RequirePermission('Inventory', 'transfer.receive')
  @HttpCode(HttpStatus.OK)
  async receiveTransfer(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: ReceiveTransferDto,
  ): Promise<{ message: string }> {
    return this.transferService.receive(tenantId, userId, id, dto);
  }

  @ApiUpdate('Cancel transfer')
  @Patch('transfers/:id/cancel')
  @RequirePermission('Inventory', 'transfer.cancel')
  @HttpCode(HttpStatus.OK)
  async cancelTransfer(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    return this.transferService.cancel(tenantId, userId, id);
  }

  // ==================== STOCK RESERVATION ENDPOINTS ====================

  @ApiCreate('Create a stock reservation', {
    type: ReservationWithRelationsResponseDto,
    additionalResponses: [
      { status: 400, description: 'Insufficient available stock' },
    ],
  })
  @Post('reservations')
  @RequirePermission('Inventory', 'reservation.create')
  @HttpCode(HttpStatus.CREATED)
  async createReservation(
    @TenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() dto: CreateReservationDto,
  ): Promise<{ message: string; data: ReservationWithRelationsResponseDto }> {
    return this.reservationService.create(tenantId, userId, dto);
  }

  @ApiGetAll('Get all reservations with filters', {
    type: ReservationWithRelationsResponseDto,
  })
  @Get('reservations')
  @RequirePermission('Inventory', 'reservation.view')
  @HttpCode(HttpStatus.OK)
  async findAllReservations(
    @TenantId() tenantId: string,
    @Query() query: QueryReservationDto,
  ): Promise<PaginatedResponse<ReservationWithRelationsResponseDto>> {
    return this.reservationService.findAll(tenantId, query);
  }

  @ApiGetOne('Get single reservation by ID', {
    type: ReservationWithRelationsResponseDto,
  })
  @Get('reservations/:id')
  @RequirePermission('Inventory', 'reservation.view')
  @HttpCode(HttpStatus.OK)
  async findOneReservation(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ): Promise<ReservationWithRelationsResponseDto> {
    return this.reservationService.findOne(tenantId, id);
  }

  @ApiUpdate('Update reservation (quantity, expiry, reference)', {
    type: ReservationWithRelationsResponseDto,
  })
  @Patch('reservations/:id')
  @RequirePermission('Inventory', 'reservation.update')
  @HttpCode(HttpStatus.OK)
  async updateReservation(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateReservationDto,
  ): Promise<ReservationWithRelationsResponseDto> {
    return this.reservationService.update(tenantId, id, dto);
  }

  @ApiDelete('Release reservation (free up reserved stock)')
  @Delete('reservations/:id')
  @RequirePermission('Inventory', 'reservation.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async releaseReservation(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.reservationService.release(tenantId, id);
  }
}
