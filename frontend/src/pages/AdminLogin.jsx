import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { api } from '../api.js';

export default function AdminLogin({ onAuthed }) {
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await api.post('/api/admin/login', { username, password });
      onAuthed?.();
      nav('/admin/dashboard');
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 w-full max-w-md">
        <div className="flex items-center gap-2 mb-6">
          <ShieldCheck className="text-indigo-600" size={24} />
          <h1 className="text-xl font-semibold text-slate-800">BSP Admin Panel</h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="admin" required autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit" disabled={busy}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2"
          >
            {busy ? <><Loader2 size={16} className="animate-spin" /> Signing in…</> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
