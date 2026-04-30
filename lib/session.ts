'use client';
import { User } from './types';

const KEY = 'pcrpilot.session';

export function saveSession(user: User) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(user));
}
export function getSession(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) as User : null;
  } catch { return null; }
}
export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
}
