'use client';
import { ReactNode } from 'react';

export function Field({
  id, label, autofilled, children,
}: { id?: string; label: string; autofilled?: boolean; children: ReactNode }) {
  return (
    <div id={id} className="mb-3 animate-fade-in">
      <label className="label" htmlFor={id}>
        {label}
        {autofilled && <span className="autofill-badge">Auto-filled</span>}
      </label>
      {children}
    </div>
  );
}
