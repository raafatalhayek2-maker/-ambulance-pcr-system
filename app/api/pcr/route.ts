import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { deriveStatus } from '@/lib/missing';

export const runtime = 'nodejs';

/** GET /api/pcr?emtId=...  OR  ?supervisor=1 */
export async function GET(req: NextRequest) {
  const sb = getServerSupabase();
  const emtId = req.nextUrl.searchParams.get('emtId');
  const supervisor = req.nextUrl.searchParams.get('supervisor');
  const filter = req.nextUrl.searchParams.get('filter');

  let q = sb.from('pcrs').select('*').order('created_at', { ascending: false });
  if (emtId) q = q.eq('emt_id', emtId);

  if (supervisor && filter && filter !== 'All') {
    if (filter === 'Ready for Billing') {
      q = q.eq('status', 'Ready for Billing');
    } else {
      q = q.eq('status', filter);
    }
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Optional: join EMT name if supervisor
  if (supervisor) {
    const ids = Array.from(new Set((data || []).map(d => d.emt_id).filter(Boolean)));
    if (ids.length) {
      const { data: users } = await sb.from('users').select('id, full_name').in('id', ids);
      const map = new Map((users || []).map(u => [u.id, u.full_name]));
      (data || []).forEach((d: any) => { d.emt_name = map.get(d.emt_id) || ''; });
    }
  }

  return NextResponse.json({ pcrs: data || [] });
}

/** POST /api/pcr  body: { emt_id, trip_type } -> creates a fresh PCR */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sb = getServerSupabase();

    const initial = {
      emt_id: body.emt_id,
      trip_type: body.trip_type,
      status: 'Draft',
      vitals: 'Vitals not provided',
      interventions: 'No interventions documented',
      transfer_of_care: 'Transfer of care not documented',
    };
    const { data, error } = await sb.from('pcrs').insert(initial).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await sb.from('audit_log').insert({ pcr_id: data.id, user_id: body.emt_id, action: 'created' });
    return NextResponse.json({ pcr: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
