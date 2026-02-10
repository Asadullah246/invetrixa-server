export interface EmailVerificationData {
  userName: string;
  verificationUrl: string;
  expirationHours?: number;
}

export function getEmailVerificationTemplate(
  data: EmailVerificationData,
): string {
  const { userName, verificationUrl, expirationHours = 24 } = data;
  const year = new Date().getFullYear();

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #e0e0e0;">
        <h1 style="color: #333333; margin: 0; font-size: 28px;">Verify Your Email</h1>
      </div>
      <div style="padding: 30px 20px;">
        <p style="color: #555555; font-size: 16px; line-height: 1.6;">Hello <strong>${userName}</strong>,</p>
        <p style="color: #555555; font-size: 16px; line-height: 1.6;">
          Please verify your email address to complete your account setup. Click the button below to verify:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="display: inline-block; padding: 14px 40px; background-color: #4F46E5; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.3);">
            Verify Email Address
          </a>
        </div>
        <p style="color: #888888; font-size: 14px; line-height: 1.6;">
          Or copy and paste this link into your browser:
        </p>
        <p style="color: #4F46E5; font-size: 14px; word-break: break-all; background-color: #f8f9fa; padding: 12px; border-radius: 6px;">
          ${verificationUrl}
        </p>
        <div style="margin-top: 30px; padding: 16px; background-color: #FEF3C7; border-radius: 8px; border-left: 4px solid #F59E0B;">
          <p style="color: #92400E; font-size: 14px; margin: 0;">
            <strong>⚠️ This link will expire in ${expirationHours} hours.</strong><br/>
            If you didn't create an account with PxlHut, please ignore this email.
          </p>
        </div>
      </div>
      <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin-top: 20px;">
        <p style="color: #888888; font-size: 12px; margin: 0;">
          © ${year} PxlHut. All rights reserved.
        </p>
      </div>
    </div>
  `;
}
