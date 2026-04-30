import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { createWorker } from 'tesseract.js';
import { getServerSupabase, STORAGE_BUCKET } from '@/lib/supabase';
import { extractFieldsFromOCR, extractFieldsFromImage } from '@/lib/openai';

export const runtime = 'nodejs';
export const maxDuration = 60;

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
      // 3) Vision fallback — use Claude vision
      const base64Image = buf.toString('base64');
      const mediaType = file.type || 'image/jpeg';
      extracted = await extractFieldsFromImage(base64Image, mediaType);
      ocrText = ocrText || '(vision-extracted, no OCR text)';
    } else {
      // 3b) Send OCR text to Claude for structured extraction
      extracted = await extractFieldsFromOCR(ocrText);
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
