import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SaleStatus, ReservationStatus } from 'generated/prisma/client';

/**
 * Service responsible for cleaning up abandoned carts (DRAFT sales).
 *
 * Abandoned carts tie up reserved stock and database resources.
 * This service provides cleanup functionality that can be triggered:
 * - By a scheduled BullMQ repeatable job
 * - Manually via API for admin use
 */
@Injectable()
export class CartCleanupService {
  private readonly logger = new Logger(CartCleanupService.name);

  /** Maximum age for DRAFT sales before cleanup (in hours) */
  private readonly CART_MAX_AGE_HOURS = 24;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Clean up abandoned carts older than CART_MAX_AGE_HOURS.
   * Releases stock reservations and deletes stale DRAFT sales.
   */
  async cleanupAbandonedCarts(): Promise<{
    cartsDeleted: number;
    reservationsReleased: number;
  }> {
    this.logger.log('Starting abandoned cart cleanup...');

    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - this.CART_MAX_AGE_HOURS);

    // Find abandoned carts (DRAFT sales older than cutoff)
    const abandonedCarts = await this.prisma.sale.findMany({
      where: {
        status: SaleStatus.DRAFT,
        createdAt: { lt: cutoffDate },
      },
      select: { id: true, tenantId: true },
    });

    if (abandonedCarts.length === 0) {
      this.logger.log('No abandoned carts found');
      return { cartsDeleted: 0, reservationsReleased: 0 };
    }

    const cartIds = abandonedCarts.map((cart) => cart.id);
    this.logger.log(`Found ${cartIds.length} abandoned carts to clean up`);

    // Get reservations before marking them (for quantity release)
    const reservations = await this.prisma.stockReservation.findMany({
      where: {
        referenceId: { in: cartIds },
        referenceType: 'SALE',
        status: ReservationStatus.ACTIVE,
      },
      select: {
        productId: true,
        locationId: true,
        tenantId: true,
        quantity: true,
      },
    });

    // Execute cleanup in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Mark reservations as expired
      const reservationsResult = await tx.stockReservation.updateMany({
        where: {
          referenceId: { in: cartIds },
          referenceType: 'SALE',
          status: ReservationStatus.ACTIVE,
        },
        data: {
          status: ReservationStatus.EXPIRED,
        },
      });

      // Release reserved quantities from inventory balances
      await this.releaseReservedQuantities(tx, reservations);

      // Delete sale items first (explicit for clarity)
      await tx.saleItem.deleteMany({
        where: { saleId: { in: cartIds } },
      });

      // Delete the abandoned carts
      await tx.sale.deleteMany({
        where: { id: { in: cartIds } },
      });

      return reservationsResult.count;
    });

    this.logger.log(
      `Cleanup complete: ${abandonedCarts.length} carts deleted, ${result} reservations released`,
    );

    return {
      cartsDeleted: abandonedCarts.length,
      reservationsReleased: result,
    };
  }

  /**
   * Release reserved quantities for abandoned carts.
   * Decrements reservedQuantity in InventoryBalance for each product/location.
   */
  private async releaseReservedQuantities(
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
    reservations: Array<{
      productId: string;
      locationId: string;
      tenantId: string;
      quantity: number;
    }>,
  ): Promise<void> {
    // Group by product/location to batch updates
    const balanceUpdates = new Map<
      string,
      {
        productId: string;
        locationId: string;
        tenantId: string;
        quantity: number;
      }
    >();

    for (const res of reservations) {
      const key = `${res.productId}-${res.locationId}`;
      const existing = balanceUpdates.get(key);

      if (existing) {
        existing.quantity += res.quantity;
      } else {
        balanceUpdates.set(key, {
          productId: res.productId,
          locationId: res.locationId,
          tenantId: res.tenantId,
          quantity: res.quantity,
        });
      }
    }

    // Update each inventory balance
    for (const update of balanceUpdates.values()) {
      await tx.inventoryBalance.updateMany({
        where: {
          productId: update.productId,
          locationId: update.locationId,
          tenantId: update.tenantId,
        },
        data: {
          reservedQuantity: { decrement: update.quantity },
        },
      });
    }
  }
}
