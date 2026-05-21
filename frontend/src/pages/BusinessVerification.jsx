import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2, CheckCircle2, Upload, Mail, Send, FileText,
  AlertCircle, ChevronRight, Loader2, ShieldCheck, Clock,
} from 'lucide-react';
import { api } from '../api.js';

const STEPS = ['Status', 'Documents', 'Email', 'Submit', 'Done'];

export default function BusinessVerification() {
  const { businessId } = useParams();
  const nav = useNavigate();

  const [step, setStep] = useState(0);
  const [businessInfo, setBusinessInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Step 1 — document upload
  const [msmeFile, setMsmeFile] = useState(null);
  const [bankFile, setBankFile] = useState(null);
  const [docsUploaded, setDocsUploaded] = useState(false);
  const [msmeFileName, setMsmeFileName] = useState('');
  const [bankFileName, setBankFileName] = useState('');

  // Step 2 — email verification
  const [email, setEmail] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [vCode, setVCode] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);

  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/api/verification/${businessId}/status`)
      .then((r) => {
        setBusinessInfo(r.data);
        if (r.data.docsUploaded) {
          setDocsUploaded(true);
          setMsmeFileName(r.data.msmeFileName || '');
          setBankFileName(r.data.bankFileName || '');
        }
        if (r.data.emailVerified) {
          setEmailVerified(true);
          setEmail(r.data.verifiedEmail || '');
        }
        if (r.data.submitted)          setStep(4);
        else if (r.data.emailVerified) setStep(3);
        else if (r.data.docsUploaded)  setStep(2);
      })
      .catch((e) => setError(e?.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [businessId]);

  async function uploadDocs() {
    setError(''); setBusy(true);
    try {
      const form = new FormData();
      form.append('msme', msmeFile);
      form.append('bankStatement', bankFile);
      await api.post(`/api/verification/${businessId}/documents`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDocsUploaded(true);
      setMsmeFileName(msmeFile.name);
      setBankFileName(bankFile.name);
      setStep(2);
    } catch (e) { setError(e?.response?.data?.error || e.message); }
    finally { setBusy(false); }
  }

  async function sendCode() {
    setError(''); setBusy(true);
    try {
      await api.post(`/api/verification/${businessId}/email/send`, { email });
      setCodeSent(true);
    } catch (e) { setError(e?.response?.data?.error || e.message); }
    finally { setBusy(false); }
  }

  async function verifyCode() {
    setError(''); setBusy(true);
    try {
      await api.post(`/api/verification/${businessId}/email/verify`, { email, code: vCode });
      setEmailVerified(true);
      setStep(3);
    } catch (e) { setError(e?.response?.data?.error || e.message); }
    finally { setBusy(false); }
  }

  async function submitReview() {
    setError(''); setBusy(true);
    try {
      await api.post(`/api/verification/${businessId}/submit`);
      setStep(4);
    } catch (e) { setError(e?.response?.data?.error || e.message); }
    finally { setBusy(false); }
  }

  if (loading) {
    return (
      <div className="p-10 text-slate-500 flex items-center gap-2">
        <Loader2 className="animate-spin" size={18} /> Checking verification status…
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">

      {/* ── Stepper ── */}
      <div className="flex items-center mb-8">
        {STEPS.map((label, i) => (
          <React.Fragment key={label}>
            <div className={`flex items-center gap-1.5 text-xs font-semibold ${i <= step ? 'text-blue-600' : 'text-slate-400'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                ${i < step
                  ? 'bg-blue-600 text-white'
                  : i === step
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                    : 'bg-slate-200 text-slate-500'}`}>
                {i < step ? <CheckCircle2 size={13} /> : i + 1}
              </div>
              <span className="hidden sm:inline">{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 rounded ${i < step ? 'bg-blue-500' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ── Main card ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        {error && (
          <div className="mb-5 flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {step === 0 && (
          <StepStatus info={businessInfo} onStart={() => { setError(''); setStep(1); }} />
        )}
        {step === 1 && (
          <StepDocs
            msme={msmeFile} bank={bankFile}
            onMsme={setMsmeFile} onBank={setBankFile}
            onNext={uploadDocs} busy={busy}
          />
        )}
        {step === 2 && (
          <StepEmail
            email={email} setEmail={setEmail}
            codeSent={codeSent} vCode={vCode} setVCode={setVCode}
            onSend={sendCode} onVerify={verifyCode} busy={busy}
          />
        )}
        {step === 3 && (
          <StepSubmit
            docsUploaded={docsUploaded}
            msmeFileName={msmeFileName}
            bankFileName={bankFileName}
            emailVerified={emailVerified}
            verifiedEmail={email}
            onSubmit={submitReview} busy={busy}
          />
        )}
        {step === 4 && <StepDone onBack={() => nav('/portfolio')} />}
      </div>

      <style>{`
        .input { width:100%; border:1px solid rgb(203 213 225); border-radius:.5rem; padding:.55rem .75rem; font-size:.9rem; }
        .input:disabled { background:#f8fafc; color:#94a3b8; }
        .btn-primary { background:#2563eb; color:white; padding:.55rem 1.1rem; border-radius:.5rem; font-weight:500; display:inline-flex; align-items:center; gap:.4rem; }
        .btn-primary:disabled { opacity:.5; cursor:not-allowed; }
        .btn-primary:not(:disabled):hover { background:#1d4ed8; }
      `}</style>
    </div>
  );
}

/* ───────────────────────────────────────────── Step 0 — Status ── */
function StepStatus({ info, onStart }) {
  const vs = info?.verification_status || 'not_verified';
  const isVerified = ['verified', 'business_verified'].includes(vs.toLowerCase());

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <ShieldCheck className="text-blue-600" size={22} />
        <h2 className="text-lg font-semibold text-slate-800">Meta Business Verification</h2>
      </div>

      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-6 space-y-2.5 text-sm">
        <InfoRow k="Business ID"   v={<code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{info?.id}</code>} />
        <InfoRow k="Business Name" v={info?.name || <span className="text-slate-400">—</span>} />
        <InfoRow k="Verification"  v={<VerifBadge status={vs} />} />
        {info?.support_email && <InfoRow k="Support Email" v={info.support_email} />}
      </div>

      {isVerified ? (
        <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <CheckCircle2 size={18} /> Business is already verified with Meta — no action needed.
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-600 mb-4">
            Verify your business with Meta to unlock higher messaging tiers and display a verified badge.
            You'll need the following documents ready:
          </p>
          <ul className="space-y-2 text-sm text-slate-700 mb-6">
            <li className="flex items-center gap-2">
              <FileText size={15} className="text-blue-500 shrink-0" />
              <span><b>MSME / Udyam Registration Certificate</b> — proves your business name</span>
            </li>
            <li className="flex items-center gap-2">
              <FileText size={15} className="text-indigo-500 shrink-0" />
              <span><b>Bank Statement</b> (last 3 months) — proves your business address</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail size={15} className="text-violet-500 shrink-0" />
              <span><b>Business Email</b> — Meta will send a 6-digit OTP to verify it</span>
            </li>
          </ul>
          <div className="flex justify-end">
            <button onClick={onStart} className="btn-primary">
              Start Verification <ChevronRight size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────── Step 1 — Upload Docs ── */
function StepDocs({ msme, bank, onMsme, onBank, onNext, busy }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-800 mb-1">Upload Verification Documents</h2>
      <p className="text-sm text-slate-500 mb-6">
        Meta uses these to verify your registered business name and address.
        Accepted formats: PDF, JPG, PNG — max 5 MB each.
      </p>

      <DocUpload
        label="MSME / Udyam Registration Certificate"
        hint="For business name verification — upload your Udyam/MSME certificate"
        file={msme} onChange={onMsme}
        icon={<FileText size={20} className="text-blue-500" />}
        accept=".pdf,.jpg,.jpeg,.png"
      />

      <DocUpload
        label="Bank Statement"
        hint="For address verification — bank statement showing business name & address (last 3 months)"
        file={bank} onChange={onBank}
        icon={<FileText size={20} className="text-indigo-500" />}
        accept=".pdf,.jpg,.jpeg,.png"
      />

      <div className="flex justify-end mt-2">
        <button onClick={onNext} disabled={busy || !msme || !bank} className="btn-primary">
          {busy
            ? <><Loader2 size={15} className="animate-spin" /> Uploading…</>
            : <>Upload Documents <ChevronRight size={16} /></>}
        </button>
      </div>
    </div>
  );
}

function DocUpload({ label, hint, file, onChange, icon, accept }) {
  return (
    <div className="mb-5">
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <div className={`border-2 border-dashed rounded-xl p-4 transition-colors
        ${file ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-blue-300 bg-slate-50'}`}>
        <div className="flex items-center gap-3">
          {icon}
          <div className="flex-1 min-w-0">
            {file ? (
              <>
                <div className="font-medium text-sm text-slate-800 truncate">{file.name}</div>
                <div className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB</div>
              </>
            ) : (
              <div className="text-sm text-slate-500">{hint}</div>
            )}
          </div>
          <label className="cursor-pointer bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap">
            <Upload size={13} /> {file ? 'Change' : 'Choose File'}
            <input type="file" className="hidden" accept={accept}
              onChange={(e) => onChange(e.target.files?.[0] || null)} />
          </label>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────── Step 2 — Email OTP ── */
function StepEmail({ email, setEmail, codeSent, vCode, setVCode, onSend, onVerify, busy }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-800 mb-1">Business Email Verification</h2>
      <p className="text-sm text-slate-500 mb-6">
        Meta will send a 6-digit verification code to your business email.
        Enter the code below to verify ownership.
      </p>

      <div className="space-y-5">
        {/* Email input + Send Code */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Business Email</label>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@yourbusiness.com"
              disabled={codeSent}
            />
            {!codeSent && (
              <button onClick={onSend} disabled={busy || !email} className="btn-primary whitespace-nowrap">
                {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                Send Code
              </button>
            )}
          </div>
        </div>

        {/* OTP input */}
        {codeSent && (
          <div>
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4">
              <CheckCircle2 size={15} />
              Verification code sent to <b>{email}</b> — please check your inbox (and spam).
            </div>

            <label className="block text-sm font-medium text-slate-700 mb-1">
              Enter 6-digit OTP
            </label>
            <div className="flex gap-2">
              <input
                className="input flex-1 text-center text-2xl font-mono tracking-[.35em]"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={vCode}
                onChange={(e) => setVCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="• • • • • •"
              />
              <button onClick={onVerify} disabled={busy || vCode.length !== 6} className="btn-primary whitespace-nowrap">
                {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                Verify
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────── Step 3 — Review & Submit ── */
function StepSubmit({ docsUploaded, msmeFileName, bankFileName, emailVerified, verifiedEmail, onSubmit, busy }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-800 mb-1">Review & Submit to Meta</h2>
      <p className="text-sm text-slate-500 mb-6">
        Everything looks good. Submit your verification request to Meta's review team.
      </p>

      <div className="space-y-2.5 mb-6">
        <CheckItem
          icon={<FileText size={14} />}
          label="MSME Certificate uploaded"
          sub={msmeFileName}
          done={docsUploaded}
        />
        <CheckItem
          icon={<FileText size={14} />}
          label="Bank Statement uploaded"
          sub={bankFileName}
          done={docsUploaded}
        />
        <CheckItem
          icon={<Mail size={14} />}
          label="Business email verified"
          sub={verifiedEmail}
          done={emailVerified}
        />
      </div>

      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 mb-6">
        <Clock size={15} className="shrink-0 mt-0.5" />
        <span>Meta's business verification review typically takes <b>1–5 business days</b>. You'll receive an email once the review is complete.</span>
      </div>

      <div className="flex justify-end">
        <button onClick={onSubmit} disabled={busy} className="btn-primary">
          {busy
            ? <><Loader2 size={15} className="animate-spin" /> Submitting…</>
            : <>Submit for Meta Review <ChevronRight size={16} /></>}
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────── Step 4 — Done ── */
function StepDone({ onBack }) {
  return (
    <div className="text-center py-6">
      <div className="inline-flex p-4 bg-emerald-100 rounded-full mb-4">
        <CheckCircle2 size={36} className="text-emerald-600" />
      </div>
      <h2 className="text-xl font-semibold text-slate-800 mb-2">Verification Submitted!</h2>
      <p className="text-slate-600 mb-2">
        Your business verification documents have been submitted to Meta for review.
      </p>
      <p className="text-slate-500 text-sm mb-8">
        This typically takes <b>1–5 business days</b>. You'll receive an email at your registered
        business email once the review is complete.
      </p>
      <button onClick={onBack} className="btn-primary mx-auto">
        ← Back to Portfolio
      </button>
    </div>
  );
}

/* ────────────────────────────────────────── Shared components ── */
function CheckItem({ icon, label, sub, done }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border
      ${done ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
      <div className={`rounded-full p-1.5 ${done ? 'bg-emerald-500' : 'bg-slate-300'}`}>
        <span className="text-white">{icon || <CheckCircle2 size={13} />}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${done ? 'text-emerald-800' : 'text-slate-500'}`}>{label}</div>
        {sub && <div className="text-xs text-slate-500 truncate">{sub}</div>}
      </div>
      {done && <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />}
    </div>
  );
}

function InfoRow({ k, v }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-500 shrink-0">{k}</span>
      <span className="font-medium text-slate-800 text-right">{v}</span>
    </div>
  );
}

function VerifBadge({ status }) {
  const s = (status || '').toLowerCase();
  if (s.includes('verified')) {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full"><CheckCircle2 size={12} />{status}</span>;
  }
  return <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full"><Clock size={12} />{status || 'not_verified'}</span>;
}
