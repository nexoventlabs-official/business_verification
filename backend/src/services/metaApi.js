const axios = require('axios');
const FormData = require('form-data');

const BASE = `${process.env.META_GRAPH_BASE || 'https://graph.facebook.com'}/${process.env.META_GRAPH_VERSION || 'v23.0'}`;

function client(token) {
  return axios.create({
    baseURL: BASE,
    headers: { Authorization: `Bearer ${token}` },
    timeout: 30000,
  });
}

/* ---------- OAuth (per-tenant credentials) ---------- */
async function exchangeCodeForToken({ code, appId, appSecret, redirectUri }) {
  const params = { client_id: appId, client_secret: appSecret, code };
  if (redirectUri) params.redirect_uri = redirectUri;
  const { data } = await axios.get(`${BASE}/oauth/access_token`, { params });
  return data; // { access_token, token_type, expires_in }
}

async function exchangeForLongLived({ shortToken, appId, appSecret }) {
  const { data } = await axios.get(`${BASE}/oauth/access_token`, {
    params: {
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: shortToken,
    },
  });
  return data;
}

async function debugToken({ token, appId, appSecret }) {
  const { data } = await axios.get(`${BASE}/debug_token`, {
    params: {
      input_token: token,
      access_token: `${appId}|${appSecret}`,
    },
  });
  return data.data;
}

/* ---------- Business assets ---------- */
async function getMe(token) {
  const { data } = await client(token).get('/me', { params: { fields: 'id,name,email' } });
  return data;
}

async function listBusinesses(token) {
  const { data } = await client(token).get('/me/businesses', {
    params: { fields: 'id,name,verification_status' },
  });
  return data.data || [];
}

async function listOwnedWabas(token, businessId) {
  const { data } = await client(token).get(`/${businessId}/owned_whatsapp_business_accounts`, {
    params: { fields: 'id,name,currency,timezone_id,account_review_status,business_verification_status' },
  });
  return data.data || [];
}

async function listSharedWabas(token, businessId) {
  const { data } = await client(token).get(`/${businessId}/client_whatsapp_business_accounts`, {
    params: { fields: 'id,name,account_review_status,business_verification_status' },
  });
  return data.data || [];
}

async function listPhoneNumbers(token, wabaId) {
  const { data } = await client(token).get(`/${wabaId}/phone_numbers`, {
    params: {
      fields:
        'id,display_phone_number,verified_name,name_status,code_verification_status,quality_rating,status,platform_type',
    },
  });
  return data.data || [];
}

/* ---------- Phone number registration ---------- */
async function registerPhoneNumber(token, phoneNumberId, pin) {
  const { data } = await client(token).post(`/${phoneNumberId}/register`, {
    messaging_product: 'whatsapp',
    pin,
  });
  return data;
}

async function requestVerificationCode(token, phoneNumberId, method = 'SMS', locale = 'en_US') {
  const { data } = await client(token).post(`/${phoneNumberId}/request_code`, {
    code_method: method,
    locale,
  });
  return data;
}

async function verifyCode(token, phoneNumberId, code) {
  const { data } = await client(token).post(`/${phoneNumberId}/verify_code`, { code });
  return data;
}

/**
 * CORE forced-review call.
 * Submitting a fresh verified_name request via POST /{phone_number_id}
 * always pushes the display name into Meta manual review (NAME_STATUS=PENDING_REVIEW),
 * regardless of whether Embedded Signup tried to auto-approve it.
 */
async function submitDisplayNameForReview(token, phoneNumberId, verifiedName) {
  const { data } = await client(token).post(`/${phoneNumberId}`, {
    verified_name: verifiedName,
  });
  return data;
}

async function getPhoneNumber(token, phoneNumberId) {
  const { data } = await client(token).get(`/${phoneNumberId}`, {
    params: {
      fields:
        'id,display_phone_number,verified_name,name_status,code_verification_status,quality_rating,status',
    },
  });
  return data;
}

/* ---------- Subscribe app to WABA (required to receive webhooks) ---------- */
async function subscribeAppToWaba(token, wabaId) {
  const { data } = await client(token).post(`/${wabaId}/subscribed_apps`);
  return data;
}

/* ---------- Business Verification ---------- */

/**
 * Fetch business details + current verification_status from Meta.
 * Fields: id, name, verification_status, support_email, link
 * (primary_page removed — causes 400 with standard user tokens)
 */
async function getBusinessInfo(token, businessId) {
  const { data } = await client(token).get(`/${businessId}`, {
    params: { fields: 'id,name,verification_status,support_email,link' },
  });
  return data;
}

/**
 * Create a verification document set of a given type.
 * type: 'BUSINESS_REGISTRATION' | 'BANK_STATEMENT' | 'UTILITY_BILL' | 'GOVERNMENT_ID'
 * Returns { id: <docSetId> }
 */
async function createVerificationDocumentSet(token, businessId, setType) {
  const { data } = await client(token).post(`/${businessId}/verification_document_sets`, {
    type: setType,
  });
  return data;
}

/**
 * Upload a document file (Buffer) into an existing document set.
 * docType: e.g. 'MSME_CERTIFICATE', 'BANK_STATEMENT'
 */
async function uploadVerificationDocument(token, docSetId, docType, fileBuffer, fileName, mimeType) {
  const form = new FormData();
  form.append('type', docType);
  form.append('file', fileBuffer, { filename: fileName, contentType: mimeType });
  const { data } = await axios.post(`${BASE}/${docSetId}/verification_documents`, form, {
    headers: {
      ...form.getHeaders(),
      Authorization: `Bearer ${token}`,
    },
    timeout: 60000,
  });
  return data;
}

/**
 * Send a verification code email to the given business email address.
 * Meta sends a 6-digit OTP to this email.
 */
async function sendBusinessEmailVerification(token, businessId, email) {
  const { data } = await client(token).post(`/${businessId}/request_email_verification`, {
    email,
  });
  return data;
}

/**
 * Confirm the OTP code that Meta emailed to the business address.
 */
async function confirmBusinessEmailCode(token, businessId, email, code) {
  const { data } = await client(token).post(`/${businessId}/verify_email_code`, {
    email,
    code,
  });
  return data;
}

/**
 * Final call: submit the uploaded documents for Meta's manual review.
 */
async function submitBusinessVerification(token, businessId) {
  const { data } = await client(token).post(`/${businessId}/submit_business_verification`);
  return data;
}

module.exports = {
  exchangeCodeForToken,
  exchangeForLongLived,
  debugToken,
  getMe,
  listBusinesses,
  listOwnedWabas,
  listSharedWabas,
  listPhoneNumbers,
  registerPhoneNumber,
  requestVerificationCode,
  verifyCode,
  submitDisplayNameForReview,
  getPhoneNumber,
  subscribeAppToWaba,
  getBusinessInfo,
  createVerificationDocumentSet,
  uploadVerificationDocument,
  sendBusinessEmailVerification,
  confirmBusinessEmailCode,
  submitBusinessVerification,
};
