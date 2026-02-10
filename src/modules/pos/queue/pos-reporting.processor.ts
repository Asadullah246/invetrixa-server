import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import {
  POS_REPORTING_QUEUE,
  JOB_UPDATE_DAILY_SALES,
  JOB_CLEANUP_ABANDONED_CARTS,
} from './pos-queue.constants';
import { ReportingService } from '../services/reporting.service';
import { CartCleanupService } from '../services/cart-cleanup.service';

interface UpdateDailySalesJobData {
  tenantId: string;
  locationId: string;
  date: string | Date;
}

@Processor(POS_REPORTING_QUEUE)
export class PosReportingProcessor extends WorkerHost {
  private readonly logger = new Logger(PosReportingProcessor.name);

  constructor(
    private readonly reportingService: ReportingService,
    private readonly cartCleanupService: CartCleanupService,
  ) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    this.logger.debug(`Processing job ${job.name} (${job.id})`);

    switch (job.name) {
      case JOB_UPDATE_DAILY_SALES:
        return this.handleUpdateDailySales(job as Job<UpdateDailySalesJobData>);
      case JOB_CLEANUP_ABANDONED_CARTS:
        return this.handleCleanupAbandonedCarts();
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async handleUpdateDailySales(job: Job<UpdateDailySalesJobData>) {
    const { tenantId, locationId, date } = job.data;
    await this.reportingService.generateDailySummary(
      tenantId,
      locationId,
      typeof date === 'string' ? date : new Date(date).toISOString(),
    );
  }

  private async handleCleanupAbandonedCarts() {
    const result = await this.cartCleanupService.cleanupAbandonedCarts();
    return result;
  }
}
