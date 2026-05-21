const jwt = require('jsonwebtoken');

function sign(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function requireAuth(req, res, next) {
  const token = req.cookies?.bsp_token || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'unauthenticated' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid_token' });
  }
}

module.exports = { sign, requireAuth };
