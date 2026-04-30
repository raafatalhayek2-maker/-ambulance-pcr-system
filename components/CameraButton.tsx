'use client';
import { useRef, useState } from 'react';
import { pushToast } from './Toast';

interface Props {
  pcrId: string;
  /** Called with extracted JSON from the OCR pipeline */
  onExtracted: (data: Record<string, any>) => void;
  disabled?: boolean;
}

export default function CameraButton({ pcrId, onExtracted, disabled }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string>('');

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function retake() {
    setPreview(null); setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function confirmUpload() {
    if (!file) return;
    setBusy(true);
    setStage('Uploading photo…');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('pcr_id', pcrId);
      setStage('Reading document…');
      const res = await fetch('/api/ocr', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'OCR failed');
      onExtracted(data.extracted || {});
      pushToast('Document scanned. Fields auto-filled.', 'ok');
      retake();
    } catch (e: any) {
      pushToast(e?.message || 'OCR failed', 'err');
    } finally {
      setBusy(false); setStage('');
    }
  }

  return (
    <div className="space-y-2">
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
             onChange={pickFile} className="hidden" />
      {!preview && (
        <button type="button" disabled={disabled || busy}
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-primary w-full !min-h-14 text-base">
          📷 Scan Document
        </button>
      )}

      {preview && !busy && (
        <div className="card space-y-2">
          <img src={preview} alt="Captured" className="rounded-xl w-full max-h-72 object-contain bg-slate-100" />
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={retake} className="btn btn-secondary">Retake</button>
            <button type="button" onClick={confirmUpload} className="btn btn-success">Use this photo</button>
          </div>
        </div>
      )}

      {busy && (
        <div className="card flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
          <div className="text-sm text-slate-700">{stage || 'Processing…'}</div>
        </div>
      )}
    </div>
  );
}
