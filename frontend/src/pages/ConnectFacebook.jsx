import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, ShieldCheck, Loader2 } from 'lucide-react';
import { loadFbSdk, launchEmbeddedSignup } from '../fbSdk.js';
import { api } from '../api.js';

export default function ConnectFacebook({ onAuthed }) {
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
        setError(msg);
      });
  }, []);

  async function handleConnect() {
    setError(''); setBusy(true);
    try {
      const { code } = await launchEmbeddedSignup(config.configId, (sess) => setSignupSession(sess));
      const { data } = await api.post('/api/auth/facebook/exchange', {
        code,
        signupSession,
        redirectUri: '',
      });
      onAuthed?.(data.user);
      nav('/portfolio');
    } catch (e) {
      const d = e?.response?.data;
      const metaErr = d?.meta?.error || d?.meta;
      const msg = metaErr?.message || d?.error || e.message;
      const detail = metaErr ? ` (code ${metaErr.code}: ${metaErr.type})` : '';
      setError(msg + detail);
      console.error('[exchange full error]', JSON.stringify(d, null, 2));
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 w-full max-w-lg">
        <div className="flex items-center gap-3 mb-2">
          <MessageSquare className="text-emerald-500" size={22} />
          <h1 className="text-xl font-semibold text-slate-800">Connect WhatsApp Business</h1>
        </div>
        <p className="text-slate-500 text-sm mb-8">
          Click below to launch Facebook's Embedded Signup and connect your WhatsApp Business account.
          Your display name will go through <b>Meta manual review</b>.
        </p>

        <div className="space-y-3 mb-8">
          <Row icon={<MessageSquare size={16} />} title="Cloud API messaging"
               sub="Send and receive messages at scale via WhatsApp Cloud API." />
          <Row icon={<ShieldCheck size={16} />} title="Verified display name"
               sub="Every number is reviewed by Meta — no auto-approval shortcuts." />
        </div>

        <button onClick={handleConnect} disabled={!config?.appId || busy}
          className="w-full inline-flex items-center justify-center gap-2 bg-[#1877F2] hover:bg-[#1464d2] disabled:opacity-60 text-white px-5 py-3 rounded-lg font-medium text-sm">
          {busy
            ? <><Loader2 size={17} className="animate-spin" /> Connecting…</>
            : <><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> Connect with Facebook</>
          }
        </button>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {!config && !error && (
          <p className="mt-4 text-xs text-slate-400 flex items-center gap-1">
            <Loader2 size={12} className="animate-spin" /> Loading config…
          </p>
        )}

        <p className="mt-5 text-xs text-slate-400 text-center">
          By continuing you agree to Meta Hosting Terms for Cloud API and WhatsApp Business Terms.
        </p>
      </div>
    </div>
  );
}

function Row({ icon, title, sub }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <div className="mt-0.5 text-slate-400">{icon}</div>
      <div>
        <div className="text-sm font-medium text-slate-800">{title}</div>
        <div className="text-xs text-slate-500">{sub}</div>
      </div>
    </div>
  );
}
