import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const sb = getServerSupabase();
    const { data, error } = await sb.from('pcrs').update({
      status: 'Completed',
      reviewed_at: new Date().toISOString(),
      reviewed_by: body.reviewer_id || null,
    }).eq('id', params.id).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await sb.from('audit_log').insert({ pcr_id: params.id, user_id: body.reviewer_id || null, action: 'reviewed' });
    return NextResponse.json({ pcr: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
