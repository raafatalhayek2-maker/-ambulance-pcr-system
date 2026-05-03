'use client';
import { useEffect, useState } from 'react';

type PayrollRow = {
  employee_id: string;
  full_name: string;
  role: string;
  hourly_rate: number;
  shifts: number;
  total_hours: number;
  gross_pay: number;
};

type Totals = { shifts: number; total_hours: number; gross_pay: number; };

function defaultStart() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  d.setHours(0,0,0,0);
  return d.toISOString().slice(0,10);
}
function defaultEnd() {
  const d = new Date();
  d.setHours(23,59,59,999);
  return d.toISOString().slice(0,10);
}

export default function PayrollPage() {
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [totals, setTotals] = useState<Totals>({ shifts: 0, total_hours: 0, gross_pay: 0 });
  const [start, setStart] = useState(defaultStart());
  const [end, setEnd] = useState(defaultEnd());
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function load() {
    setErr('');
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (start) params.set('start', new Date(`${start}T00:00:00`).toISOString());
      if (end) params.set('end', new Date(`${end}T23:59:59`).toISOString());
      const res = await fetch(`/api/payroll?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load payroll');
      setRows(data.payroll || []);
      setTotals(data.totals || { shifts: 0, total_hours: 0, gross_pay: 0 });
    } catch (e: any) {
      setErr(e?.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="text-xs uppercase tracking-wide text-slate-500">Operations V2</div>
        <h1 className="text-2xl font-bold text-slate-900">Payroll Summary</h1>
        <p className="text-sm text-slate-500 mt-1">Demo gross pay estimate from completed clock-in/out shifts.</p>
      </div>

      <div className="card space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Start date</label>
            <input className="input" type="date" value={start} onChange={e => setStart(e.target.value)} />
          </div>
          <div>
            <label className="label">End date</label>
            <input className="input" type="date" value={end} onChange={e => setEnd(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-primary w-full" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Run Payroll Summary'}</button>
        {err && <div className="chip chip-err w-full justify-center !py-2">{err}</div>}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="card text-center !p-3">
          <div className="text-xl font-black text-slate-900">{totals.shifts}</div>
          <div className="text-[11px] text-slate-500">Shifts</div>
        </div>
        <div className="card text-center !p-3">
          <div className="text-xl font-black text-slate-900">{totals.total_hours}</div>
          <div className="text-[11px] text-slate-500">Hours</div>
        </div>
        <div className="card text-center !p-3">
          <div className="text-xl font-black text-slate-900">${totals.gross_pay.toFixed(2)}</div>
          <div className="text-[11px] text-slate-500">Gross</div>
        </div>
      </div>

      <div className="space-y-2">
        {rows.length === 0 && <div className="card text-center text-slate-500">No completed shifts in this date range.</div>}
        {rows.map(row => (
          <div key={row.employee_id} className="card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-slate-900">{row.full_name}</div>
                <div className="text-sm text-slate-500">{row.role} • ${Number(row.hourly_rate || 0).toFixed(2)}/hr</div>
                <div className="text-xs text-slate-400 mt-1">{row.shifts} shifts • {row.total_hours} total hours</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-slate-900">${row.gross_pay.toFixed(2)}</div>
                <div className="text-[11px] text-slate-500">estimated gross</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card text-xs text-amber-700 bg-amber-50 border-amber-200">
        Demo only: this is not a payroll compliance system. Taxes, overtime rules, breaks, approvals, and state rules must be handled before real use.
      </div>
    </div>
  );
}
