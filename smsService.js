async function sendSmsAlert({ name, email, message }) {
  if (!process.env.TWILIO_SID || !process.env.TWILIO_AUTH || !process.env.OWNER_PHONE) return false;
  const client = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
  const preview = message.length > 80 ? message.slice(0, 77) + '...' : message;
  await client.messages.create({
    body: `[Portfolio] New msg from ${name} (${email}): ${preview}`,
    from: process.env.TWILIO_FROM,
    to: process.env.OWNER_PHONE,
  });
  return true;
}
module.exports = { sendSmsAlert };
