import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Loader2, ExternalLink } from 'lucide-react';
import { api } from '../api.js';

export default function TenantSetup({ onSetupDone }) {
  const nav = useNavigate();
  const [form, setForm] = useState({ metaAppId: '', metaAppSecret: '', metaConfigId: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      await api.post('/api/auth/tenant-setup', form);
      onSetupDone?.();
      nav('/connect');
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 w-full max-w-lg">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound className="text-indigo-500" size={20} />
          <h1 className="text-xl font-semibold text-slate-800">Connect your Meta App</h1>
        </div>
        <p className="text-sm text-slate-500 mb-6">
          Enter your Meta App credentials. These are stored securely and used to connect your WhatsApp Business account.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 text-xs text-blue-800">
          <b>Where to find these?</b>{' '}
          Go to <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-0.5">
            developers.facebook.com/apps <ExternalLink size={10} />
          </a> → Your App → Settings → Basic
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Meta App ID" hint="From App Settings → Basic">
            <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={form.metaAppId} onChange={(e) => set('metaAppId', e.target.value)} placeholder="1234567890" required />
          </Field>
          <Field label="Meta App Secret" hint="Keep this private">
            <input type="password" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={form.metaAppSecret} onChange={(e) => set('metaAppSecret', e.target.value)} placeholder="••••••••••••" required />
          </Field>
          <Field label="Login for Business Config ID" hint="From Facebook Login for Business → Configurations">
            <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={form.metaConfigId} onChange={(e) => set('metaConfigId', e.target.value)} placeholder="9876543210" required />
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={busy}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2 text-sm">
            {busy ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : 'Save & Continue →'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-0.5">{label}</label>
      {hint && <p className="text-xs text-slate-400 mb-1">{hint}</p>}
      {children}
    </div>
  );
}
