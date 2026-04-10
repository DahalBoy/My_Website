function requireAdminKey(req, res, next) {
  if (!process.env.ADMIN_API_KEY) return next();
  const key = req.headers['x-admin-key'];
  if (!key || key !== process.env.ADMIN_API_KEY)
    return res.status(401).json({ error: 'Unauthorized.' });
  next();
}
module.exports = { requireAdminKey };
