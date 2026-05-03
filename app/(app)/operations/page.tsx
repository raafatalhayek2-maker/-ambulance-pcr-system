import Link from 'next/link';

const items = [
  {
    href: '/employees',
    title: 'Employees',
    desc: 'Add staff profiles, roles, contact info, and hourly rates.',
    icon: '👥',
  },
  {
    href: '/time-clock',
    title: 'Time Clock',
    desc: 'Clock in/out, live shift timer, shift notes, and recent time entries.',
    icon: '⏱️',
  },
  {
    href: '/payroll',
    title: 'Payroll Summary',
    desc: 'Weekly hours and estimated gross pay from completed shifts.',
    icon: '💵',
  },
];

export default function OperationsPage() {
  return (
    <div className="space-y-4">
      <div className="card">
        <div className="text-xs uppercase tracking-wide text-slate-500">V2 module</div>
        <h1 className="text-2xl font-bold text-slate-900">Operations</h1>
        <p className="text-sm text-slate-500 mt-1">Employee management, time clock, and payroll demo tools for ambulance operations.</p>
      </div>

      <div className="space-y-3">
        {items.map(item => (
          <Link key={item.href} href={item.href} className="card flex items-center justify-between gap-3 hover:bg-slate-50 transition">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 grid place-items-center text-2xl">{item.icon}</div>
              <div>
                <div className="font-bold text-slate-900">{item.title}</div>
                <div className="text-sm text-slate-500">{item.desc}</div>
              </div>
            </div>
            <div className="text-slate-300 text-2xl">›</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
