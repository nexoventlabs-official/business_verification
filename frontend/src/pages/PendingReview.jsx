import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api.js';
import { Clock } from 'lucide-react';

export default function PendingReview() {
  const { phoneId } = useParams();
  const [phone, setPhone] = useState(null);

  useEffect(() => {
    let alive = true;
    const tick = () => api.get(`/api/whatsapp/phone/${phoneId}`).then((r) => alive && setPhone(r.data)).catch(() => {});
    tick();
    const t = setInterval(tick, 15000);
    return () => { alive = false; clearInterval(t); };
  }, [phoneId]);

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <div className="inline-flex p-3 bg-amber-100 rounded-full mb-3">
          <Clock className="text-amber-700" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-1">Display name in review</h2>
        <p className="text-slate-600 mb-6">
          Meta is manually reviewing your display name. This can take up to 1 business day.
          You'll receive an email once the review is completed.
        </p>

        <div className="text-left bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm">
          <Row k="Phone number" v={phone?.display_phone_number || '—'} />
          <Row k="Display name" v={phone?.verified_name || '—'} />
          <Row k="Name status" v={phone?.name_status || 'PENDING_REVIEW'} />
          <Row k="Number status" v={phone?.status || '—'} />
          <Row k="Code verified" v={phone?.code_verification_status || '—'} />
        </div>

        <Link to="/dashboard" className="inline-block mt-6 text-blue-600 hover:underline">Go to dashboard</Link>
      </div>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-slate-500">{k}</span>
      <span className="text-slate-800 font-medium">{v}</span>
    </div>
  );
}
