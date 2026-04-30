import { Pcr } from './types';

/** A single missing-info finding shown as a yellow chip in the UI. */
export interface MissingFinding {
  field: string;       // form field id to scroll to
  label: string;       // human-readable warning
  critical: boolean;   // critical fields gate "Pending Review" -> "Missing Info"
}

export function checkMissing(p: Partial<Pcr>): MissingFinding[] {
  const out: MissingFinding[] = [];

  if (!p.pickup_time)         out.push({ field: 'pickup_time',         label: 'Missing pickup time',         critical: true });
  if (!p.dropoff_time)        out.push({ field: 'dropoff_time',        label: 'Missing dropoff time',        critical: true });
  if (p.mileage == null || isNaN(Number(p.mileage)) || Number(p.mileage) <= 0)
                              out.push({ field: 'mileage',             label: 'Missing mileage',             critical: true });
  if (!p.patient_signature_done) out.push({ field: 'patient_signature', label: 'Missing patient signature', critical: true });
  if (!p.crew_signature_done)    out.push({ field: 'crew_signature',    label: 'Missing crew signature',    critical: true });

  // Vitals counted missing only if blank or the explicit "not provided" sentinel.
  if (!p.vitals || /vitals not provided/i.test(p.vitals))
                              out.push({ field: 'vitals',              label: 'Missing vitals',              critical: false });

  if (!p.destination_address) out.push({ field: 'destination_address', label: 'Missing destination address', critical: true });
  if (!p.reason_for_transport)out.push({ field: 'reason_for_transport',label: 'Missing reason for transport',critical: true });
  if (!p.transfer_of_care || /transfer of care not documented/i.test(p.transfer_of_care))
                              out.push({ field: 'transfer_of_care',    label: 'Missing transfer of care',    critical: false });

  return out;
}

/** Status the PCR should be in given its missing findings. Falls back to 'Draft' for empty PCRs. */
export function deriveStatus(p: Partial<Pcr>, currentStatus?: string): 'Draft'|'Missing Info'|'Pending Review' {
  // Reviewer-set "Completed" / "Ready for Billing" should not be auto-overwritten.
  if (currentStatus === 'Completed' || currentStatus === 'Ready for Billing') {
    return currentStatus as any;
  }
  const findings = checkMissing(p);
  const hasCritical = findings.some(f => f.critical);

  // Brand-new empty form ⇒ Draft
  const hasAny = !!(p.patient_name || p.pickup_facility || p.destination_facility || p.reason_for_transport);
  if (!hasAny && hasCritical) return 'Draft';

  return hasCritical ? 'Missing Info' : 'Pending Review';
}
