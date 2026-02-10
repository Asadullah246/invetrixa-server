export interface SendEmailJobData {
  to: string;
  subject: string;
  body: string;
  timestamp: string;
}

export interface EmailResult {
  success: boolean;
  messageId: string;
  to: string;
  sentAt: string;
}
