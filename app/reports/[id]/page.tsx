'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { createClient } from '@/lib/supabase-browser';
import { normalizeNaxResult, type AnalysisResult } from '@/lib/ai-engine-client';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AnalysisResults from '@/components/dashboard/AnalysisResults';
import Link from 'next/link';

interface AnalysisRecord {
  id: string;
  user_id: string;
  video_url: string | null;
  niche: string | null;
  platform: string | null;
  video_length: number | string | null;
  goal: string | null;
  concern: string | null;
  overall_score: number | null;
  overall_verdict: string | null;
  results: AnalysisResult | null;
  transcript: string | null;
  created_at: string;
  video_name?: string | null;
}

export default function ReportDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user, profile } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  // Main report state
  const [reportRecord, setReportRecord] = useState<AnalysisRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Comparison states
  const [historyList, setHistoryList] = useState<AnalysisRecord[]>([]);
  const [compareId, setCompareId] = useState<string>('');
  const [compareRecord, setCompareRecord] = useState<AnalysisRecord | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to permanently delete this report? This cannot be undone.')) {
      return;
    }
    try {
      const { error } = await supabase
        .from('analyses')
        .delete()
        .eq('id', id);
      if (error) throw error;
      router.push('/dashboard');
    } catch (err: any) {
      alert(`Error deleting report: ${err.message}`);
    }
  };

  // Fetch the current report
  useEffect(() => {
    async function fetchReport() {
      if (!user || !id) return;
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('analyses')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (fetchError) throw fetchError;
        if (!data) {
          setError('Analysis report not found.');
          setLoading(false);
          return;
        }

        // Verify ownership
        if (data.user_id !== user.id) {
          setError('You do not have permission to view this report.');
          setLoading(false);
          return;
        }

        setReportRecord(data as AnalysisRecord);
      } catch (err: any) {
        console.error('Error fetching report:', err.message);
        setError(err.message || 'An error occurred while loading the report.');
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [id, supabase, user]);

  // Fetch history list for comparison dropdown
  useEffect(() => {
    async function fetchHistory() {
      if (!user) return;
      const { data } = await supabase
        .from('analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        // Exclude the current report from the comparison history
        setHistoryList((data as AnalysisRecord[]).filter((r) => r.id !== id));
      }
    }
    fetchHistory();
  }, [id, supabase, user]);

  // Fetch the comparison target report when compareId changes
  useEffect(() => {
    if (!compareId) {
      setCompareRecord(null);
      return;
    }
    const target = historyList.find((r) => r.id === compareId);
    setCompareRecord(target || null);
  }, [compareId, historyList]);

  // Normalized current and comparison results
  const normalizedResults = useMemo(() => {
    if (!reportRecord) return null;
    const sourceData = reportRecord.results && Object.keys(reportRecord.results).length > 0
      ? reportRecord.results
      : reportRecord;
    return normalizeNaxResult(sourceData);
  }, [reportRecord]);

  const normalizedCompareResults = useMemo(() => {
    if (!compareRecord) return null;
    const sourceData = compareRecord.results && Object.keys(compareRecord.results).length > 0
      ? compareRecord.results
      : compareRecord;
    return normalizeNaxResult(sourceData);
  }, [compareRecord]);

  // Calculate Deltas for the modules
  const deltas = useMemo(() => {
    if (!normalizedResults || !normalizedCompareResults) return null;

    const currentScore = normalizedResults.overall_score;
    const compareScore = normalizedCompareResults.overall_score;
    const overallDelta = Number((currentScore - compareScore).toFixed(1));

    const getScore = (res: AnalysisResult, key: string) => {
      // Safely extract score
      return (res as any)[`${key}_analysis`]?.score ?? (res as any).modules?.[key]?.score ?? 0;
    };

    const modulesList = ['hook', 'retention', 'script', 'editing', 'emotion', 'growth'];
    const moduleDeltas = modulesList.reduce((acc, m) => {
      const cScore = getScore(normalizedResults, m);
      const prevScore = getScore(normalizedCompareResults, m);
      acc[m] = {
        current: cScore,
        compare: prevScore,
        delta: cScore - prevScore
      };
      return acc;
    }, {} as Record<string, { current: number; compare: number; delta: number }>);

    return {
      overall: overallDelta,
      modules: moduleDeltas,
      trend: overallDelta > 0 ? 'Improved' : overallDelta < 0 ? 'Declined' : 'No Change'
    };
  }, [normalizedResults, normalizedCompareResults]);

  if (!user) {
    return (
      <>
        <Navbar />
        <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <h2>Please Log In</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>You must be logged in to view your reports.</p>
            <Link href="/login" className="btn bp md-btn">Login</Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="account-page" style={{ padding: '110px 24px 80px', minHeight: '90vh', background: 'var(--bg-primary)' }}>
        <div className="wrap" style={{ maxWidth: '1000px', margin: '0 auto' }}>
          
          {/* Back button and title */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Link href="/dashboard" className="btn bg-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '13px' }}>
                ← Dashboard
              </Link>
              <button
                onClick={handleDelete}
                className="btn bg-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  color: '#ef4444',
                  borderColor: 'rgba(239, 68, 68, 0.2)',
                  background: 'rgba(239, 68, 68, 0.05)',
                  cursor: 'pointer'
                }}
              >
                🗑️ Delete
              </button>
            </div>
            
            {/* Compare Selector */}
            {historyList.length > 0 && reportRecord && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Compare with:</span>
                <select
                  value={compareId}
                  onChange={(e) => {
                    setCompareId(e.target.value);
                    setShowComparison(!!e.target.value);
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">Select past report...</option>
                  {historyList.map((rec) => {
                    const norm = rec.results ? normalizeNaxResult(rec.results) : null;
                    const name = norm?.meta?.file_name || rec.video_name || `${rec.niche || 'General'} Script`;
                    const dateStr = new Date(rec.created_at).toLocaleDateString();
                    const score = norm?.overall_score ?? rec.overall_score ?? '—';
                    return (
                      <option key={rec.id} value={rec.id}>
                        [{score} pts] {name} ({dateStr})
                      </option>
                    );
                  })}
                </select>
                {compareId && (
                  <button
                    className="btn bg-btn"
                    onClick={() => {
                      setCompareId('');
                      setShowComparison(false);
                    }}
                    style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-secondary)' }}
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>

          {loading ? (
            <div className="account-empty" style={{ padding: '100px 0' }}>Loading Creator Intelligence Report...</div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
              <div style={{ fontSize: '40px', marginBottom: '20px' }}>⚠️</div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>{error}</h3>
              <Link href="/dashboard" className="btn bp md-btn" style={{ marginTop: '16px' }}>Back to Dashboard</Link>
            </div>
          ) : reportRecord && !normalizedResults ? (
            <div style={{ animation: 'fadeUp .4s ease', textAlign: 'center', padding: '60px 24px', maxWidth: '580px', margin: '0 auto', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '18px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>Empty Report Details</h3>
              <p style={{ fontSize: '14.5px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
                This report (ID: <code style={{ color: 'var(--accent)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>{reportRecord.id}</code>) was saved without diagnostic results. This occurs when database migrations are incomplete or if analysis generation failed.
              </p>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-primary)', borderRadius: '12px', padding: '16px', textAlign: 'left', marginBottom: '28px', fontSize: '13px' }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: 700, color: 'var(--text-primary)' }}>🛠️ Troubleshooting Recommendations:</p>
                <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li>Apply the database schema updates by running the migration <code style={{ background: 'rgba(255,255,255,0.05)', padding: '1px 4px', borderRadius: '3px' }}>supabase_phase15.sql</code> in the Supabase SQL Editor.</li>
                  <li>Re-run the analysis for your script or document via the Analyze page.</li>
                </ul>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <Link href="/analyze" className="btn bp md-btn">Start New Analysis</Link>
                <Link href="/dashboard" className="btn bg-btn md-btn">Back to Dashboard</Link>
              </div>
            </div>
          ) : reportRecord && normalizedResults ? (
            <div style={{ animation: 'fadeUp 0.3s ease' }}>
              {/* HEADER ROW */}
              <div style={{ borderBottom: '1px solid var(--border-primary)', paddingBottom: '24px', marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <span className="sec-lbl">
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', display: 'block' }} />
                      Creator Intelligence Report
                    </span>
                    <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0 8px 0', letterSpacing: '-0.03em' }}>
                      {normalizedResults.meta?.file_name || reportRecord.video_name || `${reportRecord.niche || 'General'} Script`}
                    </h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                      Analyzed on {new Date(reportRecord.created_at).toLocaleDateString()} at {new Date(reportRecord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  
                  {reportRecord.video_url && (
                    <a href={reportRecord.video_url} target="_blank" rel="noopener noreferrer" className="btn bg-btn" style={{ fontSize: '13px', padding: '8px 16px' }}>
                      View Linked Content ↗
                    </a>
                  )}
                </div>
              </div>

              {/* COMPARISON RESULTS PANEL */}
              {showComparison && compareRecord && normalizedCompareResults && deltas && (
                <div style={{
                  background: 'rgba(124, 58, 237, 0.04)',
                  border: '1px solid rgba(124, 58, 237, 0.2)',
                  borderRadius: '18px',
                  padding: '24px',
                  animation: 'fadeUp 0.3s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>Report Comparison</h3>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                        Comparing current script with <strong>{normalizedCompareResults.meta?.file_name || compareRecord.video_name || `${compareRecord.niche || 'General'} Script`}</strong>
                      </p>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: deltas.overall > 0 ? 'rgba(16, 185, 129, 0.1)' : deltas.overall < 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${deltas.overall > 0 ? 'rgba(16, 185, 129, 0.2)' : deltas.overall < 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)'}`,
                      padding: '6px 12px',
                      borderRadius: '8px'
                    }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Overall Delta:</span>
                      <span style={{
                        fontSize: '15px',
                        fontWeight: 800,
                        color: deltas.overall > 0 ? '#10b981' : deltas.overall < 0 ? '#ef4444' : '#fff'
                      }}>
                        {deltas.overall > 0 ? `+${deltas.overall}` : deltas.overall}
                      </span>
                    </div>
                  </div>

                  {/* Summary Trend Alert Box */}
                  <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    fontSize: '13.5px',
                    lineHeight: 1.6,
                    color: 'var(--text-secondary)',
                    marginBottom: '20px'
                  }}>
                    {deltas.overall > 0 ? (
                      <span>📈 <strong>Positive Trajectory!</strong> This revision shows an overall diagnostic score increase of <strong>+{deltas.overall}</strong>. Improvements are primarily reflected in structural pacing and clarity beats.</span>
                    ) : deltas.overall < 0 ? (
                      <span>📉 <strong>Pacing Warning:</strong> This report scores <strong>{Math.abs(deltas.overall)}</strong> points lower than your previous analysis. Review Hook and Retention changes below to address dropping interest.</span>
                    ) : (
                      <span>⚖️ <strong>Static Score:</strong> Overall score matches. Pacing and structures remain identical, check specific module recommendations below for optimizing outcomes.</span>
                    )}
                  </div>

                  {/* Dynamic Module Comparison Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                    {[
                      { key: 'hook', label: 'Hook Pacing', desc: 'Scroll-stopping power' },
                      { key: 'retention', label: 'Retention Holding', desc: 'Viewer drop points' },
                      { key: 'script', label: 'Script Structure', desc: 'Narrative layout flow' },
                      { key: 'editing', label: 'Visual Pacing', desc: 'Cuts & pattern interrupts' },
                      { key: 'emotion', label: 'Emotional Journey', desc: 'Curiosity & trust moments' },
                      { key: 'growth', label: 'Growth Strategy', desc: 'Caption & discoverability' }
                    ].map((mod) => {
                      const modDelta = deltas.modules[mod.key];
                      if (!modDelta) return null;

                      // Check gating for advanced modules if user is free tier
                      const isAdvanced = ['editing', 'emotion', 'growth'].includes(mod.key);
                      const isPro = profile?.plan === 'pro' || profile?.plan === 'team';
                      const isLocked = isAdvanced && !isPro;

                      return (
                        <div key={mod.key} style={{
                          background: 'rgba(0,0,0,0.15)',
                          border: '1px solid rgba(255,255,255,0.05)',
                          borderRadius: '12px',
                          padding: '16px',
                          position: 'relative',
                          filter: isLocked ? 'blur(1.5px)' : 'none',
                          opacity: isLocked ? 0.6 : 1
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div>
                              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#fff', margin: 0 }}>{mod.label}</h4>
                              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>{mod.desc}</p>
                            </div>
                            
                            {!isLocked && (
                              <div style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: modDelta.delta > 0 ? 'rgba(16, 185, 129, 0.15)' : modDelta.delta < 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.05)',
                                color: modDelta.delta > 0 ? '#10b981' : modDelta.delta < 0 ? '#ef4444' : '#fff'
                              }}>
                                {modDelta.delta > 0 ? `+${modDelta.delta}` : modDelta.delta}
                              </div>
                            )}
                          </div>

                          {isLocked ? (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '12px' }}>
                              🔒 Unlock with Pro Plan
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '12px' }}>
                              <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>{modDelta.current}</span>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/ 10</span>
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '6px' }}>
                                (Previously: {modDelta.compare})
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* RENDER THE MAIN REPORT */}
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '18px', padding: '24px' }}>
                <AnalysisResults
                  results={normalizedResults}
                  transcript={reportRecord.transcript}
                  onReset={() => router.push('/dashboard?action=analyze')}
                  niche={reportRecord.niche || undefined}
                  platform={reportRecord.platform || undefined}
                />
              </div>

            </div>
          ) : null}

        </div>
      </main>
      <Footer />
    </>
  );
}
