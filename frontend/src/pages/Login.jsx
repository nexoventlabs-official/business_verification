import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, Loader2 } from 'lucide-react';
import { api, markLoggedIn } from '../api.js';

export default function Login({ onAuthed }) {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 w-full max-w-md">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="text-emerald-500" size={22} />
          <h1 className="text-xl font-semibold text-slate-800">Sign in</h1>
        </div>
        <p className="text-sm text-slate-500 mb-7">Welcome back. Enter your credentials to continue.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input type="password" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={busy}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2 text-sm">
            {busy ? <><Loader2 size={15} className="animate-spin" /> Signing in…</> : 'Sign In'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Don't have an account?{' '}
          <Link to="/register" className="text-indigo-600 hover:underline font-medium">Register</Link>
        </p>
      </div>
    </div>
  );
}
