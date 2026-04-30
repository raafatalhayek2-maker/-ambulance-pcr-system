'use client';
import { useState, ReactNode } from 'react';

export default function Section({
  title, children, defaultOpen = true,
}: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-3">
      <button type="button" className="section-toggle" onClick={() => setOpen(o => !o)}>
        <span>{title}</span>
        <span className={"text-slate-400 transition-transform " + (open ? "rotate-180" : "")}>▼</span>
      </button>
      {open && (
        <div className="card mt-2 animate-slide-up">
          {children}
        </div>
      )}
    </div>
  );
}
