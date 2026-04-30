'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Section from '@/components/Section';
import { Field } from '@/components/Field';
import CameraButton from '@/components/CameraButton';
import VoiceRecorder from '@/components/VoiceRecorder';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { pushToast } from '@/components/Toast';
import { getSession } from '@/lib/session';
import { Pcr } from '@/lib/types';
import { checkMissing, MissingFinding } from '@/lib/missing';
import { haversineMiles } from '@/lib/haversine';

type Patch = Partial<Pcr>;

export default function PcrEditor() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [pcr, setPcr] = useState<Pcr | null>(null);
  const [autofilled, setAutofilled] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState<MissingFinding[]>([]);

  // Load
  useEffect(() => {
    fetch(`/api/pcr/${id}`).then(r => r.json()).then(d => {
      if (d?.pcr) {
        setPcr(d.pcr);
        setMissing(checkMissing(d.pcr));
      }
    });
  }, [id]);

  // Helpers
  function update<K extends keyof Pcr>(key: K, value: Pcr[K]) {
    setPcr(prev => prev ? { ...prev, [key]: value } : prev);
    setAutofilled(prev => {
      const n = new Set(prev); n.delete(key as string); return n;
    });
  }

  function applyAutofill(patch: Record<string, any>) {
    setPcr(prev => {
      if (!prev) return prev;
      const next = { ...prev };
      const keys = Object.keys(patch);
      const newAuto = new Set(autofilled);
      keys.forEach((k, i) => {
        const v = patch[k];
        if (v == null || String(v).trim() === '') return;
        // staggered fade-in via timeouts
        setTimeout(() => {
          setPcr(p2 => p2 ? ({ ...p2, [k]: v }) : p2);
          setAutofilled(prev2 => new Set([...prev2, k]));
        }, i * 80);
      });
      // Run missing-info recheck after stagger settles
      setTimeout(() => setMissing(checkMissing({ ...next, ...patch } as any)), keys.length * 80 + 50);
      return prev;
    });
  }

  // Handler for new CameraButton interface: receives a File, uploads to OCR API
  async function handleCameraCapture(file: File) {
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('pcr_id', id);
      const res = await fetch('/api/ocr', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'OCR failed');
      applyAutofill(data.extracted || {});
      pushToast('Document scanned. Fields auto-filled.', 'ok');
    } catch (e: any) {
      pushToast(e?.message || 'OCR failed', 'err');
    }
  }

  // Auto-mileage when both lat/lng present
  useEffect(() => {
    if (!pcr) return;
    if (pcr.pickup_lat != null && pcr.pickup_lng != null &&
        pcr.destination_lat != null && pcr.destination_lng != null) {
      const miles = haversineMiles(pcr.pickup_lat, pcr.pickup_lng, pcr.destination_lat, pcr.destination_lng);
      const rounded = Math.round(miles * 10) / 10;
      if (Number(pcr.mileage) !== rounded) {
        setPcr(prev => prev ? { ...prev, mileage: rounded } : prev);
        setAutofilled(prev => new Set([...prev, 'mileage']));
      }
    }
  }, [pcr?.pickup_lat, pcr?.pickup_lng, pcr?.destination_lat, pcr?.destination_lng]); // eslint-disable-line

  async function save(showToast = true) {
    if (!pcr) return;
    const u = getSession();
    setBusy(true);
    try {
      // Strip server-managed fields before sending
      const { id: _id, created_at, updated_at, reviewed_at, reviewed_by, emt_id, ...rest } = pcr as any;
      const res = await fetch(`/api/pcr/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patch: rest, user_id: u?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Save failed');
      setPcr(data.pcr);
      setMissing(checkMissing(data.pcr));
      if (showToast) pushToast('Saved.', 'ok');
    } catch (e: any) {
      pushToast(e?.message || 'Save failed', 'err');
    } finally {
      setBusy(false);
    }
  }

  async function generateNarrative() {
    setBusy(true);
    try {
      // Save first so the LLM sees latest values
      await save(false);
      const res = await fetch(`/api/pcr/${id}/narrative`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Narrative failed');
      setPcr(prev => prev ? { ...prev, generated_narrative: data.narrative } : prev);
      pushToast('Narrative generated.', 'ok');
    } catch (e: any) {
      pushToast(e?.message || 'Narrative failed', 'err');
    } finally { setBusy(false); }
  }

  function exportPdf() {
    window.open(`/api/pcr/${id}/pdf`, '_blank');
  }

  function copyNarrative() {
    if (!pcr?.generated_narrative) {
      pushToast('No narrative to copy. Generate it first.', 'warn'); return;
    }
    navigator.clipboard.writeText(pcr.generated_narrative).then(
      () => pushToast('Narrative copied.', 'ok'),
      () => pushToast('Copy failed.', 'err')
    );
  }

  function recheckMissing() {
    if (!pcr) return;
    const found = checkMissing(pcr);
    setMissing(found);
    pushToast(found.length === 0 ? 'No missing fields.' : `${found.length} missing items.`, found.length === 0 ? 'ok' : 'warn');
  }

  function scrollTo(field: string) {
    const el = document.getElementById(field);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  if (!pcr) return <div className="text-center text-slate-500 py-12">Loading PCR…</div>;

  const af = (k: string) => autofilled.has(k);

  return (
    <div className="pb-24">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">PCR · {pcr.id.slice(0,8)}</div>
          <div className="text-lg font-bold">{pcr.trip_type || 'Trip'}</div>
        </div>
        <span className={"chip " + (
          pcr.status === 'Completed' || pcr.status === 'Ready for Billing' ? 'chip-success' :
          pcr.status === 'Missing Info' ? 'chip-warn' :
          pcr.status === 'Pending Review' ? 'chip-info' : 'chip-muted'
        )}>{pcr.status}</span>
      </div>

      {/* Capture buttons up top */}
      <div className="grid grid-cols-1 gap-2 mb-4">
        <CameraButton onCapture={handleCameraCapture} />
        <VoiceRecorder pcrId={pcr.id} onExtracted={applyAutofill} />
      </div>

      {/* Missing-info chips */}
      {missing.length > 0 && (
        <div className="card mb-3">
          <div className="text-xs font-semibold text-slate-700 mb-2">Missing info</div>
          <div className="flex flex-wrap gap-2">
            {missing.map(m => (
              <button key={m.field} onClick={() => scrollTo(m.field)}
                      className={"chip " + (m.critical ? "chip-warn" : "chip-muted") + " cursor-pointer"}>
                ⚠ {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---- Patient Info ---- */}
      <Section title="Patient Information">
        <Field id="patient_name" label="Patient name" autofilled={af('patient_name')}>
          <input className="input" value={pcr.patient_name || ''} onChange={e => update('patient_name', e.target.value)} />
        </Field>
        <Field id="dob" label="Date of birth" autofilled={af('dob')}>
          <input className="input" value={pcr.dob || ''} onChange={e => update('dob', e.target.value)} placeholder="YYYY-MM-DD or as written"/>
        </Field>
        <Field id="age" label="Age" autofilled={af('age')}>
          <input className="input" value={pcr.age || ''} onChange={e => update('age', e.target.value)} />
        </Field>
        <Field id="mrn" label="MRN" autofilled={af('mrn')}>
          <input className="input" value={pcr.mrn || ''} onChange={e => update('mrn', e.target.value)} />
        </Field>
        <Field id="insurance" label="Insurance" autofilled={af('insurance')}>
          <input className="input" value={pcr.insurance || ''} onChange={e => update('insurance', e.target.value)} />
        </Field>
      </Section>

      {/* ---- Pickup ---- */}
      <Section title="Pickup">
        <Field id="pickup_facility" label="Pickup facility" autofilled={af('pickup_facility')}>
          <input className="input" value={pcr.pickup_facility || ''} onChange={e => update('pickup_facility', e.target.value)} />
        </Field>
        <Field id="pickup_address" label="Pickup address" autofilled={af('pickup_address')}>
          <AddressAutocomplete id="pickup_address" value={pcr.pickup_address || ''}
            onChange={v => update('pickup_address', v)}
            onPick={p => { update('pickup_address', p.display_name); setPcr(prev => prev ? ({ ...prev, pickup_lat: p.lat, pickup_lng: p.lng }) : prev); }} />
        </Field>
        <Field id="pickup_time" label="Pickup time">
          <input className="input" type="datetime-local" value={pcr.pickup_time?.replace(' ','T').slice(0,16) || ''}
                 onChange={e => update('pickup_time', e.target.value.replace('T',' '))} />
        </Field>
      </Section>

      {/* ---- Destination ---- */}
      <Section title="Destination">
        <Field id="destination_facility" label="Destination facility" autofilled={af('destination_facility')}>
          <input className="input" value={pcr.destination_facility || ''} onChange={e => update('destination_facility', e.target.value)} />
        </Field>
        <Field id="destination_address" label="Destination address" autofilled={af('destination_address')}>
          <AddressAutocomplete id="destination_address" value={pcr.destination_address || ''}
            onChange={v => update('destination_address', v)}
            onPick={p => { update('destination_address', p.display_name); setPcr(prev => prev ? ({ ...prev, destination_lat: p.lat, destination_lng: p.lng }) : prev); }} />
        </Field>
        <Field id="dropoff_time" label="Dropoff time">
          <input className="input" type="datetime-local" value={pcr.dropoff_time?.replace(' ','T').slice(0,16) || ''}
                 onChange={e => update('dropoff_time', e.target.value.replace('T',' '))} />
        </Field>
      </Section>

      {/* ---- Trip ---- */}
      <Section title="Trip">
        <Field id="mileage" label={"Mileage"} autofilled={af('mileage')}>
          <input className="input" type="number" step="0.1" value={pcr.mileage ?? ''} onChange={e => update('mileage', e.target.value === '' ? null as any : Number(e.target.value))} />
          {af('mileage') && <div className="text-xs text-ok-500 mt-1">Auto-calculated from pickup/destination coords (haversine).</div>}
        </Field>
        <Field id="reason_for_transport" label="Reason for transport" autofilled={af('reason_for_transport')}>
          <input className="input" value={pcr.reason_for_transport || ''} onChange={e => update('reason_for_transport', e.target.value)} />
        </Field>
        <Field id="diagnosis" label="Diagnosis" autofilled={af('diagnosis')}>
          <input className="input" value={pcr.diagnosis || ''} onChange={e => update('diagnosis', e.target.value)} />
        </Field>
      </Section>

      {/* ---- Clinical Narrative ---- */}
      <Section title="Clinical Narrative">
        <Field id="patient_condition" label="Patient condition" autofilled={af('patient_condition')}>
          <textarea className="textarea" value={pcr.patient_condition || ''} onChange={e => update('patient_condition', e.target.value)} />
        </Field>
        <Field id="chief_complaint" label="Chief complaint" autofilled={af('chief_complaint')}>
          <input className="input" value={pcr.chief_complaint || ''} onChange={e => update('chief_complaint', e.target.value)} />
        </Field>
        <Field id="assessment" label="Assessment" autofilled={af('assessment')}>
          <textarea className="textarea" value={pcr.assessment || ''} onChange={e => update('assessment', e.target.value)} />
        </Field>
        <Field id="mental_status" label="Mental status" autofilled={af('mental_status')}>
          <input className="input" value={pcr.mental_status || ''} onChange={e => update('mental_status', e.target.value)} />
        </Field>
        <Field id="mobility_status" label="Mobility status" autofilled={af('mobility_status')}>
          <input className="input" value={pcr.mobility_status || ''} onChange={e => update('mobility_status', e.target.value)} />
        </Field>
      </Section>

      {/* ---- Vitals ---- */}
      <Section title="Vitals">
        <Field id="vitals" label="Vitals (free text)" autofilled={af('vitals')}>
          <textarea className="textarea" value={pcr.vitals || ''} onChange={e => update('vitals', e.target.value)} />
        </Field>
      </Section>

      {/* ---- Interventions ---- */}
      <Section title="Interventions">
        <Field id="interventions" label="Interventions (free text)" autofilled={af('interventions')}>
          <textarea className="textarea" value={pcr.interventions || ''} onChange={e => update('interventions', e.target.value)} />
        </Field>
      </Section>

      {/* ---- Transfer of Care ---- */}
      <Section title="Transfer of Care">
        <Field id="transfer_of_care" label="Transfer of care narrative" autofilled={af('transfer_of_care')}>
          <textarea className="textarea" value={pcr.transfer_of_care || ''} onChange={e => update('transfer_of_care', e.target.value)} />
        </Field>
      </Section>

      {/* ---- Crew Notes ---- */}
      <Section title="Crew Notes">
        <Field id="crew_notes" label="Crew notes (free text)">
          <textarea className="textarea" value={pcr.crew_notes || ''} onChange={e => update('crew_notes', e.target.value)} />
        </Field>
      </Section>

      {/* ---- Signatures ---- */}
      <Section title="Signatures">
        <div id="patient_signature" className="flex items-center gap-3 py-2">
          <input id="patient_signature_done" type="checkbox" className="w-5 h-5"
                 checked={pcr.patient_signature_done} onChange={e => update('patient_signature_done', e.target.checked)} />
          <label htmlFor="patient_signature_done" className="text-sm">Patient signature on file (DEMO placeholder)</label>
        </div>
        <div id="crew_signature" className="flex items-center gap-3 py-2">
          <input id="crew_signature_done" type="checkbox" className="w-5 h-5"
                 checked={pcr.crew_signature_done} onChange={e => update('crew_signature_done', e.target.checked)} />
          <label htmlFor="crew_signature_done" className="text-sm">Crew signature on file (DEMO placeholder)</label>
        </div>
      </Section>

      {/* ---- Generated Narrative ---- */}
      <Section title="Generated Narrative">
        <textarea className="textarea !min-h-32" value={pcr.generated_narrative || ''}
                  onChange={e => update('generated_narrative', e.target.value)}
                  placeholder="Tap Generate Narrative to create a medical-legal paragraph from form data." />
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button type="button" onClick={generateNarrative} disabled={busy} className="btn btn-secondary">Generate Narrative</button>
          <button type="button" onClick={copyNarrative} className="btn btn-ghost">Copy Narrative</button>
        </div>
      </Section>

      {/* ---- Bottom actions: 4 buttons in 2x2 sticky bar ---- */}
      <div className="sticky-actions">
        <button type="button" onClick={recheckMissing} className="btn btn-secondary">Check Missing Info</button>
        <button type="button" onClick={generateNarrative} disabled={busy} className="btn btn-secondary">Generate Narrative</button>
        <button type="button" onClick={exportPdf} className="btn btn-secondary">Export PDF</button>
        <button type="button" onClick={() => save(true)} disabled={busy} className="btn btn-primary">{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </div>
  );
}
