const express = require('express');
const { v4: uuid } = require('uuid');
const store = require('../db/store');

const router = express.Router();

/**
 * Create a tenant. Each tenant brings their OWN Meta app credentials.
 * This endpoint is intentionally public so that a brand-new user can register
 * their Meta app credentials before doing Facebook login. In production you
 * should protect this with admin auth or rate-limit it.
 */
router.post('/', (req, res) => {
  const {
    name,
    metaAppId,
    metaAppSecret,
    metaConfigId,
    metaRedirectUri,
    webhookVerifyToken,
  } = req.body || {};

  if (!metaAppId || !metaAppSecret || !metaConfigId || !metaRedirectUri) {
    return res.status(400).json({ error: 'missing_meta_credentials' });
  }

  const id = uuid();
  const tenant = {
    id,
    name: name || 'Untenanted',
    metaAppId,
    metaAppSecret, // sensitive, never returned to the browser
    metaConfigId,
    metaRedirectUri,
    webhookVerifyToken: webhookVerifyToken || null,
    createdAt: Date.now(),
  };
  store.createTenant(tenant);
  res.json({ ...publicTenant(tenant), webhookUrl: webhookUrlFor(req, id) });
});

function webhookUrlFor(req, tenantId) {
  const base = `${req.protocol}://${req.get('host')}`;
  return `${base}/api/webhook/${tenantId}`;
}

/**
 * Public, safe-to-expose tenant config. The frontend needs appId + configId
 * to launch the Facebook JS SDK / Embedded Signup. The secret never leaves
 * the server.
 */
router.get('/:id/public-config', (req, res) => {
  const t = store.getTenant(req.params.id);
  if (!t) return res.status(404).json({ error: 'tenant_not_found' });
  res.json({
    id: t.id,
    name: t.name,
    appId: t.metaAppId,
    configId: t.metaConfigId,
    redirectUri: t.metaRedirectUri,
    graphVersion: process.env.META_GRAPH_VERSION || 'v23.0',
  });
});

function publicTenant(t) {
  return {
    id: t.id,
    name: t.name,
    appId: t.metaAppId,
    configId: t.metaConfigId,
    redirectUri: t.metaRedirectUri,
  };
}

module.exports = router;
