require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));

// MongoDB
let isConnected = false;
const MsgSchema = new mongoose.Schema({
  name: String, email: String,
  message: String, phone: String,
}, { timestamps: true });
const Msg = mongoose.models.Msg || mongoose.model('Msg', MsgSchema);

async function connectDB() {
  if (isConnected || !process.env.MONGODB_URI) return;
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    isConnected = true;
  } catch(e) { console.error('DB error:', e.message); }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Test email
app.get('/test-email', async (req, res) => {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.OWNER_EMAIL,
      subject: 'Test email from Portfolio',
      text: 'Your contact form is working!'
    });
    res.json({ success: true, message: 'Email sent! Check your inbox.' });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Contact form
app.post('/api/contact', async (req, res) => {
  await connectDB();
  try {
    const { name, email, message, phone } = req.body;

    // Validate
    if (!name || name.length < 2)
      return res.status(422).json({ error: 'Name must be at least 2 characters.' });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(422).json({ error: 'Valid email required.' });
    if (!message || message.length < 10)
      return res.status(422).json({ error: 'Message must be at least 10 characters.' });

    // Save to DB
    try { await Msg.create({ name, email, message, phone }); }
    catch(e) { console.error('DB save error:', e.message); }

    // Send email
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    await transporter.sendMail({
      from: `"Portfolio" <${process.env.EMAIL_USER}>`,
      to: process.env.OWNER_EMAIL,
      replyTo: email,
      subject: `New message from ${name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px">
          <div style="background:#0a1628;padding:20px;border-radius:8px 8px 0 0">
            <h2 style="color:#fff;margin:0">New Portfolio Message</h2>
          </div>
          <div style="border:1px solid #ddd;border-top:none;padding:20px;border-radius:0 0 8px 8px">
            <p><b>Name:</b> ${name}</p>
            <p><b>Email:</b> <a href="mailto:${email}">${email}</a></p>
            ${phone ? `<p><b>Phone:</b> ${phone}</p>` : ''}
            <div style="background:#f5f5f5;padding:14px;border-left:4px solid #00c6ff;border-radius:4px;margin-top:12px">
              <p style="margin:0;white-space:pre-wrap">${message}</p>
            </div>
            <p style="font-size:11px;color:#999;margin-top:12px">${new Date().toUTCString()}</p>
          </div>
        </div>
      `,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`
    });

    res.status(201).json({ success: true, message: "Thanks! I'll get back to you soon." });

  } catch(err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

if (require.main === module) {
  app.listen(process.env.PORT || 3000, () => console.log('Running'));
}

module.exports = app;
