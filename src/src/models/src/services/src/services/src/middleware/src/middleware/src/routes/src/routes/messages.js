const express = require('express');
const router = express.Router();
const { requireAdminKey } = require('../middleware/auth');
const { readLimiter } = require('../middleware/rateLimiter');
let Message; try { Message = require('../models/Message'); } catch(e){}
router.use(requireAdminKey, readLimiter);
router.get('/', async (req, res) => {
  if (!Message) return res.status(503).json({ error: 'DB not connected.' });
  try {
    const msgs = await Message.find({}).sort({ created_at: -1 }).limit(50).lean();
    res.json({ data: msgs, total: msgs.length });
  } catch(e){ res.status(500).json({ error: 'Failed.' }); }
});
router.delete('/:id', async (req, res) => {
  if (!Message) return res.status(503).json({ error: 'DB not connected.' });
  try { await Message.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch(e){ res.status(500).json({ error: 'Failed.' }); }
});
module.exports = router;
