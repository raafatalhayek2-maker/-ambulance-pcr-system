'use client';
import { useEffect, useState } from 'react';

const ROLES = ['EMT','Driver','Supervisor','Admin'];

type Employee = {
  id: string;
  full_name: string;
  role: string;
  phone: string | null;
  email: string | null;
  hourly_rate: number;
  active: boolean;
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ full_name: '', role: 'EMT', phone: '', email: '', hourly_rate: '24' });

  async function load() {
    setLoading(true);
    const res = await fetch('/api/employees');
    const data = await res.json();
    setEmployees(data.employees || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setSaving(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, hourly_rate: Number(form.hourly_rate || 0) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save employee');
      setForm({ full_name: '', role: 'EMT', phone: '', email: '', hourly_rate: '24' });
      await load();
    } catch (e: any) {
      setErr(e?.message || 'Error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="text-xs uppercase tracking-wide text-slate-500">Operations V2</div>
        <h1 className="text-2xl font-bold text-slate-900">Employees</h1>
        <p className="text-sm text-slate-500 mt-1">Add staff profiles for time clock and payroll demo tracking.</p>
      </div>

      <form onSubmit={submit} className="card space-y-3">
        <div className="font-semibold text-slate-900">Add Employee</div>
        <div>
          <label className="label">Full name</label>
          <input className="input" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Employee name" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Role</label>
            <select className="select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              {ROLES.map(role => <option key={role}>{role}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Hourly rate</label>
            <input className="input" type="number" min="0" step="0.01" value={form.hourly_rate} onChange={e => setForm({ ...form, hourly_rate: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Optional" />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Optional" />
          </div>
        </div>
        {err && <div className="chip chip-err w-full justify-center !py-2">{err}</div>}
        <button className="btn btn-primary w-full" disabled={saving}>{saving ? 'Saving…' : 'Save Employee'}</button>
      </form>

      <div className="space-y-2">
        {loading && <div className="text-center text-slate-500 py-8">Loading employees…</div>}
        {!loading && employees.length === 0 && <div className="card text-center text-slate-500">No employees yet.</div>}
        {employees.map(emp => (
          <div key={emp.id} className="card flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold text-slate-900">{emp.full_name}</div>
              <div className="text-sm text-slate-500">{emp.role} • ${Number(emp.hourly_rate || 0).toFixed(2)}/hr</div>
              <div className="text-xs text-slate-400 mt-1">{emp.phone || 'No phone'} {emp.email ? `• ${emp.email}` : ''}</div>
            </div>
            <span className={"chip " + (emp.active ? 'chip-success' : 'chip-muted')}>{emp.active ? 'Active' : 'Inactive'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
