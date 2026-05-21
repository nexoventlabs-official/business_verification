const express = require('express');
const { v4: uuid } = require('uuid');
const meta = require('../services/metaApi');
const store = require('../db/store');
const { sign, requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * Public config — safe to expose (no secret).
 * The frontend uses appId + configId to initialise the FB SDK and launch Embedded Signup.
 */
router.get('/config', (_req, res) => {
  const { META_APP_ID, META_CONFIG_ID, META_GRAPH_VERSION } = process.env;
  if (!META_APP_ID || !META_CONFIG_ID) {
    return res.status(500).json({ error: 'BSP Meta credentials not configured in .env' });
  }
  res.json({
    appId: META_APP_ID,
    configId: META_CONFIG_ID,
    graphVersion: META_GRAPH_VERSION || 'v23.0',
  });
});

/**
 * Embedded Signup completion. The frontend posts: { code, signupSession }
 * Credentials come from .env — no tenant setup required.
 */
router.post('/facebook/exchange', async (req, res, next) => {
  try {
    const { code, signupSession } = req.body;
    if (!code) return res.status(400).json({ error: 'missing_code' });

    const creds = {
      appId: process.env.META_APP_ID,
      appSecret: process.env.META_APP_SECRET,
      redirectUri: process.env.META_REDIRECT_URI,
    };
    if (!creds.appId || !creds.appSecret) {
      return res.status(500).json({ error: 'BSP Meta credentials not configured in .env' });
    }

    const shortLived = await meta.exchangeCodeForToken({ code, ...creds });
    const longLived = await meta.exchangeForLongLived({ shortToken: shortLived.access_token, ...creds });
    const userToken = longLived.access_token;

    const me = await meta.getMe(userToken);
    const dbg = await meta.debugToken({ token: userToken, ...creds });

    // Pull WABA + business IDs surfaced by Embedded Signup granular scopes
    const granular = dbg.granular_scopes || [];
    const wabaIds = granular.find((s) => s.scope === 'whatsapp_business_management')?.target_ids || [];
    const businessIds = granular.find((s) => s.scope === 'business_management')?.target_ids || [];

    const userId = me.id;
    await store.upsertUser({
      id: userId,
      name: me.name,
      email: me.email,
      fbToken: userToken,
      tokenExpiresIn: longLived.expires_in,
      wabaIds,
      businessIds,
      signupSession: signupSession || null,
      createdAt: Date.now(),
    });

    // Hydrate businesses + WABAs + phone numbers for the UI
    const businesses = [];
    for (const bid of businessIds) {
      try {
        const owned = await meta.listOwnedWabas(userToken, bid);
        const shared = await meta.listSharedWabas(userToken, bid);
        businesses.push({ id: bid, owned_wabas: owned, shared_wabas: shared });
      } catch (_) {}
    }

    const wabas = [];
    for (const wid of wabaIds) {
      try {
        const phones = await meta.listPhoneNumbers(userToken, wid);
        wabas.push({ id: wid, phones });
        await store.upsertWaba({ id: wid, userId, phones });
        for (const p of phones) {
          await store.upsertPhone({
            id: p.id,
            wabaId: wid,
            userId,
            display_phone_number: p.display_phone_number,
            verified_name: p.verified_name,
            name_status: p.name_status,
            code_verification_status: p.code_verification_status,
            status: p.status,
          });
        }
      } catch (_) {}
    }

    const jwtToken = sign({ uid: userId });
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('bsp_token', jwtToken, {
      httpOnly: true,
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd,
    });

    res.json({
      user: { id: userId, name: me.name, email: me.email },
      businesses,
      wabas,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const u = await store.getUser(req.user.uid);
    if (!u) return res.status(404).json({ error: 'not_found' });
    const { fbToken, ...safe } = u;
    res.json(safe);
  } catch (e) { next(e); }
});

router.post('/logout', (req, res) => {
  res.clearCookie('bsp_token');
  res.json({ ok: true });
});

module.exports = router;
