import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { deriveStatus } from '@/lib/missing';

export const runtime = 'nodejs';

/** GET /api/pcr/:id */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = getServerSupabase();
  const { data, error } = await sb.from('pcrs').select('*').eq('id', params.id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: atts } = await sb.from('pcr_attachments').select('*').eq('pcr_id', params.id).order('created_at');
  return NextResponse.json({ pcr: data, attachments: atts || [] });
}

/**
 * PUT /api/pcr/:id  body: { patch: {...}, recompute_status: bool, user_id?: string }
 * Patch is a flat object of column -> value. Status is recomputed if requested.
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const patch = body.patch || {};
    const sb = getServerSupabase();

    // Fetch current
    const { data: cur, error: e1 } = await sb.from('pcrs').select('*').eq('id', params.id).maybeSingle();
    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });
    if (!cur) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const merged = { ...cur, ...patch };

    // Strip read-only fields the client should never send
    delete (patch as any).id;
    delete (patch as any).created_at;
    delete (patch as any).updated_at;
    delete (patch as any).reviewed_at;
    delete (patch as any).reviewed_by;
    delete (patch as any).emt_id;

    if (body.recompute_status !== false) {
      patch.status = deriveStatus(merged, cur.status);
    }

    const { data, error } = await sb.from('pcrs').update(patch).eq('id', params.id).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (body.user_id) {
      await sb.from('audit_log').insert({ pcr_id: params.id, user_id: body.user_id, action: 'updated' });
    }
    return NextResponse.json({ pcr: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
