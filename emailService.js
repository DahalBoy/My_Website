const nodemailer = require('nodemailer');

async function sendNotificationEmail({ name, email, phone, subject, message }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return false;
  const t = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 587, secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  await t.sendMail({
    from: `"Portfolio" <${process.env.EMAIL_USER}>`,
    to: process.env.OWNER_EMAIL || process.env.EMAIL_USER,
    replyTo: email,
    subject: `[Portfolio] New message from ${name}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:580px">
      <div style="background:#1a1a2e;padding:18px 22px;border-radius:8px 8px 0 0">
        <h2 style="color:#fff;margin:0">New Portfolio Message</h2>
      </div>
      <div style="border:1px solid #ddd;border-top:none;padding:18px 22px;border-radius:0 0 8px 8px">
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        ${phone ? `<p><b>Phone:</b> ${phone}</p>` : ''}
        <p><b>Subject:</b> ${subject || '(no subject)'}</p>
        <div style="background:#f5f5f5;padding:14px;border-left:4px solid #1a1a2e;border-radius:4px;margin-top:12px">
          <p style="margin:0;white-space:pre-wrap">${message}</p>
        </div>
        <p style="font-size:11px;color:#999;margin-top:14px">${new Date().toUTCString()}</p>
      </div>
    </div>`,
    text: `From: ${name} <${email}>\n\n${message}`,
  });
  return true;
}

module.exports = { sendNotificationEmail };
