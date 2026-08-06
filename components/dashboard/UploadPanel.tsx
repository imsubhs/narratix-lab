'use client';

import { useRef, useState } from 'react';

interface UploadPanelProps {
  file: File | null;
  loading: boolean;
  error: string | null;
  onFileChange: (file: File | null) => void;
  onAnalyze: () => void;
}

export default function UploadPanel({
  file,
  loading,
  error,
  onFileChange,
  onAnalyze,
}: UploadPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleSelect = (selected: File | null) => {
    onFileChange(selected);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const dropped = event.dataTransfer.files?.[0] ?? null;
    handleSelect(dropped);
  };

  return (
    <section className="rounded-xl3 border border-nl-border bg-nl-panel p-7 shadow-nl-card">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`rounded-xl2 border-2 border-dashed px-8 py-12 text-center transition-all ${
          dragActive
            ? 'border-purple-300 bg-purple-500/10'
            : file
              ? 'border-emerald-400/50 bg-emerald-500/10'
              : 'border-purple-500/40 bg-purple-500/5'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(event) => handleSelect(event.target.files?.[0] ?? null)}
          disabled={loading}
        />

        {!file ? (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] border border-purple-500/30 bg-purple-500/15 text-2xl text-purple-300">
              ⬆
            </div>
            <p className="mb-1 text-base font-bold text-white">
              Drop your video here or click to upload
            </p>
            <p className="text-sm text-white/45">
              MP4, MOV, AVI, WebM · Up to 500MB
            </p>
            <p className="mt-2 text-xs text-white/30">
              Supports TikTok, Reels, YouTube Shorts, LinkedIn
            </p>
          </>
        ) : (
          <>
            <div className="mb-3 text-4xl">🎬</div>
            <p className="text-base font-bold text-emerald-400">{file.name}</p>
            <p className="text-sm text-white/45">
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </p>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onFileChange(null);
              }}
              className="mt-4 rounded-full border border-red-400/35 bg-red-500/10 px-4 py-1.5 text-xs font-semibold text-red-300"
            >
              Remove
            </button>
          </>
        )}
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onAnalyze}
          disabled={loading || !file}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-nl-primary to-nl-primaryDark px-8 py-3 text-sm font-bold text-white shadow-nl-glow transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        >
          {loading ? 'Analyzing...' : 'Run AI Analysis →'}
        </button>
      </div>
    </section>
  );
}
