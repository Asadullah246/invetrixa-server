export interface MemberRemovalEmailData {
  userName: string;
  tenantName: string;
  reason?: string;
}

export function getMemberRemovalEmailTemplate(
  data: MemberRemovalEmailData,
): string {
  const { userName, tenantName, reason } = data;
  const year = new Date().getFullYear();

  const reasonSection = reason
    ? `
        <div style="background-color: #f8f0f0; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d9534f;">
          <p style="color: #333333; font-size: 14px; margin: 0 0 5px 0; font-weight: 600;">Reason provided:</p>
          <p style="color: #555555; font-size: 14px; margin: 0;">
            "${reason}"
          </p>
        </div>
      `
    : '';

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #e0e0e0;">
        <h1 style="color: #333333; margin: 0; font-size: 24px;">Membership Update</h1>
      </div>
      <div style="padding: 30px 20px;">
        <p style="color: #555555; font-size: 16px; line-height: 1.6;">Hello <strong>${userName}</strong>,</p>
        <p style="color: #555555; font-size: 16px; line-height: 1.6;">
          We're writing to inform you that your membership with <strong>${tenantName}</strong> on PxlHut has been terminated.
        </p>
        ${reasonSection}
        <p style="color: #555555; font-size: 16px; line-height: 1.6;">
          As a result, you will no longer have access to ${tenantName}'s workspace, resources, or data.
        </p>
        <p style="color: #555555; font-size: 16px; line-height: 1.6;">
          If you believe this was done in error or have any questions, please contact the ${tenantName} administrator.
        </p>
      </div>
      <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin-top: 20px;">
        <p style="color: #888888; font-size: 12px; margin: 0;">
          © ${year} PxlHut. All rights reserved.
        </p>
      </div>
    </div>
  `;
}
