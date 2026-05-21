import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, Loader2 } from 'lucide-react';
import { api, markLoggedIn } from '../api.js';

export default function Register({ onAuthed }) {
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const { data } = await api.post('/api/auth/register', form);
      markLoggedIn();
      onAuthed(data.user);
      nav('/setup');
    } catch (err) {
      const msg = err?.response?.data?.error || err.message;
      setError(msg === 'email_already_registered' ? 'This email is already registered. Please login.' : msg);
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
            <MessageSquare className="text-white" size={20} />
          </div>
          <span className="text-white text-xl font-bold">BSP Console</span>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-xl font-bold text-slate-800 mb-1">Create your account</h1>
          <p className="text-sm text-slate-500 mb-6">Set up your WhatsApp BSP in 3 simple steps.</p>

          <div className="flex gap-2 mb-6">
            {['Account', 'Meta App', 'Connect WA'].map((s, i) => (
              <div key={s} className={`flex-1 text-center text-xs py-1 rounded-full font-medium ${i === 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>{i+1}. {s}</div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
              <input className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-slate-50"
                value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Your name" required autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
              <input type="email" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-slate-50"
                value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@company.com" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password <span className="text-slate-400 font-normal">(min 6 chars)</span></label>
              <input type="password" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-slate-50"
                value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="••••••••" required />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2.5">
                <span className="shrink-0">⚠</span> {error}
              </div>
            )}

            <button type="submit" disabled={busy}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors">
              {busy ? <><Loader2 size={15} className="animate-spin" /> Creating account…</> : 'Create Account →'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-green-600 hover:underline font-semibold">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
