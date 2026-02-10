import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { SendEmailJobData } from './interfaces/job-data.interface';
import {
  getWelcomeEmailTemplate,
  getEmailVerificationTemplate,
  getPasswordResetTemplate,
  getTenantInvitationEmailTemplate,
  getMemberRemovalEmailTemplate,
} from './templates';

@Injectable()
export class EmailService {
  constructor(
    @InjectQueue('email') private readonly emailQueue: Queue,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Send a welcome email to a new user
   */
  async sendWelcomeEmail(userEmail: string, userName: string) {
    const jobData: SendEmailJobData = {
      to: userEmail,
      subject: 'Welcome to Invetrixa!',
      body: getWelcomeEmailTemplate({ userName }),
      timestamp: new Date().toISOString(),
    };

    const job = await this.emailQueue.add('send-email', jobData);
    return { jobId: job.id };
  }

  /**
   * Send an email verification email using queue (non-blocking)
   */
  async sendEmailVerification(
    userEmail: string,
    userName: string,
    verificationToken: string,
    baseUrl?: string,
  ) {
    const frontendUrl =
      baseUrl ||
      this.configService.get('app.frontendUrl') ||
      'http://localhost:3000';
    const verificationUrl = `${frontendUrl}/auth/verify-email?token=${verificationToken}`;

    const jobData: SendEmailJobData = {
      to: userEmail,
      subject: 'Verify Your Email Address - Invetrixa',
      body: getEmailVerificationTemplate({
        userName,
        verificationUrl,
        expirationHours: 24,
      }),
      timestamp: new Date().toISOString(),
    };

    const job = await this.emailQueue.add('send-email', jobData);
    return { jobId: job.id };
  }

  /**
   * Send a password reset email
   */
  async sendPasswordResetEmail(
    userEmail: string,
    userName: string,
    resetToken: string,
    baseUrl?: string,
  ) {
    const frontendUrl =
      baseUrl ||
      this.configService.get('app.frontendUrl') ||
      'http://localhost:3000';
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${resetToken}`;

    const jobData: SendEmailJobData = {
      to: userEmail,
      subject: 'Reset Your Password - Invetrixa',
      body: getPasswordResetTemplate({
        userName,
        resetUrl,
        expirationMinutes: 60,
      }),
      timestamp: new Date().toISOString(),
    };

    const job = await this.emailQueue.add('send-email', jobData);
    return { jobId: job.id };
  }

  /**
   * Send a notification email
   */
  async sendNotificationEmail(
    userEmail: string,
    subject: string,
    message: string,
  ) {
    const jobData: SendEmailJobData = {
      to: userEmail,
      subject,
      body: message,
      timestamp: new Date().toISOString(),
    };

    const job = await this.emailQueue.add('send-email', jobData);
    return { jobId: job.id };
  }

  /**
   * Send a tenant invitation email
   */
  async sendTenantInvitationEmail(
    inviteeEmail: string,
    tenantName: string,
    inviterName: string,
    invitationToken: string,
    invitationMessage?: string,
    expiresAt?: Date,
    baseUrl?: string,
  ) {
    const frontendUrl =
      baseUrl ||
      this.configService.get('app.frontendUrl') ||
      'http://localhost:3000';
    const invitationUrl = `${frontendUrl}/invitations/accept?token=${invitationToken}`;

    const jobData: SendEmailJobData = {
      to: inviteeEmail,
      subject: `You're invited to join ${tenantName} on Invetrixa!`,
      body: getTenantInvitationEmailTemplate({
        inviteeEmail,
        tenantName,
        inviterName,
        invitationMessage,
        invitationUrl,
        expiresAt,
      }),
      timestamp: new Date().toISOString(),
    };

    const job = await this.emailQueue.add('send-email', jobData);
    return { jobId: job.id };
  }

  /**
   * Send a member removal notification email
   */
  async sendMemberRemovalEmail(
    userEmail: string,
    userName: string,
    tenantName: string,
    reason?: string,
  ) {
    const jobData: SendEmailJobData = {
      to: userEmail,
      subject: `Your membership with ${tenantName} has been terminated - Invetrixa`,
      body: getMemberRemovalEmailTemplate({
        userName,
        tenantName,
        reason,
      }),
      timestamp: new Date().toISOString(),
    };

    const job = await this.emailQueue.add('send-email', jobData);
    return { jobId: job.id };
  }
}
