"use client";
import { useRef, useState } from "react";
interface CameraButtonProps {
  onCapture: (file: File) => void;
  loading?: boolean;
}
export default function CameraButton({ onCapture, loading }: CameraButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const handleClick = () => {
    inputRef.current?.click();
  };
  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    try {
      await onCapture(file);
    } finally {
      setIsProcessing(false);
      // Reset input so same file can be re-selected
      if (inputRef.current) inputRef.current.value = "";
    }
  };
  const busy = loading || isProcessing;
  return (
    <>
      {/* Hidden file input - NO capture attribute so user can choose camera OR library */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleChange}
        aria-hidden="true"
      />
      <button
        onClick={handleClick}
        disabled={busy}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
      >
        {busy ? (
          <>
            <span className="animate-spin text-lg">⏳</span>
            Reading document...
          </>
        ) : (
          <>
            📷 Scan Document
          </>
        )}
      </button>
    </>
  );
}
