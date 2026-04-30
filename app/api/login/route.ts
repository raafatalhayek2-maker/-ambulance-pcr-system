import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * DEMO ONLY login. Plaintext password match against the seeded users table.
 * Do NOT use this pattern in production.
 */
export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'Missing username or password' }, { status: 400 });
    }
    const sb = getServerSupabase();
    const { data, error } = await sb
      .from('users')
      .select('id, username, password, role, full_name')
      .eq('username', username)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.password !== password) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    return NextResponse.json({
      user: { id: data.id, username: data.username, role: data.role, full_name: data.full_name },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
