import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getServerSupabase, STORAGE_BUCKET } from '@/lib/supabase';
import { openai } from '@/lib/openai';

export const runtime = 'nodejs';
export const maxDuration = 60;

const VOICE_SYSTEM = `You extract structured clinical fields from an EMT/EMS post-trip voice narrative for a DEMO ePCR application. You MUST follow these rules exactly:
- Only fill a field if the EMT explicitly stated information for it in the transcript.
- If vitals are not mentioned, set vitals to exactly: 'Vitals not provided'.
- If no interventions are mentioned, set interventions to exactly: 'No interventions documented'.
- If transfer of care is not described, set transfer_of_care to exactly: 'Transfer of care not documented'.
- Never invent numbers (BP, HR, SpO2, etc.). Never invent clinical findings.
Return ONLY a JSON object matching the schema.`;

const VOICE_USER = (transcript: string) => `Extract these fields from the EMT post-trip voice transcript. Each field must be a plain string (not an object). If the EMT did not state info for a field, set it to null EXCEPT for vitals/interventions/transfer_of_care which must use the exact sentinel strings defined in the system message.

Schema:
{
  "patient_condition": string|null,
  "chief_complaint": string|null,
  "assessment": string|null,
  "mental_status": string|null,
  "mobility_status": string|null,
  "vitals": string,                  // 'Vitals not provided' if not mentioned
  "interventions": string,           // 'No interventions documented' if none
  "transport_narrative": string|null,
  "transfer_of_care": string         // 'Transfer of care not documented' if not described
}

Transcript:
"""
${transcript}
"""

Return ONLY the JSON object. No prose.`;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const pcrId = form.get('pcr_id') as string | null;
    if (!file || !pcrId) return NextResponse.json({ error: 'Missing file or pcr_id' }, { status: 400 });

    const arr = await file.arrayBuffer();
    const buf = Buffer.from(arr);
    const sb = getServerSupabase();
    const ext = (file.name.split('.').pop() || 'webm').toLowerCase();
    const objectPath = `pcr/${pcrId}/voice-${uuid()}.${ext}`;
    const upRes = await sb.storage.from(STORAGE_BUCKET).upload(objectPath, buf, {
      contentType: file.type || 'audio/webm', upsert: false,
    });
    if (upRes.error) console.warn('audio upload failed:', upRes.error.message);
    const pubUrl = sb.storage.from(STORAGE_BUCKET).getPublicUrl(objectPath).data.publicUrl;

    // 1) Whisper transcription
    const client = openai();
    const transcription = await client.audio.transcriptions.create({
      file: new File([buf], file.name || `voice.${ext}`, { type: file.type || 'audio/webm' }) as any,
      model: 'whisper-1',
    });
    const transcript = transcription.text || '';

    // 2) Structured extraction
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: VOICE_SYSTEM },
        { role: 'user', content: VOICE_USER(transcript) },
      ],
    });
    let extracted: any = {};
    try { extracted = JSON.parse(completion.choices[0]?.message?.content || '{}'); } catch {}

    // 3) Persist attachment
    await sb.from('pcr_attachments').insert({
      pcr_id: pcrId,
      type: 'audio',
      file_url: pubUrl || objectPath,
      transcript,
    });

    // 4) Patch PCR — vitals/interventions/transfer use the explicit sentinel strings
    const allowed = ['patient_condition','chief_complaint','assessment','mental_status','mobility_status',
                     'vitals','interventions','transport_narrative','transfer_of_care'];
    const patch: Record<string, any> = {};
    for (const k of allowed) {
      const v = extracted?.[k];
      if (v != null && String(v).trim() !== '') patch[k] = String(v).trim();
    }
    // Defensively enforce sentinels if the LLM left them null
    if (!patch.vitals)            patch.vitals = 'Vitals not provided';
    if (!patch.interventions)     patch.interventions = 'No interventions documented';
    if (!patch.transfer_of_care)  patch.transfer_of_care = 'Transfer of care not documented';

    await sb.from('pcrs').update(patch).eq('id', pcrId);

    return NextResponse.json({ transcript, extracted, patch, attachment_url: pubUrl });
  } catch (e: any) {
    console.error('transcribe error:', e);
    return NextResponse.json({ error: e?.message || 'Transcription failed' }, { status: 500 });
  }
}
