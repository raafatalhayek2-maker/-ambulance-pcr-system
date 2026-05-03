import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

function calcHours(clockIn: string, clockOut: string | null, breakMinutes = 0) {
  if (!clockOut) return 0;
  const ms = new Date(clockOut).getTime() - new Date(clockIn).getTime();
  const raw = Math.max(0, ms / 36e5);
  return Math.max(0, raw - breakMinutes / 60);
}

export async function GET(req: NextRequest) {
  const sb = getServerSupabase();
  const employeeId = req.nextUrl.searchParams.get('employeeId');
  const start = req.nextUrl.searchParams.get('start');
  const end = req.nextUrl.searchParams.get('end');

  let q = sb
    .from('time_entries')
    .select('*, employees(id, full_name, role, hourly_rate)')
    .not('clock_out_at', 'is', null)
    .order('clock_in_at', { ascending: false });

  if (employeeId) q = q.eq('employee_id', employeeId);
  if (start) q = q.gte('clock_in_at', start);
  if (end) q = q.lte('clock_in_at', end);

  const { data, error } = await q.limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = new Map<string, any>();
  for (const entry of data || []) {
    const employee = Array.isArray(entry.employees) ? entry.employees[0] : entry.employees;
    if (!employee) continue;
    const hours = calcHours(entry.clock_in_at, entry.clock_out_at, entry.break_minutes);
    const current = rows.get(employee.id) || {
      employee_id: employee.id,
      full_name: employee.full_name,
      role: employee.role,
      hourly_rate: Number(employee.hourly_rate || 0),
      shifts: 0,
      total_hours: 0,
      gross_pay: 0,
    };
    current.shifts += 1;
    current.total_hours += hours;
    current.gross_pay += hours * Number(employee.hourly_rate || 0);
    rows.set(employee.id, current);
  }

  const payroll = Array.from(rows.values()).map(row => ({
    ...row,
    total_hours: Number(row.total_hours.toFixed(2)),
    gross_pay: Number(row.gross_pay.toFixed(2)),
  }));

  const totals = payroll.reduce((acc, row) => {
    acc.total_hours += row.total_hours;
    acc.gross_pay += row.gross_pay;
    acc.shifts += row.shifts;
    return acc;
  }, { total_hours: 0, gross_pay: 0, shifts: 0 });

  return NextResponse.json({
    payroll,
    totals: {
      shifts: totals.shifts,
      total_hours: Number(totals.total_hours.toFixed(2)),
      gross_pay: Number(totals.gross_pay.toFixed(2)),
    },
  });
}
