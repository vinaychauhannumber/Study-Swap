const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendVerificationEmail(toEmail, verificationToken, frontendUrl = 'https://broplz.site') {
  const verifyLink = `${frontendUrl}/verify-email?token=${verificationToken}`;

  const mailOptions = {
    from: `"BroPlz" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: '✅ Verify your BroPlz account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #fff8f0; border-radius: 16px; overflow: hidden; border: 1px solid #ffe5bf;">
        <div style="background: linear-gradient(135deg, #ff6b35, #f7931e); padding: 32px 24px; text-align: center;">
          <h1 style="margin: 0; color: #fff; font-size: 28px; letter-spacing: -0.5px;">BroPlz 🎓</h1>
          <p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Academic Collaboration Platform</p>
        </div>
        <div style="padding: 32px 24px;">
          <h2 style="color: #1a1a2e; font-size: 22px; margin: 0 0 12px;">Verify your email address</h2>
          <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            You're almost there! Click the button below to verify your email and activate your BroPlz account.
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${verifyLink}" 
               style="background: linear-gradient(135deg, #ff6b35, #f7931e); color: #fff; text-decoration: none; padding: 14px 36px; border-radius: 50px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(255,107,53,0.4);">
              ✅ Verify My Email
            </a>
          </div>
          <p style="color: #888; font-size: 13px; margin: 24px 0 0; text-align: center;">
            Or copy this link into your browser:<br>
            <a href="${verifyLink}" style="color: #f7931e; word-break: break-all;">${verifyLink}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #ffe5bf; margin: 28px 0;">
          <p style="color: #aaa; font-size: 12px; text-align: center; margin: 0;">
            This link expires in 24 hours. If you didn't sign up for BroPlz, you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
    text: `Verify your BroPlz account: ${verifyLink}`,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendVerificationEmail };
