const mongoose = require('mongoose');
const s = new mongoose.Schema({
  name:       { type: String, required: true },
  email:      { type: String, required: true },
  phone:      { type: String, default: null },
  subject:    { type: String, default: '(no subject)' },
  message:    { type: String, required: true },
  ip_address: { type: String, default: null },
  status:     { type: String, default: 'unread' },
  email_sent: { type: Boolean, default: false },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
module.exports = mongoose.models.Message || mongoose.model('Message', s);
