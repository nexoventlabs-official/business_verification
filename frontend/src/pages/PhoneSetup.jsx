import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { Info } from 'lucide-react';

export default function PhoneSetup() {
  const loc = useLocation();
  const nav = useNavigate();

  const [wabas, setWabas] = useState(loc.state?.wabas || []);
  const [mode, setMode] = useState('display_only'); // 'display_only' | 'new_number'
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pin, setPin] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('choose'); // for new_number flow
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (wabas.length === 0) {
      api.get('/api/whatsapp/wabas').then((r) => setWabas(r.data));
    }
  }, []);

  const phones = useMemo(() => wabas.flatMap((w) => (w.phones || []).map((p) => ({ ...p, wabaId: w.id }))), [wabas]);

  async function submitDisplayOnly() {
    setError(''); setBusy(true);
    try {
      const { data } = await api.post('/api/whatsapp/phone/display-name-only', { phoneNumberId, displayName });
      nav(`/review/${phoneNumberId}`, { state: data });
    } catch (e) { setError(e?.response?.data?.error || e.message); }
    finally { setBusy(false); }
  }

  async function requestCode() {
    setError(''); setBusy(true);
    try {
      await api.post('/api/whatsapp/phone/add/request-code', { phoneNumberId, method: 'SMS' });
      setStep('verify');
    } catch (e) { setError(e?.response?.data?.error || e.message); }
    finally { setBusy(false); }
  }

  async function verifyAndRegister() {
    setError(''); setBusy(true);
    try {
      await api.post('/api/whatsapp/phone/add/verify-code', { phoneNumberId, code });
      const { data } = await api.post('/api/whatsapp/phone/add/register', { phoneNumberId, pin, displayName });
      nav(`/review/${phoneNumberId}`, { state: data });
    } catch (e) { setError(e?.response?.data?.error || e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Add your WhatsApp phone number</h2>
        <p className="text-sm text-slate-600 mb-6">
          Choose how you want to be identified when sending messages.
        </p>

        <div className="space-y-3 mb-6">
          <Choice checked={mode === 'display_only'} onChange={() => setMode('display_only')}
            title="Use a display name only"
            sub="Send messages on WhatsApp where people only see a display name in the chat." />
          <Choice checked={mode === 'new_number'} onChange={() => setMode('new_number')}
            title="Add a new number" sub="Verification is required." />
        </div>

        <div className="bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-lg p-3 mb-5 flex gap-2">
          <Info size={18} className="shrink-0 mt-0.5" />
          <div>
            <b>Additional verification required.</b> Before you can send messages, Meta will review your
            business and display name. This can take up to 1 business day. During review, you can send
            5 business-initiated test messages every 24 hours.
          </div>
        </div>

        <Field label="Phone number (Meta phone_number_id)">
          <select className="input" value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)}>
            <option value="">Select a phone number</option>
            {phones.map((p) => (
              <option key={p.id} value={p.id}>
                {p.display_phone_number || p.id} {p.verified_name ? `— ${p.verified_name}` : ''}
              </option>
            ))}
          </select>
        </Field>

        <Field label="WhatsApp Business display name">
          <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                 placeholder="e.g. Jrb Gold Pvt Ltd" />
          <p className="text-xs text-slate-500 mt-1">
            Your display name should match your business name and adhere to WhatsApp Business display name guidelines.
          </p>
        </Field>

        {mode === 'new_number' && (
          <>
            {step === 'choose' && (
              <Field label="Cloud API PIN (6 digits)">
                <input className="input" value={pin} onChange={(e) => setPin(e.target.value)} maxLength={6}
                       placeholder="123456" />
              </Field>
            )}
            {step === 'verify' && (
              <Field label="Enter the verification code">
                <input className="input" value={code} onChange={(e) => setCode(e.target.value)}
                       placeholder="6-digit code from SMS" />
              </Field>
            )}
          </>
        )}

        {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

        <div className="flex justify-end gap-2 pt-2">
          <button className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700"
                  onClick={() => nav('/dashboard')}>Back</button>

          {mode === 'display_only' && (
            <button className="btn-primary" disabled={busy || !phoneNumberId || !displayName}
                    onClick={submitDisplayOnly}>
              {busy ? 'Submitting…' : 'Submit for review'}
            </button>
          )}
          {mode === 'new_number' && step === 'choose' && (
            <button className="btn-primary" disabled={busy || !phoneNumberId || !pin}
                    onClick={requestCode}>
              {busy ? 'Sending…' : 'Send code'}
            </button>
          )}
          {mode === 'new_number' && step === 'verify' && (
            <button className="btn-primary" disabled={busy || !code}
                    onClick={verifyAndRegister}>
              {busy ? 'Registering…' : 'Verify & submit for review'}
            </button>
          )}
        </div>
      </div>

      <style>{`
        .input { width: 100%; border: 1px solid rgb(203 213 225); border-radius: .5rem; padding: .55rem .75rem; font-size: .9rem; }
        .btn-primary { background:#2563eb; color:white; padding:.55rem 1rem; border-radius:.5rem; font-weight:500; }
        .btn-primary:disabled { opacity:.5; }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Choice({ checked, onChange, title, sub }) {
  return (
    <label className={`flex gap-3 items-start p-3 border rounded-lg cursor-pointer ${checked ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
      <input type="radio" checked={checked} onChange={onChange} className="mt-1" />
      <div>
        <div className="font-medium text-slate-800">{title}</div>
        <div className="text-sm text-slate-500">{sub}</div>
      </div>
    </label>
  );
}
