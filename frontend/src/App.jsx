import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import PhoneSetup from './pages/PhoneSetup.jsx';
import PendingReview from './pages/PendingReview.jsx';
import Portfolio from './pages/Portfolio.jsx';
import BusinessVerification from './pages/BusinessVerification.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import { api } from './api.js';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/auth/me')
      .then((r) => setUser(r.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-10 text-slate-500">Loading…</div>;

  return (
    <div className="min-h-full">
      <Header user={user} onLogout={() => setUser(null)} />
      <Routes>
        <Route path="/" element={user ? <Navigate to="/portfolio" /> : <Login onAuthed={setUser} />} />
        <Route path="/portfolio" element={user ? <Portfolio /> : <Navigate to="/" />} />
        <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" />} />
        <Route path="/phone-setup" element={user ? <PhoneSetup /> : <Navigate to="/" />} />
        <Route path="/review/:phoneId" element={user ? <PendingReview /> : <Navigate to="/" />} />
        <Route path="/verification/:businessId" element={user ? <BusinessVerification /> : <Navigate to="/" />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Routes>
    </div>
  );
}

function Header({ user, onLogout }) {
  const nav = useNavigate();
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/" className="font-semibold text-slate-800">BSP Console</Link>
        {user && (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-600">{user.name}</span>
            <button
              className="text-slate-500 hover:text-slate-800"
              onClick={async () => { await api.post('/api/auth/logout'); onLogout(); nav('/'); }}
            >Logout</button>
          </div>
        )}
      </div>
    </header>
  );
}
