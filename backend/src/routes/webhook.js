const express = require('express');
const crypto = require('crypto');
const store = require('../db/store');

const router = express.Router();

/**
 * Per-tenant webhook URL: /api/webhook/:tenantId
 * Each tenant configures THIS URL inside their own Meta app's webhook config,
 * with their own verifyToken. We look up both from the DB.
 */
router.get('/:tenantId', (req, res) => {
  const tenant = store.getTenant(req.params.tenantId);
  if (!tenant) return res.sendStatus(404);
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token && token === tenant.webhookVerifyToken) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

router.post('/:tenantId', express.json({ verify: rawBody }), (req, res) => {
  const tenant = store.getTenant(req.params.tenantId);
  if (!tenant) return res.sendStatus(404);

  // Verify Meta's HMAC signature using THIS tenant's app secret
  if (tenant.metaAppSecret) {
    const sig = req.get('x-hub-signature-256');
    const expected =
      'sha256=' +
      crypto
        .createHmac('sha256', tenant.metaAppSecret)
        .update(req._raw || '')
        .digest('hex');
    if (sig !== expected) return res.sendStatus(401);
  }

  const body = req.body || {};
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      // Track display name + account review status updates
      if (change.field === 'phone_number_name_update' || change.field === 'account_update') {
        const v = change.value || {};
        if (v.phone_number_id) {
          store.upsertPhone({
            id: v.phone_number_id,
            name_status: v.decision || v.display_phone_number_name_status,
            verified_name: v.requested_verified_name || v.verified_name,
            updatedAt: Date.now(),
          });
        }
      }
    }
  }
  res.sendStatus(200);
});

function rawBody(req, _res, buf) {
  req._raw = buf.toString('utf8');
}

module.exports = router;
