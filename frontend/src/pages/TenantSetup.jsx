import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, KeyRound } from 'lucide-react';
import { api } from '../api.js';

/**
 * Each tenant brings their OWN Meta app. They paste credentials here, we
 * store them server-side, and link them via tenantId for the rest of the flow.
 */
export default function TenantSetup() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    name: '',
    metaAppId: '',
    metaAppSecret: '',
    metaConfigId: '',
    metaRedirectUri: 'http://localhost:4000/api/auth/facebook/callback',
    webhookVerifyToken: '',
  });
  const [created, setCreated] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const { data } = await api.post('/api/tenants', form);
      localStorage.setItem('bsp_tenant_id', data.id);
      setCreated(data);
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="text-blue-600" />
          <h1 className="text-xl font-semibold text-slate-800">Tenant setup</h1>
        </div>
        <p className="text-sm text-slate-600 mb-6">
          Paste <b>your own</b> Meta app credentials. Each tenant uses their own
          Meta App; nothing is shared in the server's <code>.env</code>.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Tenant / Business name">
            <input className="input" value={form.name} onChange={set('name')} placeholder="Acme Pvt Ltd" />
          </Field>
          <Field label="Meta App ID" icon={<KeyRound size={14} />}>
            <input className="input" value={form.metaAppId} onChange={set('metaAppId')} required />
          </Field>
          <Field label="Meta App Secret" icon={<KeyRound size={14} />}>
            <input className="input" type="password" value={form.metaAppSecret} onChange={set('metaAppSecret')} required />
            <p className="text-xs text-slate-500 mt-1">Stored server-side. Never sent to the browser after this.</p>
          </Field>
          <Field label="Embedded Signup Config ID">
            <input className="input" value={form.metaConfigId} onChange={set('metaConfigId')} required />
          </Field>
          <Field label="OAuth Redirect URI (must match Meta app settings)">
            <input className="input" value={form.metaRedirectUri} onChange={set('metaRedirectUri')} required />
          </Field>
          <Field label="Webhook Verify Token (optional — set the same value in your Meta app's webhook config)">
            <input className="input" value={form.webhookVerifyToken} onChange={set('webhookVerifyToken')} />
          </Field>

          {created && (
            <div className="text-sm bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg p-3 space-y-2">
              <div><b>Tenant created.</b></div>
              <div>Tenant ID: <code>{created.id}</code></div>
              <div>Webhook URL (paste this in your Meta app webhook config): <br/>
                <code className="break-all">{created.webhookUrl}</code>
              </div>
              <button type="button" onClick={() => nav(`/?tenant=${created.id}`)}
                className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg">
                Continue to Facebook login →
              </button>
            </div>
          )}

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="submit" disabled={busy}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg font-medium">
              {busy ? 'Saving…' : 'Save & continue to Facebook login'}
            </button>
          </div>
        </form>
      </div>
      <style>{`.input{width:100%;border:1px solid rgb(203 213 225);border-radius:.5rem;padding:.55rem .75rem;font-size:.9rem;}`}</style>
    </div>
  );
}

function Field({ label, icon, children }) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-1.5">
        {icon}{label}
      </label>
      {children}
    </div>
  );
}
