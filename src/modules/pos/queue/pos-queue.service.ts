import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  POS_REPORTING_QUEUE,
  JOB_UPDATE_DAILY_SALES,
  JOB_CLEANUP_ABANDONED_CARTS,
} from './pos-queue.constants';

@Injectable()
export class PosQueueService implements OnModuleInit {
  private readonly logger = new Logger(PosQueueService.name);

  constructor(
    @InjectQueue(POS_REPORTING_QUEUE)
    private readonly reportQueue: Queue,
  ) {}

  /**
   * Initialize repeatable jobs on module startup.
   */
  async onModuleInit() {
    await this.setupRepeatableJobs();
  }

  /**
   * Setup repeatable jobs for scheduled tasks.
   */
  private async setupRepeatableJobs() {
    try {
      // Add cart cleanup job that runs every hour
      await this.reportQueue.add(
        JOB_CLEANUP_ABANDONED_CARTS,
        {},
        {
          repeat: {
            pattern: '0 * * * *', // Every hour at minute 0
          },
          removeOnComplete: true,
          removeOnFail: 10,
        },
      );
      this.logger.log('Scheduled cart cleanup job (hourly)');
    } catch (error) {
      this.logger.error('Failed to setup repeatable jobs:', error);
    }
  }

  /**
   * Dispatches a job to update the daily sales summary for a specific location and date.
   */
  async dispatchUpdateDailySales(
    tenantId: string,
    locationId: string,
    date: Date,
  ) {
    try {
      // Normalize date to YYYY-MM-DD for consistency
      const dateStr = date.toISOString().split('T')[0];

      await this.reportQueue.add(
        JOB_UPDATE_DAILY_SALES,
        {
          tenantId,
          locationId,
          date: dateStr,
        },
        {
          removeOnComplete: true,
          removeOnFail: 100, // Keep last 100 failed jobs for debugging
        },
      );
      this.logger.debug(
        `Dispatched update-daily-sales for ${locationId} on ${dateStr}`,
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to dispatch update-daily-sales job: ${error.message}`,
          error.stack,
        );
      } else {
        this.logger.error(
          `Failed to dispatch update-daily-sales job: ${String(error)}`,
        );
      }
      // We don't throw here to avoid failing the sale/refund transaction
    }
  }

  /**
   * Manually trigger cart cleanup (for admin/testing use).
   */
  async dispatchCartCleanup() {
    await this.reportQueue.add(
      JOB_CLEANUP_ABANDONED_CARTS,
      {},
      {
        removeOnComplete: true,
        removeOnFail: 10,
      },
    );
    this.logger.debug('Dispatched manual cart cleanup job');
  }
}
