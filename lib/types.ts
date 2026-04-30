export type Role = 'emt' | 'supervisor';

export interface User {
  id: string;
  username: string;
  role: Role;
  full_name: string;
}

export type PcrStatus = 'Draft' | 'Missing Info' | 'Pending Review' | 'Completed' | 'Ready for Billing';

export interface Pcr {
  id: string;
  emt_id: string | null;
  trip_type: string | null;
  status: PcrStatus;

  patient_name: string | null;
  dob: string | null;
  age: string | null;
  mrn: string | null;
  insurance: string | null;

  pickup_facility: string | null;
  pickup_address: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  pickup_time: string | null;

  destination_facility: string | null;
  destination_address: string | null;
  destination_lat: number | null;
  destination_lng: number | null;
  dropoff_time: string | null;

  mileage: number | null;
  reason_for_transport: string | null;
  diagnosis: string | null;

  patient_condition: string | null;
  chief_complaint: string | null;
  assessment: string | null;
  mental_status: string | null;
  mobility_status: string | null;

  vitals: string | null;
  interventions: string | null;
  transport_narrative: string | null;
  transfer_of_care: string | null;

  crew_notes: string | null;
  generated_narrative: string | null;

  patient_signature_done: boolean;
  crew_signature_done: boolean;

  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface PcrAttachment {
  id: string;
  pcr_id: string;
  type: 'image' | 'audio';
  file_url: string;
  ocr_text: string | null;
  transcript: string | null;
  created_at: string;
}

/** Fields that can be auto-filled by OCR */
export const OCR_FIELDS = [
  'patient_name','dob','age','mrn','insurance',
  'pickup_facility','pickup_address',
  'destination_facility','destination_address',
  'reason_for_transport','diagnosis',
  'discharge_instructions',
] as const;
export type OcrField = typeof OCR_FIELDS[number];

/** Fields that can be auto-filled by voice transcript */
export const VOICE_FIELDS = [
  'patient_condition','chief_complaint','assessment','mental_status','mobility_status',
  'vitals','interventions','transport_narrative','transfer_of_care',
] as const;
export type VoiceField = typeof VOICE_FIELDS[number];

export const TRIP_TYPES = [
  'Emergency',
  'Non-Emergency',
  'BLS Transport',
  'ALS Transport',
  'Routine Medical Transport',
  'Dialysis Transport',
  'Hospital Discharge',
  'Nursing Home Transfer',
] as const;
export type TripType = typeof TRIP_TYPES[number];
