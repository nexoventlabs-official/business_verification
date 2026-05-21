import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { api } from '../api.js';
import { Clock, CheckCircle2, AlertCircle, RefreshCw, Phone, ArrowRight } from 'lucide-react';

export default function PendingReview() {
  const { phoneId } = useParams();
  const loc = useLocation();
  const [phone, setPhone] = useState(loc.state?.phone || null);
  const [ticks, setTicks] = useState(0);

  useEffect(() => {
    let alive = true;
    const tick = () =>
      api.get(`/api/whatsapp/phone/${phoneId}`)
        .then((r) => { if (alive) { setPhone(r.data); setTicks((t) => t + 1); } })
        .catch(() => {});
    tick();
    const t = setInterval(tick, 15000);
    return () => { alive = false; clearInterval(t); };
  }, [phoneId]);

  const status = (phone?.name_status || 'PENDING_REVIEW').toUpperCase();
  const isReview  = status.includes('PENDING') || status.includes('REVIEW');
  const isApproved = status.includes('APPROVED') || status.includes('AVAILABLE_WITH_REVIEW');
  const isRejected = status.includes('REJECT') || status.includes('DECLINE');

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 w-full max-w-md text-center">

        {/* Status icon */}
        <div className={`inline-flex p-4 rounded-full mb-4 ${isApproved ? 'bg-emerald-100' : isRejected ? 'bg-red-100' : 'bg-amber-100'}`}>
          {isApproved
            ? <CheckCircle2 className="text-emerald-600" size={28} />
            : isRejected
            ? <AlertCircle className="text-red-600" size={28} />
            : <Clock className="text-amber-600 animate-pulse" size={28} />}
        </div>

        <h2 className="text-xl font-bold text-slate-800 mb-1">
          {isApproved ? 'Display name approved!' : isRejected ? 'Name review rejected' : 'Display name in review'}
        </h2>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          {isApproved
            ? 'Your display name has been approved by Meta. You can now start messaging.'
            : isRejected
            ? 'Meta rejected the display name. Please go back and try a different name that matches your business.'
            : 'Meta is manually reviewing your display name. This takes up to 1 business day. During review you can send 5 test messages every 24 hours.'}
        </p>

        {/* Phone card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left mb-6 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Phone size={14} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone number details</span>
          </div>
          <Row k="Number" v={phone?.display_phone_number || phoneId} />
          <Row k="Display name" v={phone?.verified_name || loc.state?.submittedName || '—'} />
          <Row k="Name status">
            <NameStatusBadge status={phone?.name_status || 'PENDING_REVIEW'} />
          </Row>
          <Row k="Last checked" v={`${ticks} poll${ticks !== 1 ? 's' : ''} (every 15s)`} />
        </div>

        <div className="flex flex-col gap-2">
          <Link to="/portfolio"
            className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-5 rounded-xl text-sm transition-colors">
            View Portfolio <ArrowRight size={15} />
          </Link>
          <button onClick={() => api.get(`/api/whatsapp/phone/${phoneId}`).then((r) => setPhone(r.data))}
            className="inline-flex items-center justify-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm py-2">
            <RefreshCw size={13} /> Refresh status now
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, children }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-slate-500 shrink-0">{k}</span>
      {children || <span className="text-sm font-medium text-slate-800 text-right">{v}</span>}
    </div>
  );
}

function NameStatusBadge({ status }) {
  const v = status.toUpperCase();
  if (v.includes('PENDING') || v.includes('REVIEW'))
    return <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium"><Clock size={10} /> In Review</span>;
  if (v.includes('APPROVED') || v.includes('AVAILABLE_WITH'))
    return <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium"><CheckCircle2 size={10} /> Approved</span>;
  if (v.includes('REJECT') || v.includes('DECLINE'))
    return <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-medium"><AlertCircle size={10} /> Rejected</span>;
  return <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{status.replace(/_/g, ' ').toLowerCase()}</span>;
}
