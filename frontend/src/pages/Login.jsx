import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, Loader2, Eye, EyeOff } from 'lucide-react';
import { api, markLoggedIn } from '../api.js';

export default function Login({ onAuthed }) {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      markLoggedIn();
      onAuthed(data.user);
      if (!data.user.hasMeta) nav('/setup');
      else if (!data.user.fbConnected) nav('/connect');
      else nav('/portfolio');
    } catch (err) {
      const msg = err?.response?.data?.error || err.message;
      setError(msg === 'invalid_credentials' ? 'Invalid email or password.' : msg);
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
          <h1 className="text-xl font-bold text-slate-800 mb-1">Welcome back</h1>
          <p className="text-sm text-slate-500 mb-6">Sign in to your BSP account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
              <input type="email" className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent bg-slate-50"
                value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent bg-slate-50 pr-10"
                  value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2.5">
                <span className="shrink-0">⚠</span> {error}
              </div>
            )}

            <button type="submit" disabled={busy}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors">
              {busy ? <><Loader2 size={15} className="animate-spin" /> Signing in…</> : 'Sign In →'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            New to BSP Console?{' '}
            <Link to="/register" className="text-green-600 hover:underline font-semibold">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
