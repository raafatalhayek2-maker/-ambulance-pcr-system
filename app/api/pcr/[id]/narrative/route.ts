import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { openai } from '@/lib/openai';

export const runtime = 'nodejs';
export const maxDuration = 30;

const SYSTEM = `You are an EMS documentation assistant. You write a clean, medical-legal PCR narrative paragraph using ONLY the data the user provides. You MUST follow these rules:
- Use ONLY facts present in the supplied form fields. Do not invent any clinical data, vital signs, or events.
- If a field is missing or empty, write the explicit phrase: "not documented" in that part of the narrative (e.g. "Vitals not documented.", "Transfer of care not documented.").
- Output should follow this overall structure as a single paragraph:
  "Patient was transported [trip type] from [pickup facility] to [destination facility]. Upon arrival, patient was found [condition]. Patient was [mental status], breathing normally, and in [distress status]. Patient denied chest pain, shortness of breath, dizziness, or acute complaints. [Interventions]. Patient was secured appropriately and transported without incident. Care was transferred to receiving staff at destination."
- If a phrase like "[distress status]" cannot be inferred from the data, replace it with "no apparent distress" only if patient_condition or assessment supports it; otherwise use "distress not documented".
- Output ONLY the paragraph. No headings, no bullet points.`;

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

    const client = openai();
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Form facts (JSON):\n${JSON.stringify(facts, null, 2)}\n\nWrite the narrative now.` },
      ],
    });
    const narrative = (completion.choices[0]?.message?.content || '').trim();
    await sb.from('pcrs').update({ generated_narrative: narrative }).eq('id', params.id);
    return NextResponse.json({ narrative });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
