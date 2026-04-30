-- PCR Pilot — DEMO ONLY schema
-- Sample data only. Not for real patient information.

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop in reverse order for clean reset
DROP TABLE IF EXISTS audit_log         CASCADE;
DROP TABLE IF EXISTS pcr_attachments   CASCADE;
DROP TABLE IF EXISTS pcrs              CASCADE;
DROP TABLE IF EXISTS users             CASCADE;

CREATE TABLE users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username    text UNIQUE NOT NULL,
  password    text NOT NULL,                -- DEMO ONLY plaintext — do NOT use in production
  role        text NOT NULL CHECK (role IN ('emt','supervisor')),
  full_name   text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pcrs (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  emt_id                   uuid REFERENCES users(id) ON DELETE SET NULL,
  trip_type                text,
  status                   text NOT NULL DEFAULT 'Draft'
                              CHECK (status IN ('Draft','Missing Info','Pending Review','Completed','Ready for Billing')),

  -- Patient info
  patient_name             text,
  dob                      text,
  age                      text,
  mrn                      text,
  insurance                text,

  -- Pickup
  pickup_facility          text,
  pickup_address           text,
  pickup_lat               double precision,
  pickup_lng               double precision,
  pickup_time              text,

  -- Destination
  destination_facility     text,
  destination_address      text,
  destination_lat          double precision,
  destination_lng          double precision,
  dropoff_time             text,

  -- Trip
  mileage                  numeric,
  reason_for_transport     text,
  diagnosis                text,

  -- Clinical narrative
  patient_condition        text,
  chief_complaint          text,
  assessment               text,
  mental_status            text,
  mobility_status          text,

  -- Vitals / interventions / transfer
  vitals                   text,
  interventions            text,
  transport_narrative      text,
  transfer_of_care         text,

  -- Crew
  crew_notes               text,
  generated_narrative      text,

  -- Signatures (demo placeholders)
  patient_signature_done   boolean NOT NULL DEFAULT false,
  crew_signature_done      boolean NOT NULL DEFAULT false,

  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  reviewed_at              timestamptz,
  reviewed_by              uuid REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_pcrs_emt_id     ON pcrs(emt_id);
CREATE INDEX idx_pcrs_status     ON pcrs(status);
CREATE INDEX idx_pcrs_created_at ON pcrs(created_at DESC);

CREATE TABLE pcr_attachments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pcr_id      uuid NOT NULL REFERENCES pcrs(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('image','audio')),
  file_url    text NOT NULL,
  ocr_text    text,
  transcript  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pcr_attachments_pcr_id ON pcr_attachments(pcr_id);

CREATE TABLE audit_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pcr_id     uuid REFERENCES pcrs(id) ON DELETE SET NULL,
  user_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  action     text NOT NULL,
  timestamp  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_log_pcr_id ON audit_log(pcr_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pcrs_touch_updated_at ON pcrs;
CREATE TRIGGER pcrs_touch_updated_at BEFORE UPDATE ON pcrs
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Storage bucket (run once in Supabase SQL editor — bucket creation
-- is also possible via dashboard). The bucket is public-read for the demo.
-- INSERT INTO storage.buckets (id, name, public) VALUES ('pcr-uploads', 'pcr-uploads', true)
--   ON CONFLICT (id) DO NOTHING;
