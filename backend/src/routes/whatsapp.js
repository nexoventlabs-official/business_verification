const express = require('express');
const meta = require('../services/metaApi');
const { forceManualReview } = require('../services/displayNameReview');
const store = require('../db/store');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

async function userToken(uid) {
  const u = await store.getAccount(uid);
  if (!u?.fbToken) {
    const e = new Error('facebook_not_connected');
    e.status = 401;
    throw e;
  }
  return u.fbToken;
}

/**
 * Full per-user portfolio: businesses + WABAs + phone numbers + display names.
 * Pulled live from Meta using THIS user's access_token (stored in DB after FB login).
 */
router.get('/portfolio', requireAuth, async (req, res, next) => {
  try {
    const u = await store.getAccount(req.user.uid);
    if (!u) return res.status(404).json({ error: 'user_not_found' });
    const token = await userToken(req.user.uid);

    const businesses = [];
    for (const bid of u.businessIds || []) {
      try {
        const [info, owned, shared] = await Promise.allSettled([
          meta.getBusinessInfo(token, bid),
          meta.listOwnedWabas(token, bid),
          meta.listSharedWabas(token, bid),
        ]);
        businesses.push({
          id: bid,
          name: info.value?.name,
          verification_status: info.value?.verification_status,
          owned_wabas: owned.value || [],
          shared_wabas: shared.value || [],
        });
      } catch (_) {}
    }

    const allWabaInfo = businesses.flatMap((b) => [...(b.owned_wabas || []), ...(b.shared_wabas || [])]);
    const wabas = [];
    for (const wid of u.wabaIds || []) {
      try {
        const phones = await meta.listPhoneNumbers(token, wid);
        const wabaInfo = allWabaInfo.find((w) => w.id === wid);
        wabas.push({
          id: wid,
          name: wabaInfo?.name,
          account_review_status: wabaInfo?.account_review_status,
          business_verification_status: wabaInfo?.business_verification_status,
          phones,
        });
      } catch (_) {}
    }

    res.json({
      user: { id: u.id, name: u.name, email: u.email },
      businesses,
      wabas,
    });
  } catch (e) { next(e); }
});

router.get('/wabas', requireAuth, async (req, res, next) => {
  try {
    const u = await store.getAccount(req.user.uid);
    const token = await userToken(req.user.uid);
    const out = [];
    for (const wid of u.wabaIds || []) {
      const phones = await meta.listPhoneNumbers(token, wid);
      out.push({ id: wid, phones });
    }
    res.json(out);
  } catch (e) { next(e); }
});

router.get('/phones', requireAuth, async (req, res, next) => {
  try {
    res.json(await store.listPhonesByUser(req.user.uid));
  } catch (e) { next(e); }
});

/**
 * Path A: "Use a display name only" (existing number already on WhatsApp)
 * We DO NOT use Meta's auto display-name shortcut. We always push the name
 * through manual review via POST /{phone_number_id}.
 */
router.post('/phone/display-name-only', requireAuth, async (req, res, next) => {
  try {
    const { phoneNumberId, displayName } = req.body;
    if (!phoneNumberId || !displayName) return res.status(400).json({ error: 'missing_fields' });
    const token = await userToken(req.user.uid);

    const result = await forceManualReview({ token, phoneNumberId, displayName });

    await store.upsertPhone({
      id: phoneNumberId,
      userId: req.user.uid,
      verified_name: result.submittedName,
      name_status: result.phone?.name_status || 'PENDING_REVIEW',
      review_path: 'display_name_only_forced_review',
      updatedAt: Date.now(),
    });

    res.json({ ok: true, ...result });
  } catch (e) { next(e); }
});

/**
 * Path B: "Add a new number" — full registration flow.
 * Steps:
 *   1) request_code (SMS/voice)
 *   2) verify_code
 *   3) register (Cloud API PIN)
 *   4) FORCE manual review on the display name
 */
router.post('/phone/add/request-code', requireAuth, async (req, res, next) => {
  try {
    const { phoneNumberId, method = 'SMS', locale = 'en_US' } = req.body;
    const token = await userToken(req.user.uid);
    const data = await meta.requestVerificationCode(token, phoneNumberId, method, locale);
    res.json(data);
  } catch (e) { next(e); }
});

router.post('/phone/add/verify-code', requireAuth, async (req, res, next) => {
  try {
    const { phoneNumberId, code } = req.body;
    const token = await userToken(req.user.uid);
    const data = await meta.verifyCode(token, phoneNumberId, code);
    res.json(data);
  } catch (e) { next(e); }
});

router.post('/phone/add/register', requireAuth, async (req, res, next) => {
  try {
    const { phoneNumberId, pin, displayName } = req.body;
    if (!phoneNumberId || !pin) return res.status(400).json({ error: 'missing_fields' });
    const token = await userToken(req.user.uid);

    await meta.registerPhoneNumber(token, phoneNumberId, pin);

    let review = { skipped: true };
    if (displayName) {
      review = await forceManualReview({ token, phoneNumberId, displayName });
    }

    const refreshed = await meta.getPhoneNumber(token, phoneNumberId);
    await store.upsertPhone({
      id: phoneNumberId,
      userId: req.user.uid,
      display_phone_number: refreshed.display_phone_number,
      verified_name: refreshed.verified_name,
      name_status: refreshed.name_status,
      code_verification_status: refreshed.code_verification_status,
      status: refreshed.status,
      review_path: 'add_new_number_forced_review',
      updatedAt: Date.now(),
    });

    res.json({ ok: true, phone: refreshed, review });
  } catch (e) { next(e); }
});

router.get('/phone/:id', requireAuth, async (req, res, next) => {
  try {
    const token = await userToken(req.user.uid);
    const data = await meta.getPhoneNumber(token, req.params.id);
    res.json(data);
  } catch (e) { next(e); }
});

router.post('/waba/:id/subscribe', requireAuth, async (req, res, next) => {
  try {
    const token = await userToken(req.user.uid);
    const data = await meta.subscribeAppToWaba(token, req.params.id);
    res.json(data);
  } catch (e) { next(e); }
});

module.exports = router;
