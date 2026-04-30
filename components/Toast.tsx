'use client';
import { useEffect, useState } from 'react';

let externalPush: ((msg: string, kind?: 'ok'|'warn'|'err') => void) | null = null;

export function pushToast(msg: string, kind: 'ok'|'warn'|'err' = 'ok') {
  if (externalPush) externalPush(msg, kind);
}

export default function ToastHost() {
  const [items, setItems] = useState<{id: number; msg: string; kind: 'ok'|'warn'|'err'}[]>([]);
  useEffect(() => {
    externalPush = (msg, kind = 'ok') => {
      const id = Date.now() + Math.random();
      setItems(prev => [...prev, { id, msg, kind }]);
      setTimeout(() => setItems(prev => prev.filter(x => x.id !== id)), 3500);
    };
    return () => { externalPush = null; };
  }, []);
  return (
    <div className="fixed left-0 right-0 bottom-20 z-50 flex flex-col items-center gap-2 pointer-events-none">
      {items.map(it => (
        <div key={it.id} className={
          "px-4 py-2 rounded-xl shadow-lg text-sm font-semibold animate-slide-up pointer-events-auto " +
          (it.kind === 'ok'   ? 'bg-ok-500 text-white'   :
           it.kind === 'warn' ? 'bg-warn-500 text-white' :
                                'bg-err-500 text-white')
        }>
          {it.msg}
        </div>
      ))}
    </div>
  );
}
