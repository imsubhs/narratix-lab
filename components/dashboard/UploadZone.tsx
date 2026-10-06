'use client';

import { useState, useRef, useCallback } from 'react';

interface Props {
  file: File | null;
  onFileSelected: (file: File) => void;
  onRemove: () => void;
  disabled?: boolean;
}

const MAX_SIZE_MB = 50;
const VALID_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska'];
const VALID_EXTS = ['.mp4', '.mov', '.avi', '.webm', '.mkv'];

export default function UploadZone({ file, onFileSelected, onRemove, disabled }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [internalError, setInternalError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = useCallback((f: File) => {
    setInternalError('');
    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    if (!VALID_TYPES.includes(f.type) && !VALID_EXTS.includes(ext)) {
      setInternalError('Invalid file type. Supported: MP4, MOV, AVI, WebM, MKV.');
      return false;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setInternalError(`File too large (${(f.size / 1024 / 1024).toFixed(1)}MB). Max: ${MAX_SIZE_MB}MB.`);
      return false;
    }
    return true;
  }, []);

  const handleFile = useCallback((f: File) => {
    if (validate(f)) {
      onFileSelected(f);
    }
  }, [validate, onFileSelected]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleRemove = () => {
    setInternalError('');
    if (inputRef.current) inputRef.current.value = '';
    onRemove();
  };

  return (
    <div style={{ marginBottom: '24px' }}>
      {/* Drop zone */}
      <div
        className={`upload-zone ${dragOver ? 'drag' : ''} ${file ? 'has-file' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && !file && inputRef.current?.click()}
        style={{
          cursor: disabled ? 'not-allowed' : file ? 'default' : 'pointer',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <input
          ref={inputRef}
          id="video-upload-input"
          aria-label="Upload video file"
          type="file"
          accept="video/mp4,video/quicktime,video/x-msvideo,video/webm,.mp4,.mov,.avi,.webm,.mkv"
          onChange={handleChange}
          style={{ display: 'none' }}
          disabled={disabled}
        />

        {file ? (
          /* File preview */
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: 'rgba(52,211,153,.12)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '20px', flexShrink: 0,
              }}>
                🎬
              </div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
                  {file.name}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
            </div>
            {!disabled && (
              <button
                onClick={(e) => { e.stopPropagation(); handleRemove(); }}
                className="btn bg-btn sm"
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#f87171',
                  border: '1px solid rgba(239,68,68,.25)',
                }}
              >
                Remove
              </button>
            )}
          </div>
        ) : (
          /* Empty state */
          <>
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              background: 'rgba(124,58,237,.12)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 16px', fontSize: '24px',
            }}>
              📁
            </div>
            <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Drop your video here
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              or click to browse · MP4, MOV, AVI, WebM · Max {MAX_SIZE_MB}MB · Under 60s
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' as const }}>
              {['Instagram', 'TikTok', 'YouTube', 'LinkedIn'].map((p) => (
                <span key={p} style={{
                  padding: '4px 12px', borderRadius: '100px', fontSize: '11px', fontWeight: 600,
                  background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)',
                  color: 'rgba(255,255,255,.4)',
                }}>
                  {p}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Internal validation error */}
      {internalError && (
        <div style={{
          marginTop: '10px', padding: '10px 14px', borderRadius: '10px',
          background: 'rgba(239,68,68,.07)', border: '1px solid rgba(239,68,68,.2)',
          fontSize: '13px', color: '#fca5a5',
        }}>
          {internalError}
        </div>
      )}
    </div>
  );
}
