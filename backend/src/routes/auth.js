const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const meta = require('../services/metaApi');
const store = require('../db/store');
const { sign, requireAuth } = require('../middleware/auth');

const router = express.Router();

function setCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('bsp_token', token, {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
  });
}

/* ── Register ── */
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password are required' });
    if (password.length < 6) return res.status(400).json({ error: 'password must be at least 6 characters' });

    const existing = await store.getAccountByEmail(email);
    if (existing) return res.status(409).json({ error: 'email_already_registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const account = await store.createAccount({
      id: uuid(),
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      createdAt: Date.now(),
    });

    const jwtToken = sign({ uid: account.id });
    setCookie(res, jwtToken);
    res.json({ user: { id: account.id, name: account.name, email: account.email, hasMeta: false, fbConnected: false } });
  } catch (e) { next(e); }
});

/* ── Login ── */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

    const account = await store.getAccountByEmail(email.toLowerCase().trim());
    if (!account) return res.status(401).json({ error: 'invalid_credentials' });

    const valid = await bcrypt.compare(password, account.passwordHash);
    if (!valid) return res.status(401).json({ error: 'invalid_credentials' });

    const jwtToken = sign({ uid: account.id });
    setCookie(res, jwtToken);
    res.json({
      user: {
        id: account.id,
        name: account.name,
        email: account.email,
        hasMeta: !!(account.metaAppId && account.metaConfigId),
        fbConnected: !!account.fbToken,
      },
    });
  } catch (e) { next(e); }
});

/* ── Tenant setup — logged-in user saves their Meta App credentials ── */
router.post('/tenant-setup', requireAuth, async (req, res, next) => {
  try {
    const { metaAppId, metaAppSecret, metaConfigId, graphVersion } = req.body;
    if (!metaAppId || !metaAppSecret || !metaConfigId) {
      return res.status(400).json({ error: 'metaAppId, metaAppSecret and metaConfigId are required' });
    }
    await store.updateAccount(req.user.uid, {
      metaAppId, metaAppSecret, metaConfigId,
      graphVersion: graphVersion || 'v23.0',
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

/* ── Config — returns current user's Meta App ID + Config ID (no secret) ── */
router.get('/config', requireAuth, async (req, res, next) => {
  try {
    const account = await store.getAccount(req.user.uid);
    if (!account) return res.status(404).json({ error: 'account_not_found' });
    if (!account.metaAppId || !account.metaConfigId) {
      return res.status(503).json({ error: 'not_configured', message: 'Please complete tenant setup first.' });
    }
    res.json({
      appId: account.metaAppId,
      configId: account.metaConfigId,
      graphVersion: account.graphVersion || 'v23.0',
    });
  } catch (e) { next(e); }
});

/* ── Facebook OAuth — Step 1: generate auth URL (popup opens this) ── */
router.get('/facebook/start', requireAuth, async (req, res, next) => {
  try {
    const account = await store.getAccount(req.user.uid);
    if (!account?.metaAppId || !account?.metaConfigId) {
      return res.status(503).json({ error: 'not_configured', message: 'Complete tenant setup first.' });
    }
    const jwt = require('jsonwebtoken');
    const state = jwt.sign({ uid: req.user.uid }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const redirectUri = `${process.env.BACKEND_URL}/api/auth/facebook/callback`;
    const scope = 'whatsapp_business_management,whatsapp_business_messaging,business_management,ads_management';
    const authUrl = `https://www.facebook.com/dialog/oauth?` +
      `client_id=${account.metaAppId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&config_id=${account.metaConfigId}` +
      `&response_type=code` +
      `&scope=${scope}` +
      `&state=${encodeURIComponent(state)}`;
    res.json({ authUrl });
  } catch (e) { next(e); }
});

/* ── Facebook OAuth — Step 2: callback (popup lands here, exchanges code) ── */
router.get('/facebook/callback', async (req, res) => {
  const FRONTEND = process.env.FRONTEND_URL || 'https://business-verification.vercel.app';
  function closePopup(payload) {
    return res.send(`<!DOCTYPE html><html><body><script>
      window.opener && window.opener.postMessage(${JSON.stringify(payload)}, "${FRONTEND}");
      window.close();
    </script></body></html>`);
  }

  const { code, state, error: fbError } = req.query;
  if (fbError) return closePopup({ type: 'fb_error', error: fbError });
  if (!code || !state) return closePopup({ type: 'fb_error', error: 'missing_code' });

  try {
    const jwt = require('jsonwebtoken');
    const { uid } = jwt.verify(state, process.env.JWT_SECRET);
    const account = await store.getAccount(uid);
    if (!account) return closePopup({ type: 'fb_error', error: 'account_not_found' });

    const redirectUri = `${process.env.BACKEND_URL}/api/auth/facebook/callback`;
    const creds = { appId: account.metaAppId, appSecret: account.metaAppSecret, redirectUri };

    const shortLived = await meta.exchangeCodeForToken({ code, ...creds });
    const longLived  = await meta.exchangeForLongLived({ shortToken: shortLived.access_token, ...creds });
    const userToken  = longLived.access_token;

    const me  = await meta.getMe(userToken);
    const dbg = await meta.debugToken({ token: userToken, ...creds });

    const granular    = dbg.granular_scopes || [];
    const wabaIds     = granular.find((s) => s.scope === 'whatsapp_business_management')?.target_ids || [];
    const businessIds = granular.find((s) => s.scope === 'business_management')?.target_ids || [];

    await store.updateAccount(uid, {
      fbUserId: me.id,
      fbToken: userToken,
      tokenExpiresIn: longLived.expires_in,
      wabaIds,
      businessIds,
    });

    for (const wid of wabaIds) {
      try {
        const phones = await meta.listPhoneNumbers(userToken, wid);
        await store.upsertWaba({ id: wid, userId: uid, phones });
        for (const p of phones) {
          await store.upsertPhone({
            id: p.id, wabaId: wid, userId: uid,
            display_phone_number: p.display_phone_number,
            verified_name: p.verified_name,
            name_status: p.name_status,
            code_verification_status: p.code_verification_status,
            status: p.status,
          });
        }
      } catch (_) {}
    }

    closePopup({ type: 'fb_connected' });
  } catch (err) {
    console.error('[fb/callback]', err.message, err.response?.data || '');
    closePopup({ type: 'fb_error', error: err.response?.data?.error?.message || err.message });
  }
});

/* ── Me ── */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const account = await store.getAccount(req.user.uid);
    if (!account) return res.status(404).json({ error: 'not_found' });
    const { passwordHash, fbToken, metaAppSecret, ...safe } = account;
    res.json({
      ...safe,
      hasMeta: !!(account.metaAppId && account.metaConfigId),
      fbConnected: !!account.fbToken,
    });
  } catch (e) { next(e); }
});

/* ── Logout ── */
router.post('/logout', (_req, res) => {
  res.clearCookie('bsp_token');
  res.json({ ok: true });
});

module.exports = router;
