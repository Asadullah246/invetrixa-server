import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ReservationStatus } from 'generated/prisma/client';

export const RESERVATION_QUEUE = 'stock-reservation';

export interface ExpireReservationJobData {
  reservationId: string;
  tenantId: string;
}

/**
 * Processor for stock reservation queue jobs.
 * Handles auto-expiration of reservations at their scheduled time.
 */
@Injectable()
@Processor(RESERVATION_QUEUE)
export class ReservationQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(ReservationQueueProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  /**
   * Process reservation expiry job.
   * This job runs exactly when a reservation's expiresAt time is reached.
   */
  async process(job: Job<ExpireReservationJobData>): Promise<void> {
    const { reservationId, tenantId } = job.data;

    this.logger.log(`Processing reservation expiry: ${reservationId}`);

    try {
      // Find the reservation - only expire if still ACTIVE
      const reservation = await this.prisma.stockReservation.findFirst({
        where: {
          id: reservationId,
          tenantId,
          status: ReservationStatus.ACTIVE,
        },
      });

      if (!reservation) {
        this.logger.log(
          `Reservation ${reservationId} not found or already released/expired`,
        );
        return;
      }

      // Double-check expiry time (in case of clock skew)
      if (reservation.expiresAt > new Date()) {
        this.logger.warn(
          `Reservation ${reservationId} not yet expired, skipping`,
        );
        return;
      }

      // Expire the reservation and release the reserved stock
      await this.prisma.$transaction(async (tx) => {
        // Update reservation status to EXPIRED
        await tx.stockReservation.update({
          where: { id: reservationId },
          data: { status: ReservationStatus.EXPIRED },
        });

        // Decrease reserved quantity in inventory balance
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

      this.logger.log(`Reservation ${reservationId} expired successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to expire reservation ${reservationId}: ${error}`,
      );
      throw error; // Re-throw to trigger retry
    }
  }
}
