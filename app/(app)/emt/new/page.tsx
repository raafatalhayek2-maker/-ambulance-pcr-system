'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TRIP_TYPES } from '@/lib/types';
import { getSession } from '@/lib/session';
import { pushToast } from '@/components/Toast';

export default function NewPcrPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function pick(tripType: string) {
    if (busy) return;
    const u = getSession();
    if (!u) return;
    setBusy(true);
    try {
      const res = await fetch('/api/pcr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emt_id: u.id, trip_type: tripType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to create PCR');
      router.push(`/pcr/${data.pcr.id}`);
    } catch (e: any) {
      pushToast(e?.message || 'Failed to create PCR', 'err');
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-4">
        <div className="text-xs uppercase tracking-wide text-slate-500">Step 1 of 2</div>
        <div className="text-xl font-bold text-slate-900">Choose trip type</div>
        <div className="text-sm text-slate-500 mt-1">Select the type of trip for this PCR.</div>
      </div>

      <div className="space-y-2">
        {TRIP_TYPES.map(t => (
          <button key={t} onClick={() => pick(t)} disabled={busy}
                  className="w-full text-left card hover:bg-brand-50 active:bg-brand-100 transition flex items-center justify-between">
            <span className="font-semibold text-slate-900">{t}</span>
            <span className="text-brand-500">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}
