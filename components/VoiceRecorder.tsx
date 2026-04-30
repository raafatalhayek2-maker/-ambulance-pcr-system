'use client';
import { useEffect, useRef, useState } from 'react';
import { pushToast } from './Toast';

interface Props {
  pcrId: string;
  onExtracted: (data: Record<string, any>) => void;
  disabled?: boolean;
}

export default function VoiceRecorder({ pcrId, onExtracted, disabled }: Props) {
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const tickRef = useRef<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');

  useEffect(() => () => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (mediaRef.current && mediaRef.current.state === 'recording') mediaRef.current.stop();
  }, []);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
                 : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        await upload(blob, mr.mimeType?.includes('mp4') ? 'm4a' : 'webm');
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      setElapsed(0);
      tickRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } catch (e: any) {
      pushToast(e?.message || 'Microphone access denied', 'err');
    }
  }

  function stop() {
    if (mediaRef.current && mediaRef.current.state === 'recording') mediaRef.current.stop();
    setRecording(false);
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  }

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = (f.name.split('.').pop() || 'mp3').toLowerCase();
    await upload(f, ext);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function upload(blob: Blob, ext: string) {
    setBusy(true); setStage('Uploading audio…');
    try {
      const fd = new FormData();
      fd.append('file', blob, `voice-${Date.now()}.${ext}`);
      fd.append('pcr_id', pcrId);
      setStage('Transcribing…');
      const res = await fetch('/api/transcribe', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Transcription failed');
      onExtracted(data.extracted || {});
      pushToast('Voice note processed. Clinical fields auto-filled.', 'ok');
    } catch (e: any) {
      pushToast(e?.message || 'Voice note failed', 'err');
    } finally {
      setBusy(false); setStage('');
    }
  }

  function fmt(sec: number) {
    const m = Math.floor(sec / 60).toString().padStart(2,'0');
    const s = (sec % 60).toString().padStart(2,'0');
    return `${m}:${s}`;
  }

  return (
    <div className="space-y-2">
      <input ref={fileRef} type="file" accept="audio/*" onChange={pickFile} className="hidden" />
      {!recording && !busy && (
        <div className="grid grid-cols-1 gap-2">
          <button type="button" disabled={disabled} onClick={start}
                  className="btn btn-primary w-full !min-h-14 text-base">
            🎙️ Record Voice Note
          </button>
          <button type="button" disabled={disabled} onClick={() => fileRef.current?.click()}
                  className="btn btn-secondary w-full text-sm">Upload audio file instead</button>
        </div>
      )}

      {recording && (
        <div className="card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rec-dot" />
            <div className="font-mono text-lg">{fmt(elapsed)}</div>
            <div className="text-sm text-slate-500">Recording…</div>
          </div>
          <button type="button" onClick={stop} className="btn btn-danger">Stop</button>
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
