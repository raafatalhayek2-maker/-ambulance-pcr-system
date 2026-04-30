import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { createWorker } from 'tesseract.js';
import { getServerSupabase, STORAGE_BUCKET } from '@/lib/supabase';
import { openai } from '@/lib/openai';

export const runtime = 'nodejs';
export const maxDuration = 60;

const EXTRACTION_SYSTEM = `You extract structured fields from EMS/medical paperwork (discharge summaries, facesheets, transfer paperwork) for a DEMO ePCR application. Return ONLY a JSON object matching the schema. Each field must be \`null\` if not confidently found in the text. NEVER invent values.`;

const EXTRACTION_USER = (text: string) => `Extract these fields from the document text below. If a field is not present or you are not confident, set it to null. Use the exact wording from the document where possible.

Schema:
{
  "patient_name": string|null,
  "dob": string|null,                       // any format the document uses
  "age": string|null,
  "mrn": string|null,
  "insurance": string|null,
  "pickup_facility": string|null,
  "pickup_address": string|null,
  "destination_facility": string|null,
  "destination_address": string|null,
  "reason_for_transport": string|null,
  "diagnosis": string|null,
  "discharge_instructions": string|null
}

Document text:
"""
${text}
"""

Return ONLY the JSON object. No prose.`;

function isGarbledOrEmpty(text: string): boolean {
  if (!text) return true;
  const trimmed = text.trim();
  if (trimmed.length < 30) return true;
  const alnum = (trimmed.match(/[a-zA-Z0-9]/g) || []).length;
  // Require at least 30 alphanumeric characters; otherwise treat as garbled.
  return alnum < 30;
}

async function extractWithTesseract(buffer: Buffer): Promise<string> {
  const worker = await createWorker('eng');
  try {
    const { data } = await worker.recognize(buffer);
    return data.text || '';
  } finally {
    await worker.terminate();
  }
}

async function extractWithVisionFallback(dataUrl: string): Promise<{ text: string; extracted: any }> {
  const client = openai();
  // Single vision call: extract structured JSON directly from the image.
  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: EXTRACTION_SYSTEM },
      {
        role: 'user',
        content: [
          { type: 'text', text: EXTRACTION_USER('(image only — extract directly from the photo)') },
          { type: 'image_url', image_url: { url: dataUrl } },
        ] as any,
      },
    ],
  });
  const raw = completion.choices[0]?.message?.content || '{}';
  let parsed: any = {};
  try { parsed = JSON.parse(raw); } catch { parsed = {}; }
  return { text: '(vision-extracted, no OCR text)', extracted: parsed };
}

async function extractStructuredFromText(text: string): Promise<any> {
  const client = openai();
  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: EXTRACTION_SYSTEM },
      { role: 'user', content: EXTRACTION_USER(text) },
    ],
  });
  const raw = completion.choices[0]?.message?.content || '{}';
  try { return JSON.parse(raw); } catch { return {}; }
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const pcrId = form.get('pcr_id') as string | null;
    if (!file || !pcrId) {
      return NextResponse.json({ error: 'Missing file or pcr_id' }, { status: 400 });
    }

    const arr = await file.arrayBuffer();
    const buf = Buffer.from(arr);

    // 1) Upload original image to Supabase Storage
    const sb = getServerSupabase();
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const objectPath = `pcr/${pcrId}/scan-${uuid()}.${ext}`;
    const upRes = await sb.storage.from(STORAGE_BUCKET).upload(objectPath, buf, {
      contentType: file.type || 'image/jpeg', upsert: false,
    });
    if (upRes.error) {
      // Storage may not be set up — continue, just return null URL
      console.warn('storage upload failed:', upRes.error.message);
    }
    const pubUrl = sb.storage.from(STORAGE_BUCKET).getPublicUrl(objectPath).data.publicUrl;

    // 2) OCR with Tesseract first
    let ocrText = '';
    let extracted: any = {};
    try {
      ocrText = await extractWithTesseract(buf);
    } catch (e: any) {
      console.warn('tesseract failed, falling back to vision:', e?.message);
    }

    if (isGarbledOrEmpty(ocrText)) {
      // 3) Vision fallback
      const dataUrl = `data:${file.type || 'image/jpeg'};base64,${buf.toString('base64')}`;
      const out = await extractWithVisionFallback(dataUrl);
      ocrText = ocrText || out.text;
      extracted = out.extracted;
    } else {
      // 3b) Send OCR text to LLM for structured extraction
      extracted = await extractStructuredFromText(ocrText);
    }

    // 4) Persist attachment row
    await sb.from('pcr_attachments').insert({
      pcr_id: pcrId,
      type: 'image',
      file_url: pubUrl || objectPath,
      ocr_text: ocrText,
    });

    // 5) Patch PCR with non-null fields
    const allowed = ['patient_name','dob','age','mrn','insurance',
      'pickup_facility','pickup_address',
      'destination_facility','destination_address',
      'reason_for_transport','diagnosis'];
    const patch: Record<string, any> = {};
    for (const k of allowed) {
      const v = extracted?.[k];
      if (v != null && String(v).trim() !== '') patch[k] = String(v).trim();
    }
    if (Object.keys(patch).length > 0) {
      await sb.from('pcrs').update(patch).eq('id', pcrId);
    }

    return NextResponse.json({
      ocr_text: ocrText,
      extracted,
      patch,
      attachment_url: pubUrl,
    });
  } catch (e: any) {
    console.error('OCR route error:', e);
    return NextResponse.json({ error: e?.message || 'OCR failed' }, { status: 500 });
  }
}
