'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Pcr } from '@/lib/types';
import { getSession } from '@/lib/session';
import { pushToast } from '@/components/Toast';

function Row({ k, v }: { k: string; v: any }) {
  return (
    <tr className="border-b border-slate-100 last:border-b-0">
      <th className="text-left text-xs font-semibold text-slate-500 py-2 pr-3 align-top w-1/3">{k}</th>
      <td className="text-sm text-slate-900 py-2 align-top whitespace-pre-wrap">{v == null || v === '' ? '—' : String(v)}</td>
    </tr>
  );
}

export default function SupervisorDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [pcr, setPcr] = useState<Pcr | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/pcr/${id}`).then(r => r.json()).then(d => d?.pcr && setPcr(d.pcr));
  }, [id]);

  async function markReviewed() {
    if (!pcr) return;
    const u = getSession();
    setBusy(true);
    try {
      const res = await fetch(`/api/pcr/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewer_id: u?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed');
      setPcr(data.pcr);
      pushToast('Marked as Completed.', 'ok');
    } catch (e: any) {
      pushToast(e?.message || 'Failed', 'err');
    } finally { setBusy(false); }
  }

  if (!pcr) return <div className="text-center text-slate-500 py-12">Loading PCR…</div>;

  return (
    <div className="pb-20">
      <button onClick={() => router.back()} className="text-sm text-brand-500 mb-2">← Back</button>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">PCR · {pcr.id.slice(0,8)}</div>
          <div className="text-xl font-bold text-slate-900">{pcr.trip_type || 'Trip'}</div>
        </div>
        <span className={"chip " + (
          pcr.status === 'Completed' || pcr.status === 'Ready for Billing' ? 'chip-success' :
          pcr.status === 'Missing Info' ? 'chip-warn' :
          pcr.status === 'Pending Review' ? 'chip-info' : 'chip-muted'
        )}>{pcr.status}</span>
      </div>

      <div className="card mb-3">
        <div className="text-xs font-semibold uppercase text-slate-500 mb-2">Patient</div>
        <table className="w-full">
          <tbody>
            <Row k="Patient name" v={pcr.patient_name} />
            <Row k="DOB" v={pcr.dob} />
            <Row k="Age" v={pcr.age} />
            <Row k="MRN" v={pcr.mrn} />
            <Row k="Insurance" v={pcr.insurance} />
          </tbody>
        </table>
      </div>

      <div className="card mb-3">
        <div className="text-xs font-semibold uppercase text-slate-500 mb-2">Pickup &amp; Destination</div>
        <table className="w-full">
          <tbody>
            <Row k="Pickup facility" v={pcr.pickup_facility} />
            <Row k="Pickup address" v={pcr.pickup_address} />
            <Row k="Pickup time" v={pcr.pickup_time} />
            <Row k="Destination facility" v={pcr.destination_facility} />
            <Row k="Destination address" v={pcr.destination_address} />
            <Row k="Dropoff time" v={pcr.dropoff_time} />
          </tbody>
        </table>
      </div>

      <div className="card mb-3">
        <div className="text-xs font-semibold uppercase text-slate-500 mb-2">Trip</div>
        <table className="w-full">
          <tbody>
            <Row k="Mileage" v={pcr.mileage} />
            <Row k="Reason for transport" v={pcr.reason_for_transport} />
            <Row k="Diagnosis" v={pcr.diagnosis} />
          </tbody>
        </table>
      </div>

      <div className="card mb-3">
        <div className="text-xs font-semibold uppercase text-slate-500 mb-2">Clinical narrative</div>
        <table className="w-full">
          <tbody>
            <Row k="Patient condition" v={pcr.patient_condition} />
            <Row k="Chief complaint" v={pcr.chief_complaint} />
            <Row k="Assessment" v={pcr.assessment} />
            <Row k="Mental status" v={pcr.mental_status} />
            <Row k="Mobility status" v={pcr.mobility_status} />
            <Row k="Vitals" v={pcr.vitals} />
            <Row k="Interventions" v={pcr.interventions} />
            <Row k="Transfer of care" v={pcr.transfer_of_care} />
            <Row k="Generated narrative" v={pcr.generated_narrative} />
            <Row k="Crew notes" v={pcr.crew_notes} />
          </tbody>
        </table>
      </div>

      <div className="card mb-3">
        <div className="text-xs font-semibold uppercase text-slate-500 mb-2">Signatures</div>
        <table className="w-full">
          <tbody>
            <Row k="Patient signature" v={pcr.patient_signature_done ? '✓ on file (DEMO)' : 'missing'} />
            <Row k="Crew signature"   v={pcr.crew_signature_done ? '✓ on file (DEMO)' : 'missing'} />
            <Row k="Reviewed at"      v={pcr.reviewed_at} />
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <a href={`/api/pcr/${pcr.id}/pdf`} target="_blank" className="btn btn-secondary">Export PDF</a>
        <button disabled={busy || pcr.status === 'Completed' || pcr.status === 'Ready for Billing'}
                onClick={markReviewed} className="btn btn-success">
          {pcr.status === 'Completed' ? 'Already reviewed' : (busy ? 'Marking…' : 'Mark as Reviewed')}
        </button>
      </div>
    </div>
  );
}
