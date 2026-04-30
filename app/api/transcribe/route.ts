import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getServerSupabase, STORAGE_BUCKET } from '@/lib/supabase';
import { extractFieldsFromTranscript, transcribeAudio } from '@/lib/openai';

export const runtime = 'nodejs';
export const maxDuration = 60;

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

    // 1) Whisper transcription (via OpenAI key if available, else empty)
    const transcript = await transcribeAudio(buf, file.name || `voice.${ext}`);

    // 2) Structured extraction via Claude
    const extracted: any = transcript
      ? await extractFieldsFromTranscript(transcript)
      : {
          vitals: 'Vitals not provided',
          interventions: 'No interventions documented',
          transfer_of_care: 'Transfer of care not documented',
        };

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
