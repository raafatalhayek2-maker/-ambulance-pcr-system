// lib/openai.ts — Powered by Claude (Anthropic)
// Drop-in replacement — same exports, Claude under the hood

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const MODEL = "claude-sonnet-4-20250514";

// ── OCR: Extract fields from text ──────────────────────────────────────────
export async function extractFieldsFromOCR(
  ocrText: string
): Promise<Record<string, string | null>> {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are an OCR field extractor for EMS patient care reports.
Extract the following fields from this text. Return ONLY valid JSON — no markdown, no explanation.
Set any field not found to null. NEVER invent or guess data.

Fields: patient_name, dob, age, mrn, insurance, pickup_facility, pickup_address,
destination_facility, destination_address, reason_for_transport, diagnosis, chief_complaint

Text:
${ocrText}

Return this exact JSON shape:
{"patient_name":null,"dob":null,"age":null,"mrn":null,"insurance":null,"pickup_facility":null,"pickup_address":null,"destination_facility":null,"destination_address":null,"reason_for_transport":null,"diagnosis":null,"chief_complaint":null}`,
      },
    ],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text : "{}";
  try {
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    return {};
  }
}

// ── Vision: Extract fields from image ──────────────────────────────────────
export async function extractFieldsFromImage(
  base64Image: string,
  mediaType: string
): Promise<Record<string, string | null>> {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as
                | "image/jpeg"
                | "image/png"
                | "image/gif"
                | "image/webp",
              data: base64Image,
            },
          },
          {
            type: "text",
            text: `You are reading an EMS patient document.
Extract ALL visible patient and trip information.
Return ONLY valid JSON — no markdown, no explanation.
Set any field not clearly visible to null. NEVER invent data.

{"patient_name":null,"dob":null,"age":null,"mrn":null,"insurance":null,"pickup_facility":null,"pickup_address":null,"destination_facility":null,"destination_address":null,"reason_for_transport":null,"diagnosis":null,"chief_complaint":null}`,
          },
        ],
      },
    ],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text : "{}";
  try {
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    return {};
  }
}

// ── Transcript: Extract clinical fields ────────────────────────────────────
export async function extractFieldsFromTranscript(
  transcript: string
): Promise<Record<string, string | null>> {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a clinical field extractor for EMS PCRs.
Extract ONLY information EXPLICITLY stated in this transcript.
NEVER invent clinical data, numbers, or findings.

RULES:
- vitals: not mentioned → "Vitals not provided"
- interventions: not mentioned → "No interventions documented"
- transfer_of_care: not mentioned → "Transfer of care not documented"
- Never invent BP, HR, SpO2, or any clinical numbers

Transcript:
${transcript}

Return ONLY this JSON:
{"patient_condition":null,"chief_complaint":null,"assessment":null,"mental_status":null,"mobility_status":null,"vitals":"Vitals not provided","interventions":"No interventions documented","transfer_of_care":"Transfer of care not documented","crew_notes":null}`,
      },
    ],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text : "{}";
  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    if (!parsed.vitals) parsed.vitals = "Vitals not provided";
    if (!parsed.interventions) parsed.interventions = "No interventions documented";
    if (!parsed.transfer_of_care) parsed.transfer_of_care = "Transfer of care not documented";
    return parsed;
  } catch {
    return {
      vitals: "Vitals not provided",
      interventions: "No interventions documented",
      transfer_of_care: "Transfer of care not documented",
    };
  }
}

// ── Narrative: Generate clinical paragraph ─────────────────────────────────
export async function generateNarrative(
  pcrData: Record<string, unknown>
): Promise<string> {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 800,
    messages: [
      {
        role: "user",
        content: `You are an expert EMS documentation specialist for AlHayek Ambulance / Alhakeem Health Service.

STRICT RULES:
- Use ONLY the data provided. Never add information not in the form.
- If vitals = "Vitals not provided" → write "Vitals were not documented at this time."
- If interventions = "No interventions documented" → use that phrase.
- Professional EMS clinical language. 4-6 sentences maximum.
- No diagnosis. Documentation only.

PCR DATA:
${JSON.stringify(pcrData, null, 2)}

Write ONLY the clinical narrative paragraph. No labels, no headers, no markdown.`,
      },
    ],
  });

  return msg.content[0].type === "text"
    ? msg.content[0].text.trim()
    : "Narrative could not be generated.";
}

// ── Audio Transcription ────────────────────────────────────────────────────
// Anthropic doesn't have audio transcription yet.
// If OPENAI_API_KEY exists, use Whisper. Otherwise return empty string.
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string
): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const { OpenAI } = await import("openai");
      const openai = new OpenAI({ apiKey: openaiKey });
      const { Readable } = await import("stream");
      const stream = Readable.from(audioBuffer);
      (stream as any).name = filename;
      const result = await openai.audio.transcriptions.create({
        file: stream as any,
        model: "whisper-1",
      });
      return result.text;
    } catch {
      return "";
    }
  }
  return "";
}
