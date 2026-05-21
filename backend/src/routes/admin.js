const express = require('express');
const jwt = require('jsonwebtoken');
const store = require('../db/store');

const router = express.Router();

function requireAdmin(req, res, next) {
  const token = req.cookies?.bsp_admin || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'unauthenticated' });
  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    if (!req.admin.isAdmin) return res.status(403).json({ error: 'forbidden' });
    next();
  } catch {
    res.status(401).json({ error: 'invalid_token' });
  }
}

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (
    username !== process.env.ADMIN_USERNAME ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return res.status(401).json({ error: 'invalid_credentials' });
  }
  const token = jwt.sign({ isAdmin: true, username }, process.env.JWT_SECRET, { expiresIn: '12h' });
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('bsp_admin', token, { httpOnly: true, sameSite: isProd ? 'none' : 'lax', secure: isProd });
  res.json({ ok: true });
});

router.post('/logout', (_req, res) => {
  res.clearCookie('bsp_admin');
  res.json({ ok: true });
});

router.get('/me', requireAdmin, (req, res) => {
  res.json({ username: req.admin.username });
});

router.get('/users', requireAdmin, async (req, res, next) => {
  try {
    const users = await store.listAllUsers();
    const safe = users.map(({ fbToken, ...u }) => u);
    res.json(safe);
  } catch (e) { next(e); }
});

router.get('/stats', requireAdmin, async (req, res, next) => {
  try {
    const users = await store.listAllUsers();
    const totalWabas = users.reduce((s, u) => s + (u.wabaIds?.length || 0), 0);
    const totalBusinesses = users.reduce((s, u) => s + (u.businessIds?.length || 0), 0);
    res.json({ users: users.length, wabas: totalWabas, businesses: totalBusinesses });
  } catch (e) { next(e); }
});

module.exports = { router, requireAdmin };
