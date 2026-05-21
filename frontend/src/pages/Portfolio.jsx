import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MessageSquare, Phone, CheckCircle2, Clock, ShieldCheck, ChevronRight, RefreshCw, AlertCircle, Plus, UserPlus, Loader2 } from 'lucide-react';
import { api } from '../api.js';

const BACKEND = import.meta.env.VITE_API_BASE || 'https://business-verification.onrender.com';

export default function Portfolio() {
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addBusy, setAddBusy] = useState(false);
  const [addMsg, setAddMsg] = useState('');
  const popupRef = useRef(null);

  useEffect(() => {
    api.get('/api/whatsapp/portfolio')
      .then((r) => setData(r.data))
      .catch((e) => setError(e?.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, []);

  function load() {
    setLoading(true);
    api.get('/api/whatsapp/portfolio')
      .then((r) => setData(r.data))
      .catch((e) => setError(e?.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    function onMsg(e) {
      if (!e.origin.includes('business-verification.onrender.com')) return;
      if (e.data?.type === 'fb_connected') {
        setAddBusy(false);
        setAddMsg('New account connected! Refreshing…');
        setTimeout(() => { setAddMsg(''); load(); }, 1500);
      } else if (e.data?.type === 'fb_error') {
        setAddBusy(false);
        setAddMsg(`Error: ${e.data.error}`);
      }
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  async function handleAddAccount() {
    setAddBusy(true); setAddMsg('');
    try {
      const { data: d } = await api.get('/api/auth/facebook/start');
      const w = 620, h = 700;
      const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
      const top  = Math.round(window.screenY + (window.outerHeight - h) / 2);
      const popup = window.open(d.authUrl, 'fb_add_account',
        `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`);
      if (!popup) { setAddBusy(false); setAddMsg('Popup blocked — please allow popups and try again.'); return; }
      popupRef.current = popup;
      const t = setInterval(() => { if (popup.closed) { clearInterval(t); setAddBusy(false); } }, 500);
    } catch (e) {
      setAddBusy(false);
      setAddMsg(e?.response?.data?.message || e.message);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex items-center gap-3 text-slate-500">
        <RefreshCw size={20} className="animate-spin" /> Loading your portfolio…
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white border border-red-200 rounded-2xl p-8 max-w-md w-full text-center">
        <AlertCircle className="text-red-500 mx-auto mb-3" size={32} />
        <p className="text-slate-700 font-medium">Failed to load portfolio</p>
        <p className="text-sm text-red-600 mt-1">{error}</p>
        <button onClick={load} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Retry</button>
      </div>
    </div>
  );

  if (!data) return null;

  const allPhones = data.wabas.flatMap((w) => (w.phones || []).map((p) => ({ ...p, wabaName: w.name })));

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Business Portfolio</h1>
            <p className="text-slate-500 text-sm mt-1">Welcome back, <b>{data.user?.name}</b> — here are your connected assets</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <button onClick={load} className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 border border-slate-200 bg-white px-3 py-2 rounded-lg">
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={handleAddAccount} disabled={addBusy}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg">
              {addBusy ? <><Loader2 size={14} className="animate-spin" /> Opening…</> : <><UserPlus size={15} /> Add Business Account</>}
            </button>
            <button onClick={() => nav('/phone-setup')} className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
              <Plus size={15} /> Add Phone Number
            </button>
          </div>
        </div>

        {addMsg && (
          <div className={`mb-4 text-sm px-4 py-3 rounded-xl border ${addMsg.startsWith('Error') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
            {addMsg}
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard icon={<Building2 size={20} className="text-indigo-500" />} label="Business Portfolios" value={data.businesses?.length || 0} />
          <StatCard icon={<MessageSquare size={20} className="text-blue-500" />} label="WhatsApp Accounts" value={data.wabas?.length || 0} />
          <StatCard icon={<Phone size={20} className="text-green-500" />} label="Phone Numbers" value={allPhones.length} />
        </div>

        {/* Business Portfolios */}
        <Card title="Business Portfolios" icon={<Building2 size={16} />} className="mb-6">
          {(!data.businesses || data.businesses.length === 0) && <Empty msg="No business portfolios found." />}
          {data.businesses?.map((b) => (
            <div key={b.id} className="flex items-center justify-between py-3 px-4 border-b last:border-b-0 hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-sm">
                  {(b.name || 'B')[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-slate-800 text-sm">{b.name || `Business ${b.id}`}</div>
                  <div className="text-xs text-slate-400 font-mono">{b.id}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{(b.owned_wabas?.length || 0) + (b.shared_wabas?.length || 0)} WABA(s)</span>
                <BusinessVerifyBadge status={b.verification_status} onClick={() => nav(`/verification/${b.id}`)} />
              </div>
            </div>
          ))}
        </Card>

        {/* WABAs */}
        <Card title="WhatsApp Business Accounts" icon={<MessageSquare size={16} />} className="mb-6">
          {(!data.wabas || data.wabas.length === 0) && <Empty msg="No WhatsApp Business Accounts found." />}
          {data.wabas?.map((w) => (
            <div key={w.id} className="flex items-center justify-between py-3 px-4 border-b last:border-b-0 hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
                  <MessageSquare size={15} className="text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-slate-800 text-sm">{w.name || '(unnamed WABA)'}</div>
                  <div className="text-xs text-slate-400 font-mono">{w.id}</div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <StatusBadge label={w.account_review_status} prefix="account" />
                <StatusBadge label={w.business_verification_status} prefix="business" />
              </div>
            </div>
          ))}
        </Card>

        {/* Phone Numbers */}
        <Card title="Phone Numbers & Display Names" icon={<Phone size={16} />}>
          {allPhones.length === 0 && (
            <div className="flex flex-col items-center py-10 text-center">
              <Phone size={36} className="text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No phone numbers yet</p>
              <p className="text-xs text-slate-400 mt-1">Add a phone number to start messaging</p>
              <button onClick={() => nav('/phone-setup')}
                className="mt-4 inline-flex items-center gap-1.5 bg-green-600 text-white text-sm px-4 py-2 rounded-lg">
                <Plus size={14} /> Add Phone Number
              </button>
            </div>
          )}
          {allPhones.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-3 px-4 border-b last:border-b-0 hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Phone size={15} className="text-emerald-600" />
                </div>
                <div>
                  <div className="font-medium text-slate-800 text-sm">
                    {p.verified_name || <span className="text-slate-400 italic">No display name</span>}
                  </div>
                  <div className="text-xs text-slate-400">{p.display_phone_number || p.id}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <NameStatusBadge status={p.name_status} />
                <button onClick={() => nav(`/review/${p.id}`)}
                  className="text-xs text-slate-500 hover:text-slate-800 border border-slate-200 px-2 py-1 rounded-lg">
                  Details
                </button>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center">{icon}</div>
      <div>
        <div className="text-2xl font-bold text-slate-800">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}

function Card({ title, icon, children, className = '' }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 text-slate-700 font-semibold text-sm bg-slate-50">
        {icon}{title}
      </div>
      {children}
    </div>
  );
}

function Empty({ msg }) {
  return <div className="p-6 text-sm text-slate-400 text-center">{msg}</div>;
}

function StatusBadge({ label, prefix }) {
  if (!label) return null;
  const v = String(label).toUpperCase();
  const color = v.includes('VERIFIED') || v.includes('APPROVED') ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : v.includes('PENDING') || v.includes('REVIEW') ? 'bg-amber-50 text-amber-700 border-amber-200'
    : v.includes('REJECT') || v.includes('FAIL') ? 'bg-red-50 text-red-700 border-red-200'
    : 'bg-slate-50 text-slate-600 border-slate-200';
  return <span className={`text-xs px-2 py-0.5 rounded-full border ${color}`}>{prefix}: {label.toLowerCase().replace(/_/g, ' ')}</span>;
}

function BusinessVerifyBadge({ status, onClick }) {
  const v = String(status || '').toUpperCase();
  if (v === 'VERIFIED') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1.5 rounded-lg">
        <CheckCircle2 size={12} /> Verified
      </span>
    );
  }
  if (v === 'PENDING' || v === 'SUBMITTED') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1.5 rounded-lg">
        <Clock size={12} /> Under Review
      </span>
    );
  }
  return (
    <button onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2.5 py-1.5 rounded-lg">
      <ShieldCheck size={12} /> Verify <ChevronRight size={11} />
    </button>
  );
}

function NameStatusBadge({ status }) {
  if (!status) return <span className="text-xs text-slate-400">—</span>;
  const v = status.toUpperCase();
  if (v.includes('PENDING') || v.includes('REVIEW'))
    return <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full"><Clock size={11} /> In Review</span>;
  if (v.includes('APPROVED') || v.includes('AVAILABLE_WITH'))
    return <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full"><CheckCircle2 size={11} /> Approved</span>;
  return <span className="text-xs bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full">{status.replace(/_/g, ' ').toLowerCase()}</span>;
}
