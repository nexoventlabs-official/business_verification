const express = require('express');
const multer = require('multer');
const meta = require('../services/metaApi');
const store = require('../db/store');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
});

async function userToken(uid) {
  const u = await store.getUser(uid);
  if (!u?.fbToken) {
    const e = new Error('facebook_not_connected');
    e.status = 401;
    throw e;
  }
  return u.fbToken;
}

async function assertBusiness(req, businessId) {
  const u = await store.getUser(req.user.uid);
  if (!(u?.businessIds || []).includes(businessId)) {
    const e = new Error('business_not_found_for_user');
    e.status = 403;
    throw e;
  }
}

/**
 * GET /:businessId/status
 * Fetch live business info from Meta + any locally stored verification progress.
 */
router.get('/:businessId/status', requireAuth, async (req, res, next) => {
  try {
    const { businessId } = req.params;
    await assertBusiness(req, businessId);
    const token = await userToken(req.user.uid);

    const info = await meta.getBusinessInfo(token, businessId);
    const stored = await store.getVerification(businessId) || {};

    res.json({ ...info, ...stored });
  } catch (e) { next(e); }
});

/**
 * POST /:businessId/documents
 * Receives MSME certificate + bank statement from the browser (multipart),
 * creates a verification document set for each on Meta, then uploads the file.
 *
 * Fields:
 *   msme         — MSME / Udyam registration certificate (PDF / JPG / PNG)
 *   bankStatement — Bank statement showing business address (PDF / JPG / PNG)
 */
router.post(
  '/:businessId/documents',
  requireAuth,
  upload.fields([
    { name: 'msme', maxCount: 1 },
    { name: 'bankStatement', maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      const { businessId } = req.params;
      await assertBusiness(req, businessId);
      const token = await userToken(req.user.uid);

      const files = req.files || {};
      if (!files.msme || !files.bankStatement) {
        return res.status(400).json({
          error: 'Both MSME certificate and bank statement are required.',
        });
      }

      const msmeFile = files.msme[0];
      const bankFile = files.bankStatement[0];

      // --- MSME: business registration / name proof ---
      const msmeSet = await meta.createVerificationDocumentSet(
        token, businessId, 'BUSINESS_REGISTRATION'
      );
      await meta.uploadVerificationDocument(
        token,
        msmeSet.id,
        'MSME_CERTIFICATE',
        msmeFile.buffer,
        msmeFile.originalname,
        msmeFile.mimetype
      );

      // --- Bank statement: address proof ---
      const bankSet = await meta.createVerificationDocumentSet(
        token, businessId, 'BANK_STATEMENT'
      );
      await meta.uploadVerificationDocument(
        token,
        bankSet.id,
        'BANK_STATEMENT',
        bankFile.buffer,
        bankFile.originalname,
        bankFile.mimetype
      );

      await store.upsertVerification(businessId, {
        businessId,
        docsUploaded: true,
        msmeSetId: msmeSet.id,
        bankSetId: bankSet.id,
        msmeFileName: msmeFile.originalname,
        bankFileName: bankFile.originalname,
      });

      res.json({ ok: true, msmeSetId: msmeSet.id, bankSetId: bankSet.id });
    } catch (e) { next(e); }
  }
);

/**
 * POST /:businessId/email/send
 * Ask Meta to send a 6-digit OTP to the provided business email address.
 * Body: { email }
 */
router.post('/:businessId/email/send', requireAuth, async (req, res, next) => {
  try {
    const { businessId } = req.params;
    await assertBusiness(req, businessId);
    const token = await userToken(req.user.uid);

    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email_required' });

    const result = await meta.sendBusinessEmailVerification(token, businessId, email);
    await store.upsertVerification(businessId, { businessId, emailSentTo: email });

    res.json({ ok: true, ...result });
  } catch (e) { next(e); }
});

/**
 * POST /:businessId/email/verify
 * Submit the OTP code received in the email to Meta.
 * Body: { email, code }
 */
router.post('/:businessId/email/verify', requireAuth, async (req, res, next) => {
  try {
    const { businessId } = req.params;
    await assertBusiness(req, businessId);
    const token = await userToken(req.user.uid);

    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'email_and_code_required' });

    const result = await meta.confirmBusinessEmailCode(token, businessId, email, code);
    await store.upsertVerification(businessId, {
      businessId,
      emailVerified: true,
      verifiedEmail: email,
    });

    res.json({ ok: true, ...result });
  } catch (e) { next(e); }
});

/**
 * POST /:businessId/submit
 * Final step: submit the collected documents + verified email for Meta review.
 */
router.post('/:businessId/submit', requireAuth, async (req, res, next) => {
  try {
    const { businessId } = req.params;
    await assertBusiness(req, businessId);
    const token = await userToken(req.user.uid);

    const result = await meta.submitBusinessVerification(token, businessId);
    await store.upsertVerification(businessId, {
      businessId,
      submitted: true,
      submittedAt: Date.now(),
    });

    res.json({ ok: true, ...result });
  } catch (e) { next(e); }
});

module.exports = router;
