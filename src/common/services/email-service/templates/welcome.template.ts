export interface WelcomeEmailData {
  userName: string;
}

export function getWelcomeEmailTemplate(data: WelcomeEmailData): string {
  const { userName } = data;
  const year = new Date().getFullYear();

  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #e0e0e0;">
        <h1 style="color: #333333; margin: 0; font-size: 28px;">Welcome to PxlHut! 🎉</h1>
      </div>
      <div style="padding: 30px 20px;">
        <p style="color: #555555; font-size: 16px; line-height: 1.6;">Hello <strong>${userName}</strong>,</p>
        <p style="color: #555555; font-size: 16px; line-height: 1.6;">
          Thank you for joining PxlHut! We're excited to have you on board.
        </p>
        <p style="color: #555555; font-size: 16px; line-height: 1.6;">
          If you have any questions, feel free to reach out to our support team.
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
