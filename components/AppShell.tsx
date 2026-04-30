'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { clearSession, getSession } from '@/lib/session';
import { User } from '@/lib/types';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const u = getSession();
    if (!u) {
      router.replace('/login');
      return;
    }
    setUser(u);
  }, [router]);

  if (!user) return null;

  function logout() {
    clearSession();
    router.replace('/login');
  }

  const home = user.role === 'supervisor' ? '/supervisor' : '/emt';

  return (
    <div className="min-h-screen flex flex-col">
      <div className="demo-banner">DEMO — Sample data only. Not for real patient information.</div>

      <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href={home} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500 text-white grid place-items-center font-bold">P</div>
            <div>
              <div className="font-bold text-slate-900 leading-none">PCR Pilot</div>
              <div className="text-[11px] text-slate-500 leading-none mt-0.5">DEMO build</div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-slate-900 leading-none">{user.full_name}</div>
              <div className="text-[11px] text-slate-500 leading-none mt-0.5 capitalize">{user.role}</div>
            </div>
            <button onClick={logout} className="btn btn-secondary !min-h-9 !py-1 !px-3 text-sm">Sign out</button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {children}
        </div>
      </main>

      <footer className="text-center text-[11px] text-slate-400 py-4">
        PCR Pilot — DEMO. Not HIPAA-compliant. Sample data only.
      </footer>
    </div>
  );
}
