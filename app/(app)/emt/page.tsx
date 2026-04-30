'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSession } from '@/lib/session';
import { Pcr } from '@/lib/types';

function StatusChip({ s }: { s: string }) {
  const map: Record<string,string> = {
    'Draft': 'chip-muted',
    'Missing Info': 'chip-warn',
    'Pending Review': 'chip-info',
    'Completed': 'chip-success',
    'Ready for Billing': 'chip-success',
  };
  return <span className={"chip " + (map[s] || 'chip-muted')}>{s}</span>;
}

export default function EmtHome() {
  const [pcrs, setPcrs] = useState<Pcr[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getSession();
    if (!u) return;
    fetch(`/api/pcr?emtId=${encodeURIComponent(u.id)}`)
      .then(r => r.json())
      .then(d => setPcrs(d.pcrs || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="card flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">My queue</div>
          <div className="text-xl font-bold text-slate-900">My PCRs</div>
        </div>
        <Link href="/emt/new" className="btn btn-primary">+ Create New PCR</Link>
      </div>

      {loading && <div className="text-center text-slate-500 py-8">Loading…</div>}

      {!loading && pcrs.length === 0 && (
        <div className="card text-center text-slate-500 py-8">
          You have no PCRs yet. Tap "Create New PCR" to start.
        </div>
      )}

      <div className="space-y-2">
        {pcrs.map(p => (
          <Link key={p.id} href={`/pcr/${p.id}`} className="block card hover:bg-slate-50 transition">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-slate-900">{p.patient_name || 'Untitled patient'}</div>
                <div className="text-xs text-slate-500">{p.trip_type || '—'}</div>
                <div className="text-xs text-slate-400 mt-1">{new Date(p.created_at).toLocaleString()}</div>
              </div>
              <StatusChip s={p.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
