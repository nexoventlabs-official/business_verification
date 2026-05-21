import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, ExternalLink, ArrowLeft } from 'lucide-react';

export default function BusinessVerification() {
  const { businessId } = useParams();
  const nav = useNavigate();

  useEffect(() => {
    window.open(
      `https://business.facebook.com/settings/info?business_id=${businessId}`,
      '_blank'
    );
  }, [businessId]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
        <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldCheck size={28} className="text-indigo-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">Verify on Meta</h1>
        <p className="text-slate-500 text-sm mb-6">
          Business verification is handled directly by Meta. We have opened Meta Business Manager
          in a new tab. Complete the verification there, then come back here.
        </p>
        <a
          href={`https://business.facebook.com/settings/info?business_id=${businessId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm mb-4 w-full justify-center"
        >
          <ExternalLink size={15} /> Open Meta Business Manager
        </a>
        <button
          onClick={() => nav('/portfolio')}
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm w-full justify-center"
        >
          <ArrowLeft size={14} /> Back to Portfolio
        </button>
      </div>
    </div>
  );
}
