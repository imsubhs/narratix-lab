'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import type { AnalysisResult } from '@/lib/ai-engine-client';
import { BETA_BADGE } from '@/lib/features';
import AnalysisProgress from '@/components/dashboard/AnalysisProgress';
import AnalysisResults from '@/components/dashboard/AnalysisResults';

interface StageInfo {
  stage: string;
  status: 'running' | 'done' | 'skipped' | 'error';
  message: string;
}

type ViewState = 'form' | 'analyzing' | 'results' | 'error';

const NICHES = ['Fitness & Health', 'Tech & Gadgets', 'Cooking & Food', 'Fashion & Beauty', 'Travel', 'Finance & Investing', 'Education', 'Entertainment', 'Gaming', 'Real Estate', 'Personal Development', 'Comedy', 'Music', 'Sports', 'Other'];
const PLATFORMS = ['Instagram Reels', 'TikTok', 'YouTube Shorts', 'LinkedIn', 'Snapchat', 'Facebook Reels', 'Pinterest'];
const GOALS = ['Grow my audience', 'More views', 'Higher retention', 'More followers', 'More engagement', 'Better hook', 'Go viral', 'Drive traffic to website', 'Sell products/services'];

export default function AnalyzerClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, refreshAccount, profile } = useAuth();

  const [view, setView] = useState<ViewState>('form');
  const [script, setScript] = useState(searchParams.get('script') || searchParams.get('url') || '');
  const [niche, setNiche] = useState('');
  const [platform, setPlatform] = useState('');
  const [videoLength, setVideoLength] = useState('');
  const [goal, setGoal] = useState('Grow my audience');
  const [concern, setConcern] = useState('');
  const [stages, setStages] = useState<StageInfo[]>([]);
  const [currentStage, setCurrentStage] = useState('');
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [shouldAutoRun, setShouldAutoRun] = useState(false);

  // Phase 10 States
  const [activeTab, setActiveTab] = useState<'text' | 'file'>('text');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [autoDetect, setAutoDetect] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const PENDING_KEY = 'narratix_pending';

  useEffect(() => {
    const pending = localStorage.getItem(PENDING_KEY);
    if (pending) {
      try {
        const p = JSON.parse(pending);
        if (p.script) setScript(p.script);
        if (p.niche) {
          if (p.niche === 'Auto-Detect') {
            setAutoDetect(true);
          } else {
            setNiche(p.niche);
          }
        }
        if (p.platform) {
          if (p.platform === 'Auto-Detect') {
            setAutoDetect(true);
          } else {
            setPlatform(p.platform);
          }
        }
        if (p.videoLength) setVideoLength(p.videoLength);
        if (p.goal) setGoal(p.goal);
        if (p.concern) setConcern(p.concern);
        if (p.activeTab) setActiveTab(p.activeTab);
        if (p.shouldAutoRun) setShouldAutoRun(true);
        console.log('[analyze] restored pending form state');
      } catch {
        // Ignore malformed pending beta form state.
      }
    }
  }, [PENDING_KEY]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'file') {
      setActiveTab('file');
    } else if (tabParam === 'text') {
      setActiveTab('text');
    }
  }, [searchParams]);

  const handleFileSelect = (file: File) => {
    setError('');
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const allowed = ['.pdf', '.docx', '.txt', '.md'];
    if (!allowed.includes(ext)) {
      setError('Invalid file extension. Only PDF, DOCX, TXT, and MD files are supported.');
      return;
    }

    const limit = 10 * 1024 * 1024;
    if (file.size > limit) {
      setError('File is too large. Maximum allowed size is 10MB.');
      return;
    }
    setUploadedFile(file);
  };

  const handleAnalyze = useCallback(async (skipAuthGate = false) => {
    setError('');

    const hasInput = activeTab === 'text' ? script.trim() : uploadedFile;
    if (!hasInput) {
      setError(activeTab === 'text' ? 'Please paste your script or describe the content.' : 'Please upload a supported document (PDF, DOCX, TXT, MD).');
      return;
    }

    const activeNiche = autoDetect ? 'Auto-Detect' : niche;
    const activePlatform = autoDetect ? 'Auto-Detect' : platform;

    if (!autoDetect) {
      if (!niche) {
        setError('Please select your content niche or enable Auto-Detect.');
        return;
      }
      if (!platform) {
        setError('Please select a platform or enable Auto-Detect.');
        return;
      }
    }

    if (!isAuthenticated && !skipAuthGate) {
      if (activeTab === 'file') {
        setError('Please sign in first to analyze your uploaded document.');
        router.push(`/login?redirect=${encodeURIComponent('/analyze')}`);
        return;
      }
      localStorage.setItem(PENDING_KEY, JSON.stringify({
        script,
        niche: activeNiche,
        platform: activePlatform,
        videoLength,
        goal,
        concern,
        activeTab,
        shouldAutoRun: true,
      }));
      console.log('[analyze] auth required, saved pending draft and redirecting to login');
      router.push(`/login?redirect=${encodeURIComponent('/analyze')}`);
      return;
    }

    setView('analyzing');
    setStages([{ stage: 'checking_usage', status: 'running', message: 'Checking monthly beta usage...' }]);
    setCurrentStage('checking_usage');

    try {
      console.log('[analyze] starting analysis request', { niche: activeNiche, platform: activePlatform, inputType: activeTab });
      const formData = new FormData();
      formData.append('niche', activeNiche);
      formData.append('platform', activePlatform);
      formData.append('videoLength', videoLength);
      formData.append('goal', goal);
      formData.append('concern', concern);

      if (activeTab === 'text') {
        formData.append('script', script);
      } else if (activeTab === 'file' && uploadedFile) {
        formData.append('document', uploadedFile);
      }

      const response = await fetch('/api/analyze', { method: 'POST', body: formData });

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const errData = await response.json();
          throw new Error(errData.error || `Server error ${response.status}`);
        } else {
          const text = await response.text();
          console.error('[analyze] Server non-JSON response:', text);
          throw new Error(`Server returned HTML/non-JSON response (status ${response.status}). Preview: ${text.substring(0, 200)}...`);
        }
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream.');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const match = line.match(/^data: (.+)$/);
          if (!match) continue;
          try {
            const event = JSON.parse(match[1]);
            if (event.stage === 'error') {
              console.log('[analyze] stream error event', event.message);
              setError(event.message);
              setView('error');
              return;
            }
            if (event.stage === 'complete') {
              console.log('[analyze] analysis complete');
              setResults(event.results);
              setTranscript(event.transcript);
              await refreshAccount();
              setView('results');
              localStorage.removeItem(PENDING_KEY);
              return;
            }
            setCurrentStage(event.stage);
            setStages(prev => {
              const idx = prev.findIndex(s => s.stage === event.stage);
              const updated = { stage: event.stage, status: event.status, message: event.message };
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = updated;
                return next;
              }
              return [...prev, updated];
            });
          } catch {
            // Ignore incomplete SSE chunks.
          }
        }
      }
    } catch (err) {
      console.error('[analyze] analysis failed', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setView('error');
    }
  }, [
    activeTab,
    uploadedFile,
    script,
    autoDetect,
    niche,
    platform,
    videoLength,
    goal,
    concern,
    isAuthenticated,
    router,
    refreshAccount
  ]);

  useEffect(() => {
    if (!isAuthenticated || !shouldAutoRun) return;
    const hasInput = activeTab === 'text' ? script.trim() : uploadedFile;
    if (!hasInput) return;
    if (!autoDetect && (!niche || !platform)) return;

    console.log('[analyze] auto-running restored draft after auth');
    setShouldAutoRun(false);
    localStorage.removeItem(PENDING_KEY);
    void handleAnalyze(true);
  }, [handleAnalyze, isAuthenticated, shouldAutoRun, script, uploadedFile, activeTab, autoDetect, niche, platform, PENDING_KEY]);

  const handleReset = () => {
    setView('form');
    setScript('');
    setUploadedFile(null);
    setResults(null);
    setTranscript(null);
    setStages([]);
    setCurrentStage('');
    setError('');
  };

  if (view === 'analyzing') {
    return (
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 24px' }}>
        <AnalysisProgress stages={stages} currentStage={currentStage} />
      </div>
    );
  }

  if (view === 'results' && results) {
    return (
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 24px' }}>
        <AnalysisResults results={results} transcript={transcript} onReset={handleReset} />
      </div>
    );
  }

  if (view === 'error') {
    return (
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239,68,68,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>Analysis Failed</h2>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,.5)', marginBottom: '28px' }}>{error}</p>
        <button className="btn bp md-btn" onClick={() => setView('form')}>Try Again</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'linear-gradient(135deg,#7c3aed,#4338ca)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </div>
        <div>
          <div className="bdg bdg-p" style={{ display: 'inline-flex', marginBottom: '8px' }}>{BETA_BADGE}</div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#fff', letterSpacing: '-.03em' }}>Creator Intelligence</h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,.4)', marginTop: '2px', lineHeight: '1.6' }}>Paste your script or upload documents. Narratix Lab evaluates hooks, retention potential, script architecture, emotional resonance, growth fit, and creator recommendations.</p>
        </div>
      </div>

      <div style={{ marginTop: '32px' }}>
        {/* Premium Content Input Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '18px',
          padding: '24px',
          marginBottom: '20px'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📄</span> Content Input
            </h3>
            <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ color: 'var(--success-color)' }}>✓</span> Paste Script</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ color: 'var(--success-color)' }}>✓</span> Upload PDF</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ color: 'var(--success-color)' }}>✓</span> Upload DOCX</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ color: 'var(--success-color)' }}>✓</span> Upload TXT</span>
            </div>
          </div>

          <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.4)', marginBottom: '16px', marginTop: '-6px', lineHeight: '1.5' }}>
            Select your preferred input method. Accepted formats: <strong>PDF, DOCX, TXT, MD</strong> (max 10MB).
          </p>

          {/* Switcher Tabs */}
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '4px',
            marginBottom: '20px'
          }}>
            <button
              type="button"
              onClick={() => setActiveTab('text')}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'text' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                color: activeTab === 'text' ? '#fff' : 'rgba(255, 255, 255, 0.5)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              ✍️ Paste Script
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('file')}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'file' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                color: activeTab === 'file' ? '#fff' : 'rgba(255, 255, 255, 0.5)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              📁 Upload Document
            </button>
          </div>

          {/* Switcher Content */}
          {activeTab === 'text' ? (
            <div style={{ marginBottom: '8px' }}>
              <label className="flbl" style={{ marginBottom: '8px', display: 'block' }}>SCRIPT OR CONTENT DESCRIPTION *</label>
              <textarea
                className="finput"
                placeholder="Paste your script, outline, voiceover, or describe the planned content scene-by-scene..."
                value={script}
                onChange={(e) => setScript(e.target.value)}
                rows={8}
                style={{ resize: 'vertical', minHeight: '180px' }}
              />
            </div>
          ) : (
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileSelect(file);
              }}
              style={{
                background: dragActive
                  ? 'rgba(124, 58, 237, 0.08)'
                  : uploadedFile
                    ? 'rgba(16, 185, 129, 0.04)'
                    : 'rgba(255, 255, 255, 0.02)',
                border: dragActive
                  ? '2px dashed rgba(167, 139, 250, 0.6)'
                  : uploadedFile
                    ? '2px dashed rgba(16, 185, 129, 0.4)'
                    : '2px dashed rgba(255, 255, 255, 0.15)',
                borderRadius: '14px',
                padding: '36px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
              {!uploadedFile ? (
                <>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '12px',
                    fontSize: '18px',
                    color: 'rgba(255, 255, 255, 0.7)'
                  }}>
                    ⬆
                  </div>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                    Drag & drop your document here or click to browse
                  </p>
                  <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)', lineHeight: 1.5 }}>
                    Supports PDF, DOCX, TXT, and MD files up to 10MB
                  </p>
                </>
              ) : (
                <>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '12px',
                    fontSize: '20px'
                  }}>
                    📄
                  </div>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#34d399', marginBottom: '2px', wordBreak: 'break-all', padding: '0 12px' }}>
                    {uploadedFile.name}
                  </p>
                  <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '12px' }}>
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadedFile(null);
                    }}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '100px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      color: '#f87171',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                  >
                    Remove File
                  </button>
                </>
              )}
            </div>
          )}

          {/* Document Analysis Info Block */}
          <div style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            paddingTop: '16px',
            marginTop: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>🎬 Video Analysis</span>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '100px',
                background: 'rgba(124, 58, 237, 0.1)',
                border: '1px solid rgba(124, 58, 237, 0.2)',
                color: 'var(--accent)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>Coming Soon</span>
            </div>
            <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)', lineHeight: 1.5, margin: 0 }}>
              Upload video files directly for frame-level diagnostics, retention mapping, pacing analysis, and visual storytelling insights when Video Intelligence launches in V2.
              <br />
              Video Intelligence capabilities will launch in a future update.
            </p>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,.034)', border: '1px solid rgba(255,255,255,.07)', borderRadius: '18px', padding: '24px', marginBottom: '20px' }}>
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Tell us about the content</p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.38)', marginBottom: '20px' }}>Context helps Narratix Lab give more precise, targeted feedback.</p>

          {/* Auto-detect toggle switch */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '12px',
            padding: '12px 14px',
            marginBottom: '20px'
          }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>🤖 Auto-Detect Niche & Platform</p>
              <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.38)', marginTop: '2px' }}>Let Narratix Lab automatically infer the target platform and niche from your content</p>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoDetect}
                onChange={(e) => setAutoDetect(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: autoDetect ? '#7c3aed' : 'rgba(255, 255, 255, 0.1)',
                transition: '0.3s',
                borderRadius: '24px'
              }}>
                <span style={{
                  position: 'absolute',
                  height: '18px', width: '18px',
                  left: autoDetect ? '22px' : '3px',
                  bottom: '3px',
                  backgroundColor: 'white',
                  transition: '0.3s',
                  borderRadius: '50%'
                }} />
              </span>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', opacity: autoDetect ? 0.6 : 1, transition: 'opacity 0.2s ease' }}>
            <div>
              <label className="flbl">YOUR NICHE {!autoDetect && '*'}</label>
              <select
                className="finput"
                value={autoDetect ? 'Auto-Detect' : niche}
                onChange={(e) => setNiche(e.target.value)}
                disabled={autoDetect}
                style={{ cursor: autoDetect ? 'not-allowed' : 'default' }}
              >
                {autoDetect ? (
                  <option value="Auto-Detect">✨ Inferred by Narratix Lab</option>
                ) : (
                  <>
                    <option value="">Select your niche...</option>
                    {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="flbl">PLATFORM {!autoDetect && '*'}</label>
              <select
                className="finput"
                value={autoDetect ? 'Auto-Detect' : platform}
                onChange={(e) => setPlatform(e.target.value)}
                disabled={autoDetect}
                style={{ cursor: autoDetect ? 'not-allowed' : 'default' }}
              >
                {autoDetect ? (
                  <option value="Auto-Detect">✨ Inferred by Narratix Lab</option>
                ) : (
                  <>
                    <option value="">Select platform...</option>
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="flbl">ESTIMATED LENGTH</label>
              <input
                className="finput"
                type="text"
                placeholder="e.g. 45 seconds"
                value={videoLength}
                onChange={(e) => setVideoLength(e.target.value)}
              />
            </div>

            <div>
              <label className="flbl">YOUR GOAL</label>
              <select className="finput" value={goal} onChange={(e) => setGoal(e.target.value)}>
                {GOALS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>


          <div style={{ marginTop: '14px' }}>
            <label className="flbl">BIGGEST CONCERN <span style={{ color: 'rgba(255,255,255,.2)', fontWeight: 400 }}>(optional)</span></label>
            <textarea
              className="finput"
              placeholder="e.g. Low completion rate, hook not strong enough, unclear message..."
              value={concern}
              onChange={(e) => setConcern(e.target.value)}
              rows={3}
              style={{ resize: 'none' }}
            />
          </div>
        </div>

        {error && (
          <div style={{ padding: '11px 14px', background: 'rgba(239,68,68,.07)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '10px', fontSize: '13px', color: '#fca5a5', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <button
          className="btn bp full"
          style={{ padding: '17px', fontSize: '16px', borderRadius: '14px' }}
          onClick={() => void handleAnalyze()}
          disabled={activeTab === 'text' ? (!script.trim() || (!autoDetect && (!niche || !platform))) : (!uploadedFile || (!autoDetect && (!niche || !platform)))}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          Run Content Analysis
        </button>

        <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,.2)', marginTop: '12px' }}>
          Sign-in required to generate your report · 3 free analyses/month
        </p>
      </div>


    </div>
  );
}
