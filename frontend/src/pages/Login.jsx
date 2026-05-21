import React, { useEffect, useState } from 'react';
import { Facebook, MessageSquare, ShieldCheck, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { loadFbSdk, launchEmbeddedSignup } from '../fbSdk.js';

export default function Login({ onAuthed }) {
  const nav = useNavigate();
  const [config, setConfig] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [signupSession, setSignupSession] = useState(null);

  useEffect(() => {
    api.get('/api/auth/config')
      .then((r) => {
        setConfig(r.data);
        loadFbSdk(r.data.appId, r.data.graphVersion);
      })
      .catch((e) => {
        const msg = e?.response?.data?.message || e?.response?.data?.error || e.message;
        setError(e?.response?.status === 503 ? 'BSP not configured yet. Admin must set Meta credentials at /admin.' : msg);
      });
  }, []);

  async function handleConnect() {
    setError(''); setBusy(true);
    try {
      await loadFbSdk(config.appId, config.graphVersion);
      const { code } = await launchEmbeddedSignup(config.configId, (sess) => setSignupSession(sess));
      const { data } = await api.post('/api/auth/facebook/exchange', {
        code,
        signupSession,
        redirectUri: window.location.origin,
      });
      onAuthed(data.user);
      nav('/portfolio');
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10">
        <div className="flex items-center gap-3 mb-2">
          <MessageSquare className="text-emerald-500" />
          <h1 className="text-2xl font-semibold text-slate-800">Seamlessly connect your account</h1>
        </div>
        <p className="text-slate-600 mb-8">
          This onboarding will register your business with WhatsApp Cloud API through our BSP.
          Your display name will go through <b>Meta manual review</b> for compliance.
        </p>

        <div className="space-y-3 text-sm text-slate-700">
          <Row icon={<MessageSquare size={18} />} title="Communicate with customers at scale"
               sub="Cloud API to send and receive messages, manage conversations." />
          <Row icon={<ShieldCheck size={18} />} title="Verified business display name"
               sub="Every number is reviewed by Meta — no auto-approval shortcuts." />
        </div>

        <div className="mt-10 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            By continuing you agree to Meta Hosting Terms for Cloud API and Terms for WhatsApp Business.
          </div>
          <button
            onClick={handleConnect}
            disabled={!config?.appId || busy}
            className="inline-flex items-center gap-2 bg-[#1877F2] hover:bg-[#1464d2] disabled:opacity-60 text-white px-5 py-2.5 rounded-lg font-medium"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Facebook size={18} />}
            {busy ? 'Connecting…' : 'Connect with Facebook'}
          </button>
        </div>

        {error && <div className="mt-4 text-sm text-red-600">{error}</div>}
        {!config && !error && (
          <div className="mt-4 text-xs text-slate-400 flex items-center gap-1">
            <Loader2 size={12} className="animate-spin" /> Loading…
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ icon, title, sub }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5 text-slate-500">{icon}</div>
      <div>
        <div className="font-medium text-slate-800">{title}</div>
        <div className="text-slate-500 text-sm">{sub}</div>
      </div>
    </div>
  );
}
