'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Pcr } from '@/lib/types';

const FILTERS = ['All','Pending Review','Completed','Missing Info','Ready for Billing'] as const;
type Filter = typeof FILTERS[number];

function StatusChip({ s }: { s: string }) {
  const map: Record<string,string> = {
    'Draft':'chip-muted','Missing Info':'chip-warn','Pending Review':'chip-info',
    'Completed':'chip-success','Ready for Billing':'chip-success',
  };
  return <span className={"chip " + (map[s] || 'chip-muted')}>{s}</span>;
}

function isToday(iso?: string) {
  if (!iso) return false;
  const d = new Date(iso); const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

export default function SupervisorHome() {
  const [filter, setFilter] = useState<Filter>('All');
  const [pcrs, setPcrs] = useState<(Pcr & { emt_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/pcr?supervisor=1')
      .then(r => r.json())
      .then(d => setPcrs(d.pcrs || []))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => ({
    pending: pcrs.filter(p => p.status === 'Pending Review').length,
    missing: pcrs.filter(p => p.status === 'Missing Info').length,
    completedToday: pcrs.filter(p => p.status === 'Completed' && isToday(p.reviewed_at || undefined)).length,
  }), [pcrs]);

  const list = useMemo(() => {
    if (filter === 'All') return pcrs;
    return pcrs.filter(p => p.status === filter);
  }, [pcrs, filter]);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-500">Supervisor</div>
        <div className="text-xl font-bold text-slate-900">Dashboard</div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-3 gap-2">
        <div className="card text-center">
          <div className="text-2xl font-bold text-brand-500">{counts.pending}</div>
          <div className="text-[11px] text-slate-500 uppercase">Pending</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-warn-500">{counts.missing}</div>
          <div className="text-[11px] text-slate-500 uppercase">Missing Info</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-ok-500">{counts.completedToday}</div>
          <div className="text-[11px] text-slate-500 uppercase">Done Today</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
                  className={"chip cursor-pointer whitespace-nowrap " +
                    (filter === f ? "chip-info" : "chip-muted")}>
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      {loading && <div className="text-center text-slate-500 py-8">Loading…</div>}
      {!loading && list.length === 0 && (
        <div className="card text-center text-slate-500 py-8">No PCRs match that filter.</div>
      )}
      <div className="space-y-2">
        {list.map(p => (
          <Link key={p.id} href={`/supervisor/pcr/${p.id}`} className="block card hover:bg-slate-50 transition">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 truncate">{p.patient_name || 'Untitled'}</div>
                <div className="text-xs text-slate-500">
                  {p.trip_type || '—'} · EMT: {p.emt_name || '—'}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">PCR · {p.id.slice(0,8)}</div>
                <div className="text-[11px] text-slate-400">{new Date(p.created_at).toLocaleString()}</div>
              </div>
              <StatusChip s={p.status} />
            </div>
          </Link>
        ))}
      </div>

      {/* Demo Resources */}
      <div className="card mt-6">
        <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Demo resources</div>
        <div className="font-semibold text-slate-900 mb-2">Sample facesheet for live demos</div>
        <div className="text-sm text-slate-600 mb-3">
          Print this sample discharge facesheet, then point the EMT camera at it during the demo to trigger the OCR auto-fill.
        </div>
        <a href="/sample-facesheet.html" target="_blank"
           className="btn btn-secondary w-full">Open sample facesheet (printable)</a>
      </div>
    </div>
  );
}
