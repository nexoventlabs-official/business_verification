const express = require('express');
const jwt = require('jsonwebtoken');
const store = require('../db/store');
const { BspConfig } = require('../models/index');

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


router.get('/config', requireAdmin, async (_req, res, next) => {
  try {
    const cfg = await BspConfig.findById('bsp').lean();
    res.json(cfg || {});
  } catch (e) { next(e); }
});

router.post('/config', requireAdmin, async (req, res, next) => {
  try {
    const { metaAppId, metaAppSecret, metaConfigId, graphVersion } = req.body;
    if (!metaAppId || !metaAppSecret || !metaConfigId) {
      return res.status(400).json({ error: 'metaAppId, metaAppSecret and metaConfigId are required' });
    }
    const cfg = await BspConfig.findOneAndUpdate(
      { _id: 'bsp' },
      { $set: { _id: 'bsp', metaAppId, metaAppSecret, metaConfigId, graphVersion: graphVersion || 'v23.0', updatedAt: Date.now() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    res.json({ ok: true, appId: cfg.metaAppId, configId: cfg.metaConfigId });
  } catch (e) { next(e); }
});


router.get('/users', requireAdmin, async (_req, res, next) => {
  try {
    const users = await store.listAllAccounts();
    const safe = users.map(({ fbToken, passwordHash, metaAppSecret, ...u }) => ({
      ...u, hasMeta: !!(u.metaAppId && u.metaConfigId), fbConnected: !!fbToken,
    }));
    res.json(safe);
  } catch (e) { next(e); }
});

router.get('/user/:email/debug', requireAdmin, async (req, res, next) => {
  try {
    const meta = require('../services/metaApi');
    const account = await store.getAccountByEmail(req.params.email.toLowerCase());
    if (!account) return res.status(404).json({ error: 'user_not_found' });

    const { passwordHash, metaAppSecret, ...safe } = account;
    const result = { account: { ...safe, hasMeta: !!(account.metaAppId && account.metaConfigId), fbConnected: !!account.fbToken }, businesses: [], wabas: [] };

    if (account.fbToken) {
      for (const bid of account.businessIds || []) {
        try {
          const info = await meta.getBusinessInfo(account.fbToken, bid);
          const owned = await meta.listOwnedWabas(account.fbToken, bid);
          const shared = await meta.listSharedWabas(account.fbToken, bid);
          result.businesses.push({ ...info, owned_wabas: owned, shared_wabas: shared });
        } catch (e) {
          result.businesses.push({ id: bid, error: e?.response?.data?.error?.message || e.message });
        }
      }
      for (const wid of account.wabaIds || []) {
        try {
          const phones = await meta.listPhoneNumbers(account.fbToken, wid);
          result.wabas.push({ id: wid, phones });
        } catch (e) {
          result.wabas.push({ id: wid, error: e?.response?.data?.error?.message || e.message });
        }
      }
    }
    res.json(result);
  } catch (e) { next(e); }
});

router.get('/stats', requireAdmin, async (_req, res, next) => {
  try {
    const users = await store.listAllAccounts();
    const totalWabas = users.reduce((s, u) => s + (u.wabaIds?.length || 0), 0);
    const totalBusinesses = users.reduce((s, u) => s + (u.businessIds?.length || 0), 0);
    res.json({ users: users.length, wabas: totalWabas, businesses: totalBusinesses });
  } catch (e) { next(e); }
});

module.exports = { router, requireAdmin };
