import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MessageSquare, Phone, CheckCircle2, Clock, ShieldCheck, ChevronRight } from 'lucide-react';
import { api } from '../api.js';

export default function Portfolio() {
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/whatsapp/portfolio')
      .then((r) => setData(r.data))
      .catch((e) => setError(e?.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-10 text-slate-500">Loading your business portfolio…</div>;
  if (error) return <div className="p-10 text-red-600">{error}</div>;
  if (!data) return null;

  const allOwned = data.businesses.flatMap((b) => b.owned_wabas || []);
  const allShared = data.businesses.flatMap((b) => b.shared_wabas || []);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-slate-800">Welcome, {data.user.name}</h2>
        <p className="text-slate-600 text-sm">
          Here's the business portfolio Meta returned for your account. Review it and continue to add a phone number.
        </p>
      </div>

      <Section title="Business portfolios" icon={<Building2 size={18} />}>
        {data.businesses.length === 0 && <Empty msg="No business portfolios found on this account." />}
        {data.businesses.map((b) => (
          <div key={b.id} className="p-4 border-b last:border-b-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-medium text-slate-800">
                  Business ID: <code className="text-sm">{b.id}</code>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {b.owned_wabas?.length || 0} owned WABA(s) · {b.shared_wabas?.length || 0} shared WABA(s)
                </div>
              </div>
              <button
                onClick={() => nav(`/verification/${b.id}`)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors"
              >
                <ShieldCheck size={13} /> Verify Business <ChevronRight size={12} />
              </button>
            </div>
          </div>
        ))}
      </Section>

      <Section title="WhatsApp Business Accounts" icon={<MessageSquare size={18} />}>
        {[...allOwned, ...allShared].length === 0 && <Empty msg="No WABAs found." />}
        {[...allOwned, ...allShared].map((w) => (
          <div key={w.id} className="p-4 border-b last:border-b-0">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-800">{w.name || '(unnamed WABA)'}</div>
                <div className="text-xs text-slate-500">ID: <code>{w.id}</code></div>
              </div>
              <div className="flex gap-2">
                <Badge label={`account: ${w.account_review_status || '—'}`} tone={tone(w.account_review_status)} />
                <Badge label={`business: ${w.business_verification_status || '—'}`} tone={tone(w.business_verification_status)} />
              </div>
            </div>
          </div>
        ))}
      </Section>

      <Section title="Phone numbers & display names" icon={<Phone size={18} />}>
        {data.wabas.flatMap((w) => w.phones || []).length === 0 && (
          <Empty msg="No phone numbers yet — add one in the next step." />
        )}
        {data.wabas.map((w) =>
          (w.phones || []).map((p) => (
            <div key={p.id} className="p-4 border-b last:border-b-0">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-800">
                    {p.verified_name || <span className="text-slate-400">(no display name)</span>}
                  </div>
                  <div className="text-xs text-slate-500">{p.display_phone_number || p.id}</div>
                </div>
                <NameStatus status={p.name_status} />
              </div>
            </div>
          ))
        )}
      </Section>

      <div className="flex justify-end mt-8">
        <button
          onClick={() => nav('/phone-setup')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium"
        >
          Continue → Add phone number
        </button>
      </div>
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 mb-6">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2 text-slate-700 font-medium">
        {icon}{title}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Empty({ msg }) {
  return <div className="p-4 text-sm text-slate-500">{msg}</div>;
}

function Badge({ label, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-100 text-emerald-800',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-800',
  };
  return <span className={`text-xs px-2 py-1 rounded-full ${tones[tone]}`}>{label}</span>;
}

function tone(s) {
  if (!s) return 'slate';
  const v = String(s).toUpperCase();
  if (v.includes('VERIFIED') || v.includes('APPROVED')) return 'green';
  if (v.includes('PENDING') || v.includes('REVIEW')) return 'amber';
  if (v.includes('REJECT') || v.includes('FAIL')) return 'red';
  return 'slate';
}

function NameStatus({ status }) {
  if (!status) return <Badge label="not set" />;
  const v = status.toUpperCase();
  if (v.includes('PENDING') || v.includes('REVIEW'))
    return <span className="inline-flex items-center gap-1 text-amber-700 text-xs"><Clock size={14} /> in review</span>;
  if (v.includes('APPROVED') || v.includes('AVAILABLE'))
    return <span className="inline-flex items-center gap-1 text-emerald-700 text-xs"><CheckCircle2 size={14} /> {status}</span>;
  return <Badge label={status} />;
}
