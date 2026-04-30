# PCR Pilot — DEMO ONLY ePCR demo

> **DEMO — Sample data only. Not HIPAA-compliant. Not for real patient information.**

PCR Pilot is a mobile-first proof-of-concept that lets ambulance/EMT crews draft Patient Care Reports (PCRs) with **minimal typing**. The headline demo flow:

1. EMT logs in on a phone.
2. Taps **Create New PCR**, picks a trip type.
3. Taps **📷 Scan Document** → rear camera opens → photographs a sample facesheet → form fields auto-fill (~10–15 s).
4. Taps **🎙️ Record Voice Note** → speaks a post-trip narrative → clinical fields auto-fill.
5. Generates a clean medical-legal narrative, checks for missing info, exports a PDF.

Supervisors get a dashboard of all PCRs with KPIs, filters, and a one-tap "Mark as Reviewed".

---

## Stack

- **Next.js 14** (App Router, TypeScript) — frontend + API routes
- **Tailwind CSS** — mobile-first styles
- **Supabase** — Postgres + Storage (free tier is plenty for the demo)
- **Anthropic Claude** (`claude-sonnet-4-20250514`)
  - **Vision** for image-based OCR field extraction (fallback when Tesseract fails)
  - **Claude** for structured field extraction from OCR text + narrative generation
- **OpenAI Whisper** (optional) — for voice transcription. If `OPENAI_API_KEY` is set, Whisper is used; otherwise voice upload is stored but not transcribed.
- **Tesseract.js** — primary OCR engine, runs in-process
- **Puppeteer + @sparticuz/chromium** — server-side PDF export
- **OpenStreetMap Nominatim** — free address autocomplete (swap for Google Places later if you provide a key)

No accounts/integrations beyond Supabase and Anthropic are needed. OpenAI is optional (only for Whisper transcription).

---

## 0. Prerequisites

- Node.js 18.17 or later
- A free Supabase project (https://supabase.com)
- An Anthropic API key (https://console.anthropic.com) — **required**
- An OpenAI API key (https://platform.openai.com) — **optional**, only for voice transcription

---

## 1. Setup

```bash
git clone <this-repo> pcr-pilot
cd pcr-pilot
npm install --legacy-peer-deps
cp .env.example .env.local
```

Edit `.env.local` and fill in the required variables (see comments inside).

### 1a. Create the Supabase database

In your Supabase project's **SQL Editor**, paste and run:

1. `supabase/migrations/0001_init.sql` — creates tables, indexes, triggers
2. `supabase/seed/seed.sql` — seeds 3 demo users and 5 sample PCRs

(If you have `psql` installed locally and set `DATABASE_URL`, you can also run `npm run db:push`.)

### 1b. Create the Supabase Storage bucket

In the Supabase dashboard:

- **Storage → New bucket**
- Name: `pcr-uploads` (must match `SUPABASE_STORAGE_BUCKET` in env)
- **Public bucket: ON** (so OCR images and audio can be served back if needed)

The bucket is required for camera and audio uploads. If it doesn't exist the routes log a warning and continue, but attachments won't be retrievable.

---

## 2. Run locally

```bash
npm run dev
# open http://localhost:3000 (use your laptop's LAN IP from your phone, e.g. http://192.168.1.10:3000)
```

Open the app on your phone:

- Login with **emt1 / demo123** (or emt2, sup1)
- Tap **Create New PCR**
- Tap **📷 Scan Document** → the **rear camera opens directly** on iOS Safari and Android Chrome
- Tap **🎙️ Record Voice Note** and speak

> ⚠️ Camera + microphone require an HTTPS origin on most browsers. `localhost` works on Chrome desktop and iOS Safari **only when reached over the LAN with HTTPS**. The simplest path is to deploy to Vercel for live phone testing.

---

## 3. Deploy to Vercel (recommended for phone demos)

PCR Pilot ships with `@sparticuz/chromium` so the PDF route runs on Vercel's Node.js runtime out of the box.

```bash
npm install -g vercel
vercel
```

Then in the **Vercel Project → Settings → Environment Variables** add the vars from `.env.example`:

| Name | Value |
| ---- | ----- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `SUPABASE_STORAGE_BUCKET` | `pcr-uploads` |
| `ANTHROPIC_API_KEY` | Your Anthropic (Claude) API key — **required** |
| `OPENAI_API_KEY` | Your OpenAI key — **optional** (only for Whisper voice transcription) |

Redeploy. Your phones can now hit the public Vercel URL.

> **Function timeouts.** OCR/transcribe/PDF routes set `maxDuration` up to 60 s. On Vercel Free this is capped at 10 s — upgrade to Pro for full-length voice notes and OCR on large images, or shorten audio clips.

---

## 4. Demo accounts

| Username | Password | Role | Name |
| -------- | -------- | ---- | ---- |
| `emt1` | `demo123` | EMT | David Demo |
| `emt2` | `demo123` | EMT | Raafat Alhayek |
| `sup1` | `demo123` | Supervisor | Sam Supervisor |

Demo passwords are stored **plaintext** in the database for the live demo only. **Never** use this pattern in production.

---

## 5. The 5 demo flows

### Flow 1 — Login & role routing
- EMT users land on **My PCRs** + Create New button.
- Supervisor lands on the **Dashboard** with KPI tiles and filter chips.
- Session is persisted in `localStorage` (demo only).

### Flow 2 — Create PCR + Camera OCR auto-fill
- Trip type picker → fresh PCR row created in DB.
- 📷 button uses `<input type="file" accept="image/*" capture="environment">` to launch the rear camera on iOS/Android.
- Image uploads to `/api/ocr`. Pipeline:
  1. **Tesseract.js** runs OCR locally on the server.
  2. If output is empty or fewer than ~30 alphanumeric chars (i.e. garbled), fall back to **Claude Vision** on the raw image.
  3. OCR text → Claude structured extractor → JSON of the 12 patient/trip fields (each `null` if not confidently found).
- Form fields stagger-fade in with a green **Auto-filled** badge that disappears when the user edits the field.
- Original image + OCR text stored in `pcr_attachments`.

### Flow 3 — Voice note auto-fill (anti-hallucination)
- 🎙️ button uses `MediaRecorder` (and accepts file uploads as fallback).
- Audio uploads to `/api/transcribe`. Pipeline:
  1. **Whisper** (OpenAI) transcribes the audio if `OPENAI_API_KEY` is set.
  2. Claude extracts clinical fields with **strict** anti-invention rules:
     - "Only fill a field if the EMT explicitly stated information for it in the transcript."
     - Vitals → `'Vitals not provided'` if not mentioned.
     - Interventions → `'No interventions documented'` if none.
     - Transfer of care → `'Transfer of care not documented'` if not described.
     - "Never invent numbers (BP, HR, SpO2, etc.). Never invent clinical findings."
  3. Server defensively re-applies the sentinel strings if the LLM ever leaves them `null`.
- Audio + transcript stored in `pcr_attachments`.

### Flow 4 — Address autocomplete + automatic mileage
- Pickup and destination fields call `/api/geocode` (Nominatim proxy) with a 300 ms debounce, top 5 suggestions.
- When both pickup and destination have lat/lng, mileage is computed automatically with the **haversine formula** and gets the green **Auto-filled** badge.
- To swap to Google Places later: replace the `/api/geocode` route's fetch URL and add `GOOGLE_PLACES_API_KEY`.

### Flow 5 — Missing info, narrative, PDF, supervisor review
- **Check for Missing Info** scans the form for: pickup/dropoff time, mileage, signatures, vitals (= sentinel string), destination address, reason for transport, transfer of care. Yellow chips appear at the top, each tappable to scroll to its field.
- **Generate Narrative** posts the form to Claude with a strict "use only data on the form; otherwise write 'not documented'" prompt — no invention, no extra clinical claims.
- **Export PDF** hits `/api/pcr/[id]/pdf` which renders a **pinned HTML template** through Chromium headless. Layout is defined once in code; do not regenerate.
- **Supervisor → row → Mark as Reviewed** flips status to `Completed` and writes an `audit_log` row.

---

## 6. Sample facesheet for live demos

Open `/sample-facesheet.html` (or use the link on the supervisor dashboard) and **print it on paper**. During the live demo:

1. Place the printed facesheet on the table.
2. EMT taps 📷 Scan Document and photographs it.
3. Patient name, DOB, MRN, insurance, pickup facility, destination facility, reason for transport, and diagnosis populate within ~10–15 s.

This makes the OCR magic visible and reliable on stage.

---

## 7. Database schema

See `supabase/migrations/0001_init.sql`. Tables:

- `users(id, username, password, role, full_name)`
- `pcrs(...)` — every column from the spec, plus `pickup_lat/lng` and `destination_lat/lng` for haversine
- `pcr_attachments(id, pcr_id, type, file_url, ocr_text, transcript, created_at)`
- `audit_log(id, pcr_id, user_id, action, timestamp)`

A trigger keeps `pcrs.updated_at` current on every UPDATE.

---

## 8. Status state machine

`Draft` → `Missing Info` ↔ `Pending Review` → `Completed` (or `Ready for Billing`)

- Status is **derived** on every save by `lib/missing.ts`:
  - any **critical** missing item ⇒ `Missing Info`
  - otherwise ⇒ `Pending Review`
- Supervisor "Mark as Reviewed" sets status to `Completed` and the next save will **not** auto-overwrite it.

---

## 9. Out of scope for v1

(Per the spec — intentionally not built.)

- Real EMSCharts/ESO/ImageTrend integration
- Real billing export
- Native iOS/Android apps
- Real HIPAA-compliant auth/storage
- Multi-tenant company management

---

## 10. Costs you should expect

For a single demo session (5–10 PCRs):

- **Anthropic**: a few cents (a handful of Claude API calls for OCR extraction + narrative).
- **OpenAI** (optional): a few cents for Whisper transcription if you use voice notes.
- **Supabase**: free tier.
- **Vercel**: free tier — but PDF export and large OCR images can hit the 10 s function limit on Free; bump to Pro if you need longer.

---

## 11. Troubleshooting

**Camera doesn't open on iPhone** → make sure you're on HTTPS (Vercel deploy, not raw `http://`).

**Microphone access denied** → iOS Safari requires HTTPS and a real user tap on the 🎙️ button.

**OCR returns nothing useful** → the Tesseract+Claude vision fallback handles most cases. If the photo is blurry or extreme angle, the vision model still works because it sees the raw image directly. If you must, retake the photo with better lighting.

**PDF export 500s on Vercel Free** → upgrade to Pro (timeout) or run `npm run dev` locally for the demo PDF.

**Supabase storage upload fails** → confirm the bucket exists and is public. The OCR/transcribe routes will still extract fields even if upload fails, but attachments won't be retrievable.

**Voice transcription returns empty** → make sure `OPENAI_API_KEY` is set in your environment. Anthropic does not yet support audio transcription, so Whisper (OpenAI) is used for that step.

---

## 12. License

DEMO ONLY. Provided as-is, with no warranty. Do not use with real patient information.
