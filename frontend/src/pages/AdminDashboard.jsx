import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Building2, MessageSquare, LogOut, RefreshCw, Loader2, ShieldCheck } from 'lucide-react';
import { api } from '../api.js';

export default function AdminDashboard() {
  const nav = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const [s, u] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/users'),
      ]);
      setStats(s.data);
      setUsers(u.data);
    } catch (e) {
      if (e?.response?.status === 401) nav('/admin');
      else setError(e?.response?.data?.error || e.message);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleLogout() {
    await api.post('/api/admin/logout').catch(() => {});
    nav('/admin');
  }

  if (loading) return (
    <div className="p-12 flex items-center gap-2 text-slate-500">
      <Loader2 size={18} className="animate-spin" /> Loading…
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-indigo-600" size={22} />
          <h1 className="text-xl font-semibold text-slate-800">BSP Admin Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-1.5">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={handleLogout} className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 border border-red-200 rounded-lg px-3 py-1.5">
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      {error && <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard icon={<Users size={20} className="text-blue-500" />} label="Connected Users" value={stats.users} />
          <StatCard icon={<Building2 size={20} className="text-indigo-500" />} label="Businesses" value={stats.businesses} />
          <StatCard icon={<MessageSquare size={20} className="text-emerald-500" />} label="WABAs" value={stats.wabas} />
        </div>
      )}

      {/* Users table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Users size={16} className="text-slate-500" />
          <h2 className="font-semibold text-slate-700 text-sm">Connected Businesses</h2>
        </div>

        {users.length === 0 ? (
          <div className="px-5 py-10 text-center text-slate-400 text-sm">No users connected yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3 text-left">User</th>
                <th className="px-5 py-3 text-left">Facebook ID</th>
                <th className="px-5 py-3 text-left">WABAs</th>
                <th className="px-5 py-3 text-left">Businesses</th>
                <th className="px-5 py-3 text-left">Connected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <div className="font-medium text-slate-800">{u.name || '—'}</div>
                    <div className="text-xs text-slate-400">{u.email || ''}</div>
                  </td>
                  <td className="px-5 py-3">
                    <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{u.id}</code>
                  </td>
                  <td className="px-5 py-3">
                    {(u.wabaIds || []).length > 0 ? (
                      <div className="space-y-1">
                        {u.wabaIds.map((w) => (
                          <code key={w} className="block text-xs bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">{w}</code>
                        ))}
                      </div>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    {(u.businessIds || []).length > 0 ? (
                      <div className="space-y-1">
                        {u.businessIds.map((b) => (
                          <code key={b} className="block text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">{b}</code>
                        ))}
                      </div>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4">
      <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
      <div>
        <div className="text-2xl font-bold text-slate-800">{value ?? '—'}</div>
        <div className="text-xs text-slate-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
}
