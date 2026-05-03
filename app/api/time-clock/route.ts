import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

function hoursBetween(startIso: string, endIso: string, breakMinutes = 0) {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  const raw = Math.max(0, ms / 36e5);
  return Math.max(0, raw - breakMinutes / 60);
}

export async function GET(req: NextRequest) {
  const sb = getServerSupabase();
  const employeeId = req.nextUrl.searchParams.get('employeeId');
  const openOnly = req.nextUrl.searchParams.get('open') === 'true';

  let q = sb.from('time_entries').select('*, employees(full_name, role, hourly_rate)').order('clock_in_at', { ascending: false });
  if (employeeId) q = q.eq('employee_id', employeeId);
  if (openOnly) q = q.is('clock_out_at', null);

  const { data, error } = await q.limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const entries = (data || []).map((entry: any) => ({
    ...entry,
    hours_worked: entry.clock_out_at
      ? Number(hoursBetween(entry.clock_in_at, entry.clock_out_at, entry.break_minutes).toFixed(2))
      : null,
  }));

  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action;
    const employee_id = body.employee_id;
    const sb = getServerSupabase();

    if (!employee_id) return NextResponse.json({ error: 'employee_id is required' }, { status: 400 });

    if (action === 'clock_in') {
      const { data: openShift } = await sb
        .from('time_entries')
        .select('*')
        .eq('employee_id', employee_id)
        .is('clock_out_at', null)
        .maybeSingle();

      if (openShift) {
        return NextResponse.json({ error: 'Employee already has an open shift', entry: openShift }, { status: 409 });
      }

      const { data, error } = await sb.from('time_entries').insert({
        employee_id,
        shift_role: body.shift_role || null,
        notes: body.notes || null,
      }).select('*, employees(full_name, role, hourly_rate)').single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ entry: data });
    }

    if (action === 'clock_out') {
      const break_minutes = Number(body.break_minutes || 0);
      if (Number.isNaN(break_minutes) || break_minutes < 0) {
        return NextResponse.json({ error: 'break_minutes must be 0 or higher' }, { status: 400 });
      }

      const { data: openShift, error: findError } = await sb
        .from('time_entries')
        .select('*')
        .eq('employee_id', employee_id)
        .is('clock_out_at', null)
        .maybeSingle();

      if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
      if (!openShift) return NextResponse.json({ error: 'No open shift found for this employee' }, { status: 404 });

      const { data, error } = await sb
        .from('time_entries')
        .update({
          clock_out_at: new Date().toISOString(),
          break_minutes,
          notes: body.notes ?? openShift.notes,
        })
        .eq('id', openShift.id)
        .select('*, employees(full_name, role, hourly_rate)')
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({
        entry: data,
        hours_worked: Number(hoursBetween(data.clock_in_at, data.clock_out_at, data.break_minutes).toFixed(2)),
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use clock_in or clock_out.' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
