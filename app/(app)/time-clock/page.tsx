'use client';
import { useEffect, useMemo, useState } from 'react';

type Employee = { id: string; full_name: string; role: string; hourly_rate: number; };
type TimeEntry = {
  id: string;
  employee_id: string;
  clock_in_at: string;
  clock_out_at: string | null;
  break_minutes: number;
  shift_role: string | null;
  notes: string | null;
  employees?: { full_name: string; role: string; hourly_rate: number };
  hours_worked?: number | null;
};

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

export default function TimeClockPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [shiftRole, setShiftRole] = useState('');
  const [breakMinutes, setBreakMinutes] = useState('0');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  async function load() {
    const [empsRes, entriesRes] = await Promise.all([
      fetch('/api/employees?active=true'),
      fetch('/api/time-clock'),
    ]);
    const emps = await empsRes.json();
    const times = await entriesRes.json();
    setEmployees(emps.employees || []);
    setEntries(times.entries || []);
    if (!employeeId && emps.employees?.[0]) setEmployeeId(emps.employees[0].id);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const selectedOpen = useMemo(() => entries.find(e => e.employee_id === employeeId && !e.clock_out_at), [entries, employeeId]);

  async function action(type: 'clock_in' | 'clock_out') {
    setErr('');
    setBusy(true);
    try {
      const res = await fetch('/api/time-clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: type,
          employee_id: employeeId,
          shift_role: shiftRole || null,
          break_minutes: Number(breakMinutes || 0),
          notes: notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Time clock action failed');
      setNotes('');
      setBreakMinutes('0');
      await load();
    } catch (e: any) {
      setErr(e?.message || 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="text-xs uppercase tracking-wide text-slate-500">Operations V2</div>
        <h1 className="text-2xl font-bold text-slate-900">Time Clock</h1>
        <p className="text-sm text-slate-500 mt-1">Clock in/out with live shift timer and shift history.</p>
      </div>

      <div className="card space-y-3">
        <div>
          <label className="label">Employee</label>
          <select className="select" value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name} — {emp.role}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Shift role</label>
          <input className="input" value={shiftRole} onChange={e => setShiftRole(e.target.value)} placeholder="BLS Driver, EMT, Supervisor…" />
        </div>
        {selectedOpen && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-center">
            <div className="text-xs uppercase tracking-wide text-green-700 font-bold">Currently clocked in</div>
            <div className="text-4xl font-black text-green-900 mt-2 tabular-nums">
              {formatDuration(now - new Date(selectedOpen.clock_in_at).getTime())}
            </div>
            <div className="text-xs text-green-700 mt-1">Started {new Date(selectedOpen.clock_in_at).toLocaleString()}</div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <button className="btn btn-success w-full" disabled={busy || !employeeId || !!selectedOpen} onClick={() => action('clock_in')}>Clock In</button>
          <button className="btn btn-danger w-full" disabled={busy || !employeeId || !selectedOpen} onClick={() => action('clock_out')}>Clock Out</button>
        </div>
        {selectedOpen && (
          <div>
            <label className="label">Break minutes before clock out</label>
            <input className="input" type="number" min="0" value={breakMinutes} onChange={e => setBreakMinutes(e.target.value)} />
          </div>
        )}
        <div>
          <label className="label">Notes</label>
          <textarea className="textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional shift note" />
        </div>
        {err && <div className="chip chip-err w-full justify-center !py-2">{err}</div>}
      </div>

      <div className="space-y-2">
        <div className="text-sm font-semibold text-slate-700 px-1">Recent shifts</div>
        {entries.length === 0 && <div className="card text-center text-slate-500">No shifts yet.</div>}
        {entries.slice(0, 20).map(entry => (
          <div key={entry.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-slate-900">{entry.employees?.full_name || 'Employee'}</div>
                <div className="text-xs text-slate-500">In: {new Date(entry.clock_in_at).toLocaleString()}</div>
                <div className="text-xs text-slate-500">Out: {entry.clock_out_at ? new Date(entry.clock_out_at).toLocaleString() : 'Still clocked in'}</div>
              </div>
              <span className={"chip " + (entry.clock_out_at ? 'chip-info' : 'chip-success')}>
                {entry.clock_out_at ? `${entry.hours_worked ?? 0} hrs` : 'Open'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
