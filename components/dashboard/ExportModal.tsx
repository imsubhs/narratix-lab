'use client';

/**
 * Stage 8B — Professional Export Modal.
 *
 * Replaces the old export dropdown. Presents every supported format with its
 * description, recommended use, and an estimated file size, and downloads via
 * the single ExportService. This component contains NO report rendering logic —
 * it only calls the service.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  exportReport,
  estimateFileSize,
  getSupportedFormats,
  type ExportContext,
  type ExportFormatId,
} from '@/lib/export';
import type { AnalysisResult } from '@/lib/ai-engine-client';

interface Props {
  open: boolean;
  onClose: () => void;
  results: AnalysisResult;
  context: ExportContext;
}

const FORMAT_ICON_COLOR: Record<ExportFormatId, string> = {
  pdf: '#ef4444',
  docx: '#3b82f6',
  md: '#10b981',
  html: '#f59e0b',
  txt: '#94a3b8',
  rtf: '#a855f7',
};

export default function ExportModal({ open, onClose, results, context }: Props) {
  const formats = useMemo(() => getSupportedFormats(), []);
  const sizes = useMemo(
    () => (open ? estimateFileSize(results, context) : ({} as Record<ExportFormatId, string>)),
    [open, results, context]
  );
  const [busy, setBusy] = useState<ExportFormatId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isDemo = Boolean((results as any)?.demo) ||
    (results as any)?.meta?.generation_source === 'demo' ||
    (results as any)?.meta?.generationSource === 'demo';

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleDownload = async (id: ExportFormatId) => {
    setError(null);
    setBusy(id);
    try {
      await exportReport(id, results, context);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Export report"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: '20px',
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '640px', maxHeight: '88vh', overflowY: 'auto',
          background: 'var(--card-bg)', border: '1px solid var(--card-border)',
          borderRadius: '16px', boxShadow: 'var(--shadow-md)', padding: '24px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Export Report
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              Choose a professional format to download your analysis.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: '22px', lineHeight: 1, padding: '4px',
            }}
          >
            ×
          </button>
        </div>

        {isDemo && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px',
            padding: '8px 12px', borderRadius: '8px',
            background: 'rgba(213,33,34,0.08)', border: '1px solid rgba(213,33,34,0.24)',
          }}>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#f87171', letterSpacing: '0.4px' }}>
              Demonstration Mode
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Exports include a transparency notice.
            </span>
          </div>
        )}

        {error && (
          <div style={{ marginTop: '12px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: '13px' }}>
            {error}
          </div>
        )}

        {/* Format list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '18px' }}>
          {formats.map((f) => (
            <div
              key={f.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 16px', borderRadius: '12px',
                background: 'var(--accent-light)', border: '1px solid var(--card-border)',
              }}
            >
              <div style={{
                flexShrink: 0, width: '40px', height: '40px', borderRadius: '9px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--card-bg)', border: '1px solid var(--card-border)',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={FORMAT_ICON_COLOR[f.id]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{f.label}</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>.{f.extension}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>· ~{sizes[f.id] ?? '—'}</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '3px 0 0' }}>{f.description}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  <strong style={{ color: 'var(--text-secondary)' }}>Best for:</strong> {f.recommendedUse}
                </p>
              </div>

              <button
                onClick={() => handleDownload(f.id)}
                disabled={busy !== null}
                className="btn bp"
                style={{
                  flexShrink: 0, fontSize: '13px', fontWeight: 700, padding: '9px 16px',
                  borderRadius: '9px', cursor: busy !== null ? 'wait' : 'pointer',
                  opacity: busy !== null && busy !== f.id ? 0.5 : 1,
                }}
              >
                {busy === f.id ? 'Preparing…' : 'Download'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
