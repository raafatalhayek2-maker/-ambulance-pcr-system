import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { generateNarrative } from '@/lib/openai';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sb = getServerSupabase();
    const { data: p, error } = await sb.from('pcrs').select('*').eq('id', params.id).maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const facts = {
      trip_type: p.trip_type,
      pickup_facility: p.pickup_facility,
      destination_facility: p.destination_facility,
      patient_condition: p.patient_condition,
      mental_status: p.mental_status,
      mobility_status: p.mobility_status,
      chief_complaint: p.chief_complaint,
      assessment: p.assessment,
      vitals: p.vitals,
      interventions: p.interventions,
      transport_narrative: p.transport_narrative,
      transfer_of_care: p.transfer_of_care,
      reason_for_transport: p.reason_for_transport,
      diagnosis: p.diagnosis,
    };

    const narrative = await generateNarrative(facts);
    await sb.from('pcrs').update({ generated_narrative: narrative }).eq('id', params.id);
    return NextResponse.json({ narrative });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
