import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function Dashboard() {
  const [phones, setPhones] = useState([]);
  const [wabas, setWabas] = useState([]);

  useEffect(() => {
    api.get('/api/whatsapp/wabas').then((r) => setWabas(r.data));
    api.get('/api/whatsapp/phones').then((r) => setPhones(r.data));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-800">Phone numbers</h2>
        <Link to="/phone-setup" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">
          Add phone number
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 divide-y">
        {phones.length === 0 && <div className="p-6 text-slate-500 text-sm">No phone numbers yet.</div>}
        {phones.map((p) => (
          <div key={p.id} className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-800">{p.verified_name || '(no name)'}</div>
              <div className="text-sm text-slate-500">{p.display_phone_number || p.id}</div>
            </div>
            <StatusBadge status={p.name_status} />
          </div>
        ))}
      </div>

      <div className="mt-10">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">WhatsApp Business Accounts</h3>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-sm text-slate-600">
          {wabas.length === 0 ? 'No WABAs.' : wabas.map((w) => (
            <div key={w.id}>WABA <code>{w.id}</code> — {w.phones?.length || 0} number(s)</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    PENDING_REVIEW: 'bg-amber-100 text-amber-800',
    IN_REVIEW: 'bg-amber-100 text-amber-800',
    APPROVED: 'bg-emerald-100 text-emerald-800',
    AVAILABLE_WITHOUT_REVIEW: 'bg-slate-100 text-slate-700',
    DECLINED: 'bg-red-100 text-red-800',
  };
  const cls = map[status] || 'bg-slate-100 text-slate-700';
  const label = (status || 'UNKNOWN').replace(/_/g, ' ').toLowerCase();
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
}
