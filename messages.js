const express = require('express');
const router = express.Router();

function requireAdminKey(req, res, next) {
  if (!process.env.ADMIN_API_KEY) return next();
  const key = req.headers['x-admin-key'];
  if (!key || key !== process.env.ADMIN_API_KEY)
    return res.status(401).json({ error: 'Unauthorized.' });
  next();
}

router.use(requireAdminKey);

router.get('/', async (req, res) => {
  try {
   const Message = require('./Message');
    const msgs = await Message.find({}).sort({ created_at: -1 }).limit(50).lean();
    res.json({ data: msgs, total: msgs.length });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch messages.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const Message = require('./Message');
    await Message.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete.' });
  }
});

module.exports = router;
