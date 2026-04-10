const express = require('express');
const router = express.Router();

function clean(s) { return String(s || '').replace(/<[^>]*>/g, '').trim(); }

router.post('/', async (req, res) => {
  try {
    const name    = clean(req.body.name);
    const email   = clean(req.body.email);
    const phone   = clean(req.body.phone);
    const subject = clean(req.body.subject);
    const message = clean(req.body.message);

    if (req.body._honeypot) return res.json({ success: true });

    const errors = {};
    if (!name || name.length < 2) errors.name = 'Name must be at least 2 characters.';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Valid email required.';
    if (!message || message.length < 10) errors.message = 'Message must be at least 10 characters.';
    if (Object.keys(errors).length) return res.status(422).json({ error: 'Validation failed', fields: errors });

    // Save to MongoDB
    try {
      const Message = require('./Message');
      await Message.create({
        name, email,
        phone: phone || null,
        subject: subject || '(no subject)',
        message,
        ip_address: req.ip,
      });
    } catch (e) { console.error('DB:', e.message); }

    // Send email
    let emailSent = false;
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com', port: 587, secure: false,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      });
      await transporter.sendMail({
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
      emailSent = true;
      console.log('Email sent successfully');
    } catch (e) { console.error('Email error:', e.message); }

    res.status(201).json({ success: true, message: "Thanks! I'll get back to you soon." });
  } catch (err) {
    console.error('Contact error:', err.message);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
