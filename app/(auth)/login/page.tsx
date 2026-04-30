'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveSession, getSession } from '@/lib/session';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const u = getSession();
    if (u) router.replace(u.role === 'supervisor' ? '/supervisor' : '/emt');
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error || 'Sign-in failed');
        return;
      }
      saveSession(data.user);
      router.replace(data.user.role === 'supervisor' ? '/supervisor' : '/emt');
    } catch (e: any) {
      setErr(e?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="demo-banner">DEMO — Sample data only. Not for real patient information.</div>
      <div className="flex-1 grid place-items-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-brand-500 text-white grid place-items-center font-bold text-2xl mx-auto">P</div>
            <h1 className="mt-3 text-2xl font-bold text-slate-900">PCR Pilot</h1>
            <p className="text-sm text-slate-500">DEMO build — not for real patient information</p>
          </div>
          <form onSubmit={submit} className="card space-y-3">
            <div>
              <label className="label" htmlFor="username">Username</label>
              <input id="username" className="input" autoCapitalize="none" autoComplete="username"
                     value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input id="password" type="password" className="input" autoComplete="current-password"
                     value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {err && <div className="chip chip-err w-full justify-center !py-2">{err}</div>}
            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <div className="card mt-4 text-xs text-slate-600">
            <div className="font-semibold mb-1">Demo accounts</div>
            <ul className="list-disc list-inside space-y-1">
              <li><code>emt1</code> / <code>demo123</code> — David (EMT)</li>
              <li><code>emt2</code> / <code>demo123</code> — Raafat (EMT)</li>
              <li><code>sup1</code> / <code>demo123</code> — Supervisor</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
