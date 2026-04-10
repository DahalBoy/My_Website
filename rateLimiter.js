const rateLimit = require('express-rate-limit');
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 5,
  message: { error: 'Too many submissions. Try again in 15 minutes.' }
});
const readLimiter = rateLimit({
  windowMs: 60 * 1000, max: 60,
  message: { error: 'Too many requests.' }
});
module.exports = { contactLimiter, readLimiter };
