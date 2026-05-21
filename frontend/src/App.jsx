import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import Register from './pages/Register.jsx';
import Login from './pages/Login.jsx';
import TenantSetup from './pages/TenantSetup.jsx';
import ConnectFacebook from './pages/ConnectFacebook.jsx';
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

  function guard(el, redirect = '/login') {
    return user ? el : <Navigate to={redirect} />;
  }

  return (
    <div className="min-h-full">
      <Header user={user} onLogout={() => setUser(null)} />
      <Routes>
        {/* Public auth */}
        <Route path="/" element={user ? <Navigate to="/portfolio" /> : <Navigate to="/login" />} />
        <Route path="/register" element={user ? <Navigate to="/portfolio" /> : <Register onAuthed={setUser} />} />
        <Route path="/login" element={user ? <Navigate to="/portfolio" /> : <Login onAuthed={setUser} />} />

        {/* Onboarding steps (require login) */}
        <Route path="/setup" element={guard(<TenantSetup onSetupDone={() => setUser((u) => u ? { ...u, hasMeta: true } : u)} />)} />
        <Route path="/connect" element={guard(<ConnectFacebook onAuthed={setUser} />)} />

        {/* Main app (require login + FB connected) */}
        <Route path="/portfolio" element={guard(<Portfolio />)} />
        <Route path="/dashboard" element={guard(<Dashboard />)} />
        <Route path="/phone-setup" element={guard(<PhoneSetup />)} />
        <Route path="/review/:phoneId" element={guard(<PendingReview />)} />
        <Route path="/verification/:businessId" element={guard(<BusinessVerification />)} />

        {/* Admin */}
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
            <button className="text-slate-500 hover:text-slate-800"
              onClick={async () => { await api.post('/api/auth/logout'); onLogout(); nav('/login'); }}>
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
