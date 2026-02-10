export interface PasswordResetData {
  userName: string;
  resetUrl: string;
  expirationMinutes?: number;
}

export function getPasswordResetTemplate(data: PasswordResetData): string {
  const { userName, resetUrl, expirationMinutes = 60 } = data;
  const year = new Date().getFullYear();

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #e0e0e0;">
        <h1 style="color: #333333; margin: 0; font-size: 28px;">Reset Your Password</h1>
      </div>
      <div style="padding: 30px 20px;">
        <p style="color: #555555; font-size: 16px; line-height: 1.6;">Hello <strong>${userName}</strong>,</p>
        <p style="color: #555555; font-size: 16px; line-height: 1.6;">
          We received a request to reset your password. Click the button below to create a new password:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="display: inline-block; padding: 14px 40px; background-color: #DC2626; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 2px 4px rgba(220, 38, 38, 0.3);">
            Reset Password
          </a>
        </div>
        <p style="color: #888888; font-size: 14px; line-height: 1.6;">
          Or copy and paste this link into your browser:
        </p>
        <p style="color: #DC2626; font-size: 14px; word-break: break-all; background-color: #f8f9fa; padding: 12px; border-radius: 6px;">
          ${resetUrl}
        </p>
        <div style="margin-top: 30px; padding: 16px; background-color: #FEE2E2; border-radius: 8px; border-left: 4px solid #DC2626;">
          <p style="color: #991B1B; font-size: 14px; margin: 0;">
            <strong>⚠️ This link will expire in ${expirationMinutes} minutes.</strong><br/>
            If you didn't request a password reset, please ignore this email or contact support if you have concerns.
          </p>
        </div>
        <div style="margin-top: 20px; padding: 16px; background-color: #F3F4F6; border-radius: 8px;">
          <p style="color: #6B7280; font-size: 13px; margin: 0;">
            <strong>🔒 Security Tips:</strong><br/>
            • Never share your password with anyone<br/>
            • Use a unique, strong password<br/>
            • Enable two-factor authentication for extra security
          </p>
        </div>
      </div>
      <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin-top: 20px;">
        <p style="color: #888888; font-size: 12px; margin: 0;">
          © ${year} Invetrixa. All rights reserved.
        </p>
      </div>
    </div>
  `;
}
