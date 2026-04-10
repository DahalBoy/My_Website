require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

const app = express();
app.use(require('helmet')());
app.use(cors({ origin: '*', methods: ['GET','POST','DELETE'], allowedHeaders: ['Content-Type','X-Admin-Key'] }));
app.use(express.json({ limit: '10kb' }));

// MongoDB
let isConnected = false;
async function connectDB() {
  if (isConnected || !process.env.MONGODB_URI) return;
  try { await mongoose.connect(process.env.MONGODB_URI); isConnected = true; } catch(e) { console.error(e.message); }
}
app.use(async (req, res, next) => { await connectDB(); next(); });

// Message schema
const MsgSchema = new mongoose.Schema({
  name: String, email: String, phone: String,
  subject: String, message: String, ip: String,
  email_sent: { type: Boolean, default: false },
}, { timestamps: true });
const Msg = mongoose.models.Msg || mongoose.model('Msg', MsgSchema);

// ── ROUTES ────────────────────────────────────────────

app.get('/', (req, res) => res.json({ status: 'ok', message: 'Portfolio API running!' }));
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// Test email
app.get('/test-email', async (req, res) => {
  try {
    const t = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 587, secure: false,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
    await t.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.OWNER_EMAIL,
      subject: 'Portfolio API Test Email',
      text: 'Your contact form backend is working!'
    });
    res.json({ success: true, message: 'Test email sent! Check inbox and spam.' });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Submit contact form
app.post('/api/contact', async (req, res) => {
  try {
    const name    = String(req.body.name    || '').replace(/<[^>]*>/g,'').trim();
    const email   = String(req.body.email   || '').replace(/<[^>]*>/g,'').trim();
    const phone   = String(req.body.phone   || '').replace(/<[^>]*>/g,'').trim();
    const subject = String(req.body.subject || '').replace(/<[^>]*>/g,'').trim();
    const message = String(req.body.message || '').replace(/<[^>]*>/g,'').trim();

    if (req.body._honeypot) return res.json({ success: true });

    const errors = {};
    if (!name || name.length < 2)    errors.name    = 'Name must be at least 2 characters.';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Valid email required.';
    if (!message || message.length < 10) errors.message = 'Message must be at least 10 characters.';
    if (Object.keys(errors).length)  return res.status(422).json({ error: 'Validation failed', fields: errors });

    // Save to DB
    try { await Msg.create({ name, email, phone, subject, message, ip: req.ip }); } catch(e) { console.error('DB:', e.message); }

    // Send email
    let emailSent = false;
    try {
      const t = nodemailer.createTransport({
        host: 'smtp.gmail.com', port: 587, secure: false,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
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
            <p><b>Email:</b> <a href="mailto:${email}">${email}</a></p>
            ${phone ? `<p><b>Phone:</b> ${phone}</p>` : ''}
            <p><b>Subject:</b> ${subject || '(no subject)'}</p>
            <div style="background:#f5f5f5;padding:14px;border-left:4px solid #1a1a2e;border-radius:4px;margin-top:12px">
              <p style="margin:0;white-space:pre-wrap">${message}</p>
            </div>
            <p style="font-size:11px;color:#999;margin-top:14px">Received: ${new Date().toUTCString()}</p>
          </div>
        </div>`,
        text: `From: ${name} <${email}>\n\n${message}`
      });
      emailSent = true;
    } catch(e) { console.error('Email error:', e.message); }

    res.status(201).json({ success: true, message: "Thanks! I'll get back to you soon." });
  } catch(err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// Get messages (admin)
app.get('/api/messages', async (req, res) => {
  const key = req.headers['x-admin-key'];
  if (process.env.ADMIN_API_KEY && key !== process.env.ADMIN_API_KEY)
    return res.status(401).json({ error: 'Unauthorized.' });
  try {
    const msgs = await Msg.find({}).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ data: msgs, total: msgs.length });
  } catch(e) { res.status(500).json({ error: 'Failed.' }); }
});

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => res.status(500).json({ error: err.message }));

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Running on port ${PORT}`));
}

module.exports = app;
