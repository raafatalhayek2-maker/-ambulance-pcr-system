import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const sb = getServerSupabase();
  const active = req.nextUrl.searchParams.get('active');

  let q = sb.from('employees').select('*').order('created_at', { ascending: false });
  if (active === 'true') q = q.eq('active', true);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ employees: data || [] });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const full_name = String(body.full_name || '').trim();
    const role = body.role || 'Driver';
    const hourly_rate = Number(body.hourly_rate || 0);

    if (!full_name) return NextResponse.json({ error: 'Employee name is required' }, { status: 400 });
    if (!['EMT','Driver','Supervisor','Admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid employee role' }, { status: 400 });
    }
    if (Number.isNaN(hourly_rate) || hourly_rate < 0) {
      return NextResponse.json({ error: 'Hourly rate must be 0 or higher' }, { status: 400 });
    }

    const sb = getServerSupabase();
    const { data, error } = await sb.from('employees').insert({
      full_name,
      role,
      phone: body.phone || null,
      email: body.email || null,
      hourly_rate,
      active: body.active ?? true,
    }).select('*').single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ employee: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
