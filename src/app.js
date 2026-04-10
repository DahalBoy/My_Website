require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'X-Admin-Key'],
}));
app.use(express.json({ limit: '10kb' }));

let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  if (!process.env.MONGODB_URI) return;
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    isConnected = true;
  } catch (err) {
    console.error('MongoDB error:', err.message);
  }
}
app.use(async (req, res, next) => { await connectDB(); next(); });

app.get('/', (req, res) => res.json({ status: 'ok', message: 'Portfolio API running!' }));
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.get('/test-email', async (req, res) => {
  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 587, secure: false,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.OWNER_EMAIL,
      subject: 'Portfolio API - Test Email',
      text: 'Your contact form backend is working correctly!',
    });
    res.json({ success: true, message: 'Test email sent! Check your inbox and spam folder.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.use('/api/contact',  require('./routes/contact'));
app.use('/api/messages', require('./routes/messages'));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => res.status(500).json({ error: err.message }));

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Running on port ${PORT}`));
}

module.exports = app;
