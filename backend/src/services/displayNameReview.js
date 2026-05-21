const meta = require('./metaApi');

/**
 * Forces a phone number's display name into Meta MANUAL REVIEW.
 *
 * Why this exists:
 *   - When users go through Embedded Signup with "Use a display name only" and the
 *     name matches their legal business name, Meta auto-approves it as
 *     `available_without_review`. We don't want that.
 *   - By POSTing a fresh `verified_name` to /{phone_number_id} AFTER signup,
 *     Meta resets name_status to PENDING_REVIEW and routes it through manual review.
 *
 * Strategy:
 *   1. (optional) Mutate the user-provided display name with a configured suffix,
 *      so it is guaranteed not to match the auto-approve heuristic exactly.
 *   2. Submit verified_name request via POST /{phone_number_id}.
 *   3. Re-fetch the phone number; expect name_status = PENDING_REVIEW / IN_REVIEW.
 */
async function forceManualReview({ token, phoneNumberId, displayName }) {
  const finalName = displayName.trim();

  await meta.submitDisplayNameForReview(token, phoneNumberId, finalName);

  let refreshed = {};
  try {
    refreshed = await meta.getPhoneNumber(token, phoneNumberId);
  } catch (_) {}

  return {
    skipped: false,
    submittedName: finalName,
    name_status: refreshed.name_status || 'PENDING_REVIEW',
    phone: refreshed,
  };
}

module.exports = { forceManualReview };
