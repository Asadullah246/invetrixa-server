import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma, ReservationStatus } from 'generated/prisma/client';
import { getPagination, generatePaginationMeta } from '@/common/utils';
import { SortType } from '@/common/dto/query/pagination';
import {
  CreateReservationDto,
  UpdateReservationDto,
  QueryReservationDto,
  ReservationWithRelationsResponseDto,
} from '../dto';
import { ReservationQueueService } from '../queue';

// Type for Prisma reservation with includes
type ReservationWithIncludes = Prisma.StockReservationGetPayload<{
  include: {
    product: { select: { id: true; name: true; sku: true } };
    location: { select: { id: true; name: true; code: true } };
    createdBy: {
      select: { id: true; firstName: true; lastName: true; email: true };
    };
  };
}>;

/**
 * Service for managing stock reservations.
 * Handles creation, querying, updating, and releasing of stock reservations.
 * Uses BullMQ for automatic expiry at scheduled time.
 */
@Injectable()
export class ReservationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reservationQueueService: ReservationQueueService,
  ) {}

  private readonly includeRelations = {
    product: { select: { id: true, name: true, sku: true } },
    location: { select: { id: true, name: true, code: true } },
    createdBy: {
      select: { id: true, firstName: true, lastName: true, email: true },
    },
  };

  /**
   * Format reservation response to flat structure
   */
  private formatResponse(
    reservation: ReservationWithIncludes,
  ): ReservationWithRelationsResponseDto {
    return {
      id: reservation.id,
      quantity: reservation.quantity,
      expiresAt: reservation.expiresAt,
      status: reservation.status,
      referenceType: reservation.referenceType,
      referenceId: reservation.referenceId,
      createdAt: reservation.createdAt,
      productName: reservation.product.name,
      locationName: reservation.location.name,
      createdBy: reservation.createdBy
        ? `${reservation.createdBy.firstName} ${reservation.createdBy.lastName}`
        : null,
    };
  }

  /**
   * Create a new stock reservation.
   * Validates available stock and increments reservedQuantity.
   * Schedules automatic expiry via BullMQ.
   */
  async create(
    tenantId: string,
    userId: string,
    dto: CreateReservationDto,
  ): Promise<{ message: string; data: ReservationWithRelationsResponseDto }> {
    const {
      productId,
      locationId,
      quantity,
      expiresAt,
      referenceType,
      referenceId,
    } = dto;

    // Validate product exists
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId, deletedAt: null },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Validate location exists
    const location = await this.prisma.location.findFirst({
      where: { id: locationId, tenantId },
    });
    if (!location) {
      throw new NotFoundException('Location not found');
    }

    // Check available stock (onHand - reserved)
    const balance = await this.prisma.inventoryBalance.findUnique({
      where: { productId_locationId: { productId, locationId } },
    });

    const onHand = balance?.onHandQuantity ?? 0;
    const reserved = balance?.reservedQuantity ?? 0;
    const available = onHand - reserved;

    if (available < quantity) {
      throw new BadRequestException(
        `Insufficient available stock. On-hand: ${onHand}, Reserved: ${reserved}, Available: ${available}, Requested: ${quantity}`,
      );
    }

    // Validate expiry is in the future
    const expiryDate = new Date(expiresAt);
    if (expiryDate <= new Date()) {
      throw new BadRequestException('Expiration date must be in the future');
    }

    // Create reservation and update balance atomically
    const reservation = await this.prisma.$transaction(async (tx) => {
      // Create the reservation
      const newReservation = await tx.stockReservation.create({
        data: {
          productId,
          locationId,
          tenantId,
          quantity,
          expiresAt: expiryDate,
          status: ReservationStatus.ACTIVE,
          referenceType,
          referenceId,
          createdById: userId,
        },
        include: this.includeRelations,
      });

      // Update inventory balance (use upsert to handle missing balance)
      await tx.inventoryBalance.upsert({
        where: { productId_locationId: { productId, locationId } },
        create: {
          productId,
          locationId,
          tenantId,
          onHandQuantity: 0,
          reservedQuantity: quantity,
        },
        update: {
          reservedQuantity: { increment: quantity },
        },
      });

      return newReservation;
    });

    // Schedule automatic expiry job
    await this.reservationQueueService.scheduleExpiry(
      reservation.id,
      tenantId,
      expiryDate,
    );

    return {
      message: 'Reservation created successfully',
      data: this.formatResponse(reservation),
    };
  }

  /**
   * Get all reservations with pagination and filters.
   */
  async findAll(
    tenantId: string,
    query: QueryReservationDto,
  ): Promise<{
    data: ReservationWithRelationsResponseDto[];
    meta: ReturnType<typeof generatePaginationMeta>;
  }> {
    const { paginationPrismaQuery, paginationData, filterParams } =
      getPagination(query);
    const where = this.buildFilter(tenantId, filterParams);

    // Build orderBy from query params, default to createdAt desc
    const orderBy = this.buildOrderBy(query.sortBy, query.sort);

    const [data, total] = await Promise.all([
      this.prisma.stockReservation.findMany({
        where,
        ...paginationPrismaQuery,
        orderBy,
        include: this.includeRelations,
      }),
      this.prisma.stockReservation.count({ where }),
    ]);

    return {
      meta: generatePaginationMeta({ ...paginationData, total }),
      data: data.map((r) => this.formatResponse(r)),
    };
  }

  /**
   * Get a single reservation by ID.
   */
  async findOne(
    tenantId: string,
    id: string,
  ): Promise<ReservationWithRelationsResponseDto> {
    const reservation = await this.prisma.stockReservation.findFirst({
      where: { id, tenantId },
      include: this.includeRelations,
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    return this.formatResponse(reservation);
  }

  /**
   * Update a reservation.
   * Supports updating quantity, expiry, and reference fields.
   * - Quantity changes: validates stock availability and adjusts reservedQuantity
   * - Expiry changes: reschedules the queue job
   */
  async update(
    tenantId: string,
    id: string,
    dto: UpdateReservationDto,
  ): Promise<ReservationWithRelationsResponseDto> {
    // Validate at least one field is provided
    if (
      !dto.quantity &&
      !dto.expiresAt &&
      !dto.referenceType &&
      !dto.referenceId
    ) {
      throw new BadRequestException(
        'At least one field must be provided for update',
      );
    }

    const reservation = await this.prisma.stockReservation.findFirst({
      where: { id, tenantId },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.status !== ReservationStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot update ${reservation.status.toLowerCase()} reservation`,
      );
    }

    // Prepare update data
    const updateData: {
      quantity?: number;
      expiresAt?: Date;
      referenceType?: string;
      referenceId?: string;
    } = {};

    // Handle expiry update
    let newExpiryDate: Date | undefined;
    if (dto.expiresAt) {
      newExpiryDate = new Date(dto.expiresAt);
      if (newExpiryDate <= new Date()) {
        throw new BadRequestException('Expiration date must be in the future');
      }
      updateData.expiresAt = newExpiryDate;
    }

    // Handle reference field updates
    if (dto.referenceType !== undefined) {
      updateData.referenceType = dto.referenceType;
    }
    if (dto.referenceId !== undefined) {
      updateData.referenceId = dto.referenceId;
    }

    // Handle quantity update with stock validation
    const quantityDiff =
      dto.quantity !== undefined ? dto.quantity - reservation.quantity : 0;

    if (dto.quantity !== undefined) {
      updateData.quantity = dto.quantity;
    }

    // Execute update in transaction for atomic quantity + balance changes
    const updated = await this.prisma.$transaction(async (tx) => {
      // If increasing quantity, validate available stock
      if (quantityDiff > 0) {
        const balance = await tx.inventoryBalance.findUnique({
          where: {
            productId_locationId: {
              productId: reservation.productId,
              locationId: reservation.locationId,
            },
          },
        });

        const onHand = balance?.onHandQuantity ?? 0;
        const reserved = balance?.reservedQuantity ?? 0;
        const available = onHand - reserved;

        if (available < quantityDiff) {
          throw new BadRequestException(
            `Insufficient available stock. Available: ${available}, Additional requested: ${quantityDiff}`,
          );
        }
      }

      // Update the reservation
      const updatedReservation = await tx.stockReservation.update({
        where: { id },
        data: updateData,
        include: this.includeRelations,
      });

      // Adjust reserved quantity if quantity changed
      if (quantityDiff !== 0) {
        await tx.inventoryBalance.update({
          where: {
            productId_locationId: {
              productId: reservation.productId,
              locationId: reservation.locationId,
            },
          },
          data: { reservedQuantity: { increment: quantityDiff } },
        });
      }

      return updatedReservation;
    });

    // Reschedule expiry job only if expiry date changed
    if (newExpiryDate) {
      await this.reservationQueueService.rescheduleExpiry(
        id,
        tenantId,
        newExpiryDate,
      );
    }

    return this.formatResponse(updated);
  }

  /**
   * Release a reservation (decrease reservedQuantity).
   * Cancels the scheduled expiry job.
   */
  async release(tenantId: string, id: string): Promise<void> {
    const reservation = await this.prisma.stockReservation.findFirst({
      where: { id, tenantId },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.status !== ReservationStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot release ${reservation.status.toLowerCase()} reservation`,
      );
    }

    // Release reservation and update balance atomically
    await this.prisma.$transaction(async (tx) => {
      // Update reservation status
      await tx.stockReservation.update({
        where: { id },
        data: { status: ReservationStatus.RELEASED },
      });

      // Decrease reserved quantity
      await tx.inventoryBalance.update({
        where: {
          productId_locationId: {
            productId: reservation.productId,
            locationId: reservation.locationId,
          },
        },
        data: { reservedQuantity: { decrement: reservation.quantity } },
      });
    });

    // Cancel the scheduled expiry job
    await this.reservationQueueService.cancelExpiry(id);
  }

  /**
   * Build filter for reservation queries.
   */
  private buildFilter(
    tenantId: string,
    filterParams: Partial<QueryReservationDto>,
  ): Prisma.StockReservationWhereInput {
    const conditions: Prisma.StockReservationWhereInput[] = [{ tenantId }];

    if (filterParams.productId) {
      conditions.push({ productId: filterParams.productId });
    }
    if (filterParams.locationId) {
      conditions.push({ locationId: filterParams.locationId });
    }
    if (filterParams.status) {
      conditions.push({ status: filterParams.status });
    }
    if (filterParams.referenceType) {
      conditions.push({ referenceType: filterParams.referenceType });
    }

    return { AND: conditions };
  }

  /**
   * Build orderBy clause from query params.
   */
  private buildOrderBy(
    sortBy?: string,
    sort?: SortType,
  ): Prisma.StockReservationOrderByWithRelationInput {
    const validSortFields = ['createdAt', 'expiresAt', 'quantity', 'status'];

    const field = validSortFields.includes(sortBy ?? '')
      ? sortBy!
      : 'createdAt';
    const direction = sort ?? SortType.DESC;

    return { [field]: direction };
  }
}
