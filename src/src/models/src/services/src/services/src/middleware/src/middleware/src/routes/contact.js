const express = require('express');
const router = express.Router();
const { contactLimiter } = require('../middleware/rateLimiter');
const { sendNotificationEmail } = require('../services/emailService');
const { sendSmsAlert } = require('../services/smsService');
let Message; try { Message = require('../models/Message'); } catch(e){}

function clean(s){ return String(s||'').replace(/<[^>]*>/g,'').trim(); }

router.post('/', contactLimiter, async (req, res) => {
  try {
    const name = clean(req.body.name), email = clean(req.body.email);
    const phone = clean(req.body.phone), subject = clean(req.body.subject);
    const message = clean(req.body.message);
    if (req.body._honeypot) return res.json({ success: true });

    const errors = {};
    if (!name || name.length < 2) errors.name = 'Name must be at least 2 characters.';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Valid email required.';
    if (!message || message.length < 10) errors.message = 'Message must be at least 10 characters.';
    if (Object.keys(errors).length) return res.status(422).json({ error: 'Validation failed', fields: errors });

    let savedId = null;
    if (Message) {
      try { const d = await Message.create({ name, email, phone: phone||null, subject: subject||'(no subject)', message, ip_address: req.ip }); savedId = d._id; }
      catch(e){ console.error('DB:', e.message); }
    }

    let emailSent = false, smsSent = false;
    try { await sendNotificationEmail({ name, email, phone, subject, message }); emailSent = true; }
    catch(e){ console.error('Email:', e.message); }
    try { await sendSmsAlert({ name, email, message }); smsSent = true; }
    catch(e){ console.error('SMS:', e.message); }

    if (Message && savedId) try { await Message.findByIdAndUpdate(savedId, { email_sent: emailSent, sms_sent: smsSent }); } catch(e){}

    res.status(201).json({ success: true, message: "Thanks! I'll get back to you soon." });
  } catch(err) {
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});
module.exports = router;
