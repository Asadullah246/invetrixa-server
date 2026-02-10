import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface SendMailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
}

/**
 * Service for sending emails using Nodemailer
 */
@Injectable()
export class NodemailerService {
  private readonly logger = new Logger(NodemailerService.name);
  private transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  /**
   * Initialize the Nodemailer transporter with SMTP configuration
   */
  private initializeTransporter(): void {
    const user = this.configService.get<string>('EMAIL_USERNAME');
    const pass = this.configService.get<string>('EMAIL_PASSWORD');
    const service = this.configService.get<string>('EMAIL_SERVICE');
    const clientId = this.configService.get<string>('EMAIL_CLIENT_ID');
    const clientSecret = this.configService.get<string>('EMAIL_CLIENT_SECRET');
    const refreshToken = this.configService.get<string>('EMAIL_REFRESH_TOKEN');

    if (!user || !pass) {
      this.logger.warn(
        'Email configuration is incomplete. Email sending will not work.',
      );
      this.logger.warn(
        'Please set EMAIL_HOST, EMAIL_USERNAME, and EMAIL_PASSWORD in your environment variables.',
      );
    }
    console.log(user, pass);

    this.transporter = nodemailer.createTransport({
      service,
      auth: {
        user,
        pass,
        ...(clientId &&
          clientSecret &&
          refreshToken && {
            clientId,
            clientSecret,
            refreshToken,
          }),
      },
    });

    this.logger.log(`Nodemailer transporter initialized with host: ${service}`);
  }

  /**
   * Send an email using the configured transporter
   * @param options - Email options including recipient, subject, and HTML content
   * @returns Promise with send result including message ID
   */
  async sendMail(options: SendMailOptions): Promise<SendMailResult> {
    const defaultFrom = this.configService.get<string>(
      'EMAIL_FROM',
      'noreply@example.com',
    );

    try {
      const info = (await this.transporter.sendMail({
        from: defaultFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
      })) as { messageId?: string; accepted?: unknown[]; rejected?: unknown[] };
      const messageId = String(info.messageId || '');
      const accepted = Array.isArray(info.accepted)
        ? (info.accepted as string[])
        : [];
      const rejected = Array.isArray(info.rejected)
        ? (info.rejected as string[])
        : [];

      this.logger.log(
        `Email sent successfully to ${options.to}. Message ID: ${messageId}`,
      );

      return {
        messageId,
        accepted,
        rejected,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to send email to ${options.to}: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Verify the SMTP connection
   * @returns Promise<boolean> indicating if the connection is successful
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully');
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `SMTP connection verification failed: ${errorMessage}`,
        errorStack,
      );
      return false;
    }
  }
}
