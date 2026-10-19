// ============================================================
// 📑 VISUAL EMAIL TEMPLATES (Keeps your Service Files Clean)
// ============================================================

export const getPasswordResetHTML = (resetLink) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #fe5000; margin-top: 0; font-size: 22px; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px;">Password Reset Request</h2>
      <p style="color: #334155; font-size: 15px; line-height: 1.5;">Hello,</p>
      <p style="color: #334155; font-size: 15px; line-height: 1.5;">We received a request to change the account credentials associated with this email on Evangadi Forum. Click the action link below to choose a new secure password. This token expires automatically after 15 minutes.</p>
      
      <!-- 🚀 Styled Action Button Button Box -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="background-color: #ea580c; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block;">Reset Password</a>
      </div>
      
      <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin-bottom: 0; border-top: 1px solid #f1f5f9; padding-top: 12px;">If you did not make this request, you can safely disregard this email. Your current password data parameters remain safe and unchanged.</p>
    </div>
  `;
};
