# BSP — WhatsApp Business Solution Provider (Wati / AiSensy style)

End-to-end onboarding for WhatsApp Cloud API with **forced Meta manual review** of the
business display name. Built so every phone number you onboard lands in
`PENDING_REVIEW` / `IN_REVIEW` instead of `available_without_review`.

```
bsp/
├── backend/        Node + Express, Meta Graph API integration
│   ├── server.js
│   ├── .env.example
│   └── src/
│       ├── routes/        (auth, whatsapp, webhook)
│       ├── services/      (metaApi, displayNameReview)
│       ├── middleware/    (auth/jwt)
│       └── db/store.js    (JSON file store; swap for Postgres later)
└── frontend/       React + Vite + Tailwind
    ├── index.html
    └── src/
        ├── pages/   (Login, PhoneSetup, PendingReview, Dashboard)
        ├── fbSdk.js (Embedded Signup launcher)
        └── api.js
```

## How "forced manual review" works

Meta auto-approves a display name as `available_without_review` when:
- the user goes through Embedded Signup → "Use a display name only", AND
- the requested name matches the legal/verified business name.

To prevent this, **after** the Embedded Signup completes the backend always calls:

```
POST /{phone_number_id}
{ "verified_name": "<the user-entered name>" }
```

This API submits a fresh display-name request which Meta routes through
**manual review**. Result: `name_status` becomes `PENDING_REVIEW` (matches your
`in review.png` screenshot).

Implementation: `backend/src/services/displayNameReview.js`, called from
`backend/src/routes/whatsapp.js` for both the "display name only" and
"add a new number" flows.

You can additionally set `DISPLAY_NAME_SUFFIX` in `.env` to defeat any future
heuristic that might short-circuit names exactly matching the business name.

## Setup

### 1. Backend
```bash
cd bsp/backend
cp .env.example .env
# fill in META_APP_ID, META_APP_SECRET, META_CONFIG_ID, META_REDIRECT_URI, etc.
npm install
npm run dev
```

### 2. Frontend
```bash
cd bsp/frontend
cp .env.example .env
npm install
npm run dev
```
Open http://localhost:5173.

## Meta App requirements

In your Meta developer dashboard:

1. **App type:** Business.
2. **Products enabled:** WhatsApp, Facebook Login for Business.
3. **Configuration (Embedded Signup):** create one under *Facebook Login for Business → Configurations*. Copy the `config_id` into `META_CONFIG_ID`.
4. **Permissions in the configuration:** `whatsapp_business_management`, `whatsapp_business_messaging`, `business_management`.
5. **Valid OAuth redirect URIs:** add `META_REDIRECT_URI` exactly.
6. **Webhook (optional):** point to `${BACKEND}/api/webhook` and subscribe to `account_update` and `phone_number_name_update` on each WABA.

## Onboarding flow (matches the reference screenshots)

1. **Connect with Facebook** — `Login.jsx` launches Embedded Signup with `config_id`.
2. **Business portfolio + WABA** — surfaced from `/me/businesses` and `/{business_id}/owned_whatsapp_business_accounts`.
3. **Business info** — handled inside Embedded Signup itself.
4. **Add phone number** — `PhoneSetup.jsx` offers:
   - *Use a display name only* (existing number) → backend calls forced-review endpoint.
   - *Add a new number* → request_code → verify_code → register → forced-review endpoint.
5. **Pending review** — `PendingReview.jsx` polls `GET /{phone_number_id}` until Meta updates `name_status`.

## What you still plug in

- Meta credentials in `backend/.env`.
- A real database (replace `src/db/store.js`).
- Production hosting + HTTPS for the OAuth redirect URI and webhook.
- Template management, flows, payment configuration UIs (the auth + token
  scaffolding is already done, so these are just additional Graph API calls
  using the stored long-lived user token).
