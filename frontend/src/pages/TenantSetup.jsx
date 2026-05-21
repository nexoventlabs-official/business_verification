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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
            <KeyRound className="text-white" size={18} />
          </div>
          <span className="text-white text-xl font-bold">BSP Console</span>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex gap-2 mb-6">
            {['Account', 'Meta App', 'Connect WA'].map((s, i) => (
              <div key={s} className={`flex-1 text-center text-xs py-1 rounded-full font-medium ${i === 1 ? 'bg-green-100 text-green-700' : i < 1 ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{i+1}. {s}</div>
            ))}
          </div>

          <h1 className="text-xl font-bold text-slate-800 mb-1">Connect your Meta App</h1>
          <p className="text-sm text-slate-500 mb-5">Enter credentials from your Meta Developer App. Stored encrypted — never shared.</p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-xs text-amber-800">
            <b>⚠ Required Meta Portal settings before connecting:</b>
            <ul className="mt-1.5 space-y-1 list-disc list-inside">
              <li><b>App Domains</b> (Settings → Basic): <code className="bg-amber-100 px-1 rounded">business-verification.onrender.com</code></li>
              <li><b>Valid OAuth Redirect URIs</b> (Facebook Login for Business → Settings): <code className="bg-amber-100 px-1 rounded">https://business-verification.onrender.com/api/auth/facebook/callback</code></li>
            </ul>
            <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 mt-2 underline font-medium">
              Open Meta Developer Portal <ExternalLink size={10} />
            </a>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Meta App ID" hint="Settings → Basic → App ID">
              <input className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-slate-50 font-mono"
                value={form.metaAppId} onChange={(e) => set('metaAppId', e.target.value)} placeholder="1509484690547937" required autoFocus />
            </Field>
            <Field label="Meta App Secret" hint="Settings → Basic → App Secret (click Show)">
              <input type="password" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-slate-50"
                value={form.metaAppSecret} onChange={(e) => set('metaAppSecret', e.target.value)} placeholder="••••••••••••••••••••••••••••••••" required />
            </Field>
            <Field label="Login for Business Config ID" hint="Facebook Login for Business → Configurations → your config ID">
              <input className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-slate-50 font-mono"
                value={form.metaConfigId} onChange={(e) => set('metaConfigId', e.target.value)} placeholder="9876543210" required />
            </Field>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2.5">
                <span className="shrink-0">⚠</span> {error}
              </div>
            )}

            <button type="submit" disabled={busy}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors">
              {busy ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : 'Save & Continue →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-0.5">{label}</label>
      {hint && <p className="text-xs text-slate-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}
