'use client';
import { useEffect, useRef, useState } from 'react';

export interface AddressPick {
  display_name: string;
  lat: number;
  lng: number;
}

interface Props {
  id: string;
  value: string;
  onChange: (val: string) => void;
  onPick: (pick: AddressPick) => void;
  placeholder?: string;
  autofilled?: boolean;
}

interface Suggestion { display_name: string; lat: string; lon: string; place_id: number; }

export default function AddressAutocomplete({ id, value, onChange, onPick, placeholder, autofilled }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounce = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!value || value.length < 3) { setSuggestions([]); return; }
    debounce.current = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        setSuggestions(data.results || []);
        setOpen(true);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }, 300);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [value]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <input id={id} className="input" placeholder={placeholder || 'Start typing an address…'}
             value={value} onChange={e => onChange(e.target.value)}
             onFocus={() => suggestions.length && setOpen(true)} autoComplete="off" />
      {loading && <div className="absolute right-3 top-3 text-xs text-slate-400">…</div>}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-lg max-h-72 overflow-auto">
          {suggestions.slice(0, 5).map(s => (
            <li key={s.place_id}>
              <button type="button"
                onClick={() => {
                  onChange(s.display_name);
                  onPick({ display_name: s.display_name, lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm border-b border-slate-100 last:border-b-0">
                {s.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
