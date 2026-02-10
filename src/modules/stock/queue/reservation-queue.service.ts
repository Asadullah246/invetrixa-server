import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  RESERVATION_QUEUE,
  ExpireReservationJobData,
} from './reservation-queue.processor';

/**
 * Service for managing reservation queue jobs.
 * Provides methods to schedule and cancel reservation expiry jobs.
 */
@Injectable()
export class ReservationQueueService {
  private readonly logger = new Logger(ReservationQueueService.name);

  constructor(
    @InjectQueue(RESERVATION_QUEUE)
    private readonly reservationQueue: Queue<ExpireReservationJobData>,
  ) {}

  /**
   * Schedule a reservation to expire at its expiresAt time.
   * Creates a delayed job that runs exactly when the reservation should expire.
   */
  async scheduleExpiry(
    reservationId: string,
    tenantId: string,
    expiresAt: Date,
  ): Promise<void> {
    const delay = expiresAt.getTime() - Date.now();

    if (delay <= 0) {
      this.logger.warn(
        `Reservation ${reservationId} already expired, processing immediately`,
      );
    }

    await this.reservationQueue.add(
      'expire',
      { reservationId, tenantId },
      {
        delay: Math.max(0, delay), // Ensure non-negative delay
        jobId: `expire-${reservationId}`, // Unique ID prevents duplicates
        removeOnComplete: true,
        removeOnFail: false, // Keep failed jobs for debugging
        attempts: 3, // Retry up to 3 times
        backoff: {
          type: 'exponential',
          delay: 5000, // 5 seconds initial backoff
        },
      },
    );

    this.logger.log(
      `Scheduled expiry for reservation ${reservationId} at ${expiresAt.toISOString()}`,
    );
  }

  /**
   * Cancel a scheduled expiry job.
   * Called when a reservation is released manually before expiry.
   */
  async cancelExpiry(reservationId: string): Promise<void> {
    const jobId = `expire-${reservationId}`;

    try {
      const job = await this.reservationQueue.getJob(jobId);
      if (job) {
        await job.remove();
        this.logger.log(
          `Cancelled expiry job for reservation ${reservationId}`,
        );
      }
    } catch (error) {
      // Job might already be processed or not exist
      this.logger.debug(
        `Could not cancel expiry job for ${reservationId}: ${error}`,
      );
    }
  }

  /**
   * Reschedule expiry for a reservation (when expiresAt is extended).
   */
  async rescheduleExpiry(
    reservationId: string,
    tenantId: string,
    newExpiresAt: Date,
  ): Promise<void> {
    await this.cancelExpiry(reservationId);
    await this.scheduleExpiry(reservationId, tenantId, newExpiresAt);

    this.logger.log(
      `Rescheduled expiry for reservation ${reservationId} to ${newExpiresAt.toISOString()}`,
    );
  }
}
