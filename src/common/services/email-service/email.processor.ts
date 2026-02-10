import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SendEmailJobData, EmailResult } from './interfaces/job-data.interface';
import { NodemailerService } from './nodemailer.service';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly nodemailerService: NodemailerService) {
    super();
  }

  async process(job: Job) {
    switch (job.name) {
      case 'send-email':
        return await this.handleSendEmail(job as Job<SendEmailJobData>);
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }

  private async handleSendEmail(
    job: Job<SendEmailJobData>,
  ): Promise<EmailResult> {
    this.logger.log(`[Job ${job.id}] Processing email...`);
    this.logger.log(`[Job ${job.id}] To: ${job.data.to}`);
    this.logger.log(`[Job ${job.id}] Subject: ${job.data.subject}`);

    try {
      const result = await this.nodemailerService.sendMail({
        to: job.data.to,
        subject: job.data.subject,
        html: job.data.body,
      });

      this.logger.log(
        `[Job ${job.id}] ✅ Email sent successfully! Message ID: ${result.messageId}`,
      );

      return {
        success: true,
        messageId: result.messageId,
        to: job.data.to,
        sentAt: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `[Job ${job.id}] ❌ Failed to send email: ${errorMessage}`,
        errorStack,
      );

      throw error; // Let BullMQ handle retries
    }
  }
}
