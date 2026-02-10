export interface TenantInvitationEmailData {
  inviteeEmail: string;
  tenantName: string;
  inviterName: string;
  invitationMessage?: string;
  invitationUrl: string;
  expiresAt?: Date;
}

export function getTenantInvitationEmailTemplate(
  data: TenantInvitationEmailData,
): string {
  const {
    inviteeEmail,
    tenantName,
    inviterName,
    invitationMessage,
    invitationUrl,
    expiresAt,
  } = data;
  const year = new Date().getFullYear();

  const expirationText = expiresAt
    ? `This invitation expires on <strong>${expiresAt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>.`
    : 'This invitation does not expire.';

  const messageSection = invitationMessage
    ? `
        <div style="background-color: #f0f4f8; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4a90d9;">
          <p style="color: #555555; font-size: 14px; font-style: italic; margin: 0;">
            "${invitationMessage}"
          </p>
          <p style="color: #888888; font-size: 12px; margin: 10px 0 0 0;">
            — ${inviterName}
          </p>
        </div>
      `
    : '';

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #e0e0e0;">
        <h1 style="color: #333333; margin: 0; font-size: 28px;">You're Invited! 🎉</h1>
      </div>
      <div style="padding: 30px 20px;">
        <p style="color: #555555; font-size: 16px; line-height: 1.6;">Hello <strong>${inviteeEmail}</strong>,</p>
        <p style="color: #555555; font-size: 16px; line-height: 1.6;">
          <strong>${inviterName}</strong> has invited you to join <strong>${tenantName}</strong> on PxlHut.
        </p>
        ${messageSection}
        <p style="color: #555555; font-size: 16px; line-height: 1.6;">
          Click the button below to accept the invitation and join the team:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${invitationUrl}" 
             style="display: inline-block; background-color: #4a90d9; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(74, 144, 217, 0.3);">
            Accept Invitation
          </a>
        </div>
        <p style="color: #888888; font-size: 14px; line-height: 1.6;">
          ${expirationText}
        </p>
        <p style="color: #888888; font-size: 14px; line-height: 1.6;">
          If you weren't expecting this invitation, you can safely ignore this email.
        </p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
          <p style="color: #888888; font-size: 12px; line-height: 1.4;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <p style="color: #4a90d9; font-size: 12px; word-break: break-all;">
            ${invitationUrl}
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
