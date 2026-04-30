import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser/anon client — safe to expose. Used for read-only public reads
 * if you want them; the demo mostly hits API routes, which use the server client.
 */
export function getBrowserSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anon, { auth: { persistSession: false } });
}

/**
 * Server-only client using the service role key. Used in API routes only.
 * NEVER import this into a client component.
 */
export function getServerSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) {
    throw new Error('Missing Supabase server env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'pcr-uploads';
