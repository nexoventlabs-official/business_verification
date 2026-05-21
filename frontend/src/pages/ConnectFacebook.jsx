import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, ShieldCheck, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../api.js';

const BACKEND = import.meta.env.VITE_API_BASE || 'https://business-verification.onrender.com';

export default function ConnectFacebook({ onAuthed }) {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | waiting | success | error
  const [error, setError] = useState('');
  const popupRef = useRef(null);

  useEffect(() => {
    function onMessage(e) {
      if (e.origin !== BACKEND && !e.origin.includes('business-verification.onrender.com')) return;
      if (e.data?.type === 'fb_connected') {
        setBusy(false); setStatus('success');
        api.get('/api/auth/me')
          .then((r) => { onAuthed?.(r.data); nav('/portfolio'); })
          .catch(() => nav('/portfolio'));
      } else if (e.data?.type === 'fb_error') {
        setBusy(false); setStatus('error');
        setError(e.data.error || 'Facebook connection failed');
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [nav, onAuthed]);

  async function handleConnect() {
    setError(''); setBusy(true); setStatus('waiting');
    try {
      const { data } = await api.get('/api/auth/facebook/start');
      const w = 620, h = 700;
      const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
      const top  = Math.round(window.screenY + (window.outerHeight - h) / 2);
      const popup = window.open(data.authUrl, 'fb_signup',
        `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`);
      if (!popup) {
        setBusy(false); setStatus('error');
        setError('Popup was blocked. Please allow popups for this site and try again.');
        return;
      }
      popupRef.current = popup;
      const timer = setInterval(() => {
        if (popup.closed) { clearInterval(timer); if (busy) { setBusy(false); setStatus('idle'); } }
      }, 500);
    } catch (e) {
      setBusy(false); setStatus('error');
      setError(e?.response?.data?.message || e?.response?.data?.error || e.message);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-10 w-full max-w-lg">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <MessageSquare className="text-green-600" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Connect WhatsApp Business</h1>
            <p className="text-xs text-slate-500">Step 3 of 3 — Facebook Embedded Signup</p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <Feature icon={<MessageSquare size={15} className="text-blue-500" />}
            title="Cloud API at scale" sub="Send & receive messages programmatically via WhatsApp Cloud API." />
          <Feature icon={<ShieldCheck size={15} className="text-violet-500" />}
            title="Display name manual review" sub="Every number goes through Meta's review — never auto-approved." />
          <Feature icon={<CheckCircle2 size={15} className="text-emerald-500" />}
            title="Keeps your existing number" sub="You can use a display-name-only number or add a new one." />
        </div>

        <div className="mt-8">
          {status === 'waiting' && (
            <div className="mb-4 flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-lg px-4 py-3">
              <Loader2 size={15} className="animate-spin shrink-0" />
              Complete the Facebook signup in the popup window…
            </div>
          )}
          {status === 'success' && (
            <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg px-4 py-3">
              <CheckCircle2 size={15} className="shrink-0" /> Connected! Redirecting to your portfolio…
            </div>
          )}
          {status === 'error' && error && (
            <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg px-4 py-3">
              <AlertCircle size={15} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}

          <button onClick={handleConnect} disabled={busy || status === 'success'}
            className="w-full inline-flex items-center justify-center gap-2.5 bg-[#1877F2] hover:bg-[#1464d2] active:bg-[#1158c7] disabled:opacity-60 disabled:cursor-not-allowed text-white px-5 py-3.5 rounded-xl font-semibold text-sm transition-colors shadow-sm">
            {busy
              ? <><Loader2 size={17} className="animate-spin" /> Opening Facebook…</>
              : <><FbIcon /> Continue with Facebook</>}
          </button>
        </div>

        <p className="mt-5 text-xs text-slate-400 text-center leading-relaxed">
          By continuing you agree to{' '}
          <a href="https://www.whatsapp.com/legal/business-terms" target="_blank" rel="noreferrer" className="underline">WhatsApp Business Terms</a>
          {' '}and{' '}
          <a href="https://developers.facebook.com/terms/dfc_platform_terms/" target="_blank" rel="noreferrer" className="underline">Meta Hosting Terms</a>.
        </p>
      </div>
    </div>
  );
}

function Feature({ icon, title, sub }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <div className="text-sm font-medium text-slate-800">{title}</div>
        <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
      </div>
    </div>
  );
}

function FbIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}
