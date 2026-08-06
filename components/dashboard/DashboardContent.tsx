'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { normalizeNaxResult, type AnalysisResult } from '@/lib/ai-engine-client';
import { useAuth } from '@/components/auth/AuthProvider';
import { getDisplayName } from '@/lib/account';
import { BETA_BADGE } from '@/lib/features';
import { createClient } from '@/lib/supabase';
import { ReportThumbnail, SkeletonCard } from '@/components/account/AccountPages';
import { motion, AnimatePresence } from 'framer-motion';

interface AnalysisRecord {
  id: string;
  user_id: string;
  video_url: string | null;
  video_name: string | null;
  niche: string | null;
  platform: string | null;
  video_length: string | null;
  goal: string | null;
  concern: string | null;
  overall_score: number | null;
  overall_verdict: string | null;
  results: AnalysisResult | null;
  transcript: string | null;
  created_at: string;
}

export default function DashboardContent() {
  const supabase = useMemo(() => createClient(), []);
  const { user, profile, analysesUsed, accountState, refreshAccount } = useAuth();
  const displayName = getDisplayName(user, profile);
  const accountEmail = profile?.email || user?.email || 'No email on file';
  const planLabel = profile?.plan === 'pro' ? 'Pro' : (profile?.plan === 'team' ? 'Team' : 'Free');

  const searchParams = useSearchParams();
  const router = useRouter();

  // Redirect to /analyze based on URL params
  useEffect(() => {
    const urlParam = searchParams.get('url');
    const action = searchParams.get('action');

    if (urlParam) {
      router.push(`/analyze?url=${encodeURIComponent(urlParam)}`);
    } else if (action === 'analyze') {
      router.push('/analyze');
    }
  }, [searchParams, router]);

  // ─── State ────────────────
  const [history, setHistory] = useState<AnalysisRecord[]>([]);

  // Calculate average scores and stats from history
  const stats = useMemo(() => {
    if (!history || history.length === 0) {
      return {
        avgOverall: 0,
        avgHook: 0,
        avgRetention: 0,
        avgEmotion: 0,
        total: 0,
        topPlatform: 'None',
        topNiche: 'None'
      };
    }

    // Exclude invalid/null/empty/failed reports
    const validReports = history.filter((item) => {
      if (!item.results) return false;
      if (typeof item.results !== 'object') return false;
      if (Object.keys(item.results).length === 0) return false;
      
      // Ensure the results payload contains actual analysis data (either executive_summary or modules)
      const hasExecSummary = Object.prototype.hasOwnProperty.call(item.results, 'executive_summary');
      const hasModules = Object.prototype.hasOwnProperty.call(item.results, 'modules');
      if (!hasExecSummary && !hasModules) return false;
      
      return true;
    });

    if (validReports.length === 0) {
      return {
        avgOverall: 0,
        avgHook: 0,
        avgRetention: 0,
        avgEmotion: 0,
        total: 0,
        topPlatform: 'None',
        topNiche: 'None'
      };
    }

    let overallSum = 0;
    let hookSum = 0;
    let hookCount = 0;
    let retentionSum = 0;
    let retentionCount = 0;
    let emotionSum = 0;
    let emotionCount = 0;
    const platformCounts: Record<string, number> = {};
    const nicheCounts: Record<string, number> = {};

    validReports.forEach((item) => {
      const normalized = normalizeNaxResult(item.results);
      const overall = normalized?.overall_score ?? item.overall_score ?? 0;
      overallSum += overall;
      
      const hook = normalized?.hook_analysis?.score ?? normalized?.modules?.hook?.score ?? null;
      if (hook !== null && hook > 0) {
        hookSum += hook;
        hookCount++;
      }

      const retention = normalized?.retention_analysis?.score ?? normalized?.modules?.retention?.score ?? null;
      if (retention !== null && retention > 0) {
        retentionSum += retention;
        retentionCount++;
      }

      const emotion = normalized?.emotion_analysis?.score ?? normalized?.modules?.emotion?.score ?? null;
      if (emotion !== null && emotion > 0) {
        emotionSum += emotion;
        emotionCount++;
      }

      const p = item.platform || normalized?.intelligence?.platform || 'Unknown';
      platformCounts[p] = (platformCounts[p] || 0) + 1;

      const n = item.niche || normalized?.intelligence?.niche || 'General';
      nicheCounts[n] = (nicheCounts[n] || 0) + 1;
    });

    // Find top platform
    let topPlatform = 'None';
    let maxP = 0;
    Object.entries(platformCounts).forEach(([p, count]) => {
      if (count > maxP) {
        maxP = count;
        topPlatform = p;
      }
    });

    // Find top niche
    let topNiche = 'None';
    let maxN = 0;
    Object.entries(nicheCounts).forEach(([n, count]) => {
      if (count > maxN) {
        maxN = count;
        topNiche = n;
      }
    });

    return {
      avgOverall: overallSum / validReports.length,
      avgHook: hookCount > 0 ? hookSum / hookCount : 0,
      avgRetention: retentionCount > 0 ? retentionSum / retentionCount : 0,
      avgEmotion: emotionCount > 0 ? emotionSum / emotionCount : 0,
      total: validReports.length,
      topPlatform,
      topNiche
    };
  }, [history]);

  // AI Agent States
  const [isAgentOpen, setIsAgentOpen] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [joinedWaitlist, setJoinedWaitlist] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  const handleDeleteReport = async (reportId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Are you sure you want to permanently delete this report? This action cannot be undone.')) {
      return;
    }

    const backupRecord = history.find((r) => r.id === reportId);
    if (!backupRecord) return;

    // Optimistically update
    setHistory((prev) => prev.filter((r) => r.id !== reportId));

    try {
      const { error } = await supabase
        .from('analyses')
        .delete()
        .eq('id', reportId);

      if (error) throw error;
    } catch (err: any) {
      // Revert on failure
      setHistory((prev) => [backupRecord, ...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5));
      alert(`Failed to delete report: ${err.message}`);
    }
  };

  const handleDuplicateReport = async (report: AnalysisRecord, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) return;

    // Create optimistic copy
    const tempId = `temp-${Date.now()}`;
    const duplicateName = `${report.video_name || 'Analysis'} (Copy)`;
    const optimisticRecord: AnalysisRecord = {
      ...report,
      id: tempId,
      video_name: duplicateName,
      created_at: new Date().toISOString()
    };

    // Optimistically insert
    setHistory((prev) => [optimisticRecord, ...prev].slice(0, 5));

    try {
      const { data, error } = await supabase
        .from('analyses')
        .insert([{
          user_id: user.id,
          video_name: duplicateName,
          video_url: report.video_url,
          niche: report.niche,
          platform: report.platform,
          video_length: report.video_length,
          goal: report.goal,
          concern: report.concern,
          overall_score: report.overall_score,
          overall_verdict: report.overall_verdict,
          results: report.results,
          transcript: report.transcript
        }])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        setHistory((prev) => prev.map((item) => item.id === tempId ? (data[0] as AnalysisRecord) : item));
      }
    } catch (err: any) {
      setHistory((prev) => prev.filter((item) => item.id !== tempId));
      alert(`Failed to duplicate: ${err.message}`);
    }
  };

  // ─── Fetch History ───────
  useEffect(() => {
    async function fetchHistory() {
      if (!user) return;

      console.log('[dashboard] fetching recent analyses', { userId: user.id });
      const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (!error && data) {
        console.log('[dashboard] loaded recent analyses', { count: data.length });
        setHistory(data as AnalysisRecord[]);
      } else if (error) {
        console.error('[dashboard] failed to load analyses', error.message);
      }
    }
    fetchHistory();
  }, [supabase, user]);

  if (!user) {
    return null;
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };



  return (
    <>
      <div style={{ padding: '110px 48px 80px' }}>
        <div className="wrap">
          
            <div style={{ animation: 'fadeUp .4s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px', flexWrap: 'wrap' as const, gap: '16px' }}>
                <div>
                  <div className="sec-lbl" style={{ marginBottom: '14px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', display: 'block' }}></span>
                    Workspace
                  </div>
                  <h1 style={{ fontSize: 'clamp(32px,4vw,46px)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-.04em' }}>
                    Welcome back, {displayName.split(' ')[0]}
                  </h1>
                  <div className="bdg bdg-p" style={{ display: 'inline-flex', marginTop: '12px' }}>{BETA_BADGE}</div>
                </div>
                <button className="btn bp md-btn" onClick={() => router.push('/analyze')}>+ New Analysis</button>
              </div>
              {/* Account summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '28px' }}>
                <div className="mc">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="mc-l">Monthly Usage</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)' }}>
                      {(profile?.plan === 'pro' || profile?.plan === 'team') ? `${analysesUsed} used (Unlimited)` : `${analysesUsed}/3 free`}
                    </span>
                  </div>
                  <div className="mbar" style={{ height: '5px' }}>
                    <div className="mf" style={{ width: `${(profile?.plan === 'pro' || profile?.plan === 'team') ? 100 : Math.min((analysesUsed / 3) * 100, 100)}%`, background: (profile?.plan === 'pro' || profile?.plan === 'team') ? 'var(--accent)' : analysesUsed >= 3 ? '#ef4444' : 'var(--accent)' }} />
                  </div>
                </div>
                <div className="mc">
                  <span className="mc-l">Plan Level</span>
                  <div className="mc-v" style={{ fontSize: '16px' }}>{planLabel} <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>· {accountState}</span></div>
                </div>
                <div className="mc">
                  <span className="mc-l">Recent Reports</span>
                  <div className="mc-v">{history.length}</div>
                </div>
              </div>
              {/* Dashboard Two-Column Layout */}
              <div className="dashboard-layout" style={{ marginTop: '32px' }}>
                
                {/* Left Column: Analysis History */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <p style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '20px', fontWeight: 600 }}>
                    Recent Reports
                  </p>

                  {history.length > 0 ? (
                    <motion.div
                      layout
                      className="premium-dashboard-grid"
                      style={{ marginTop: 0, marginBottom: '24px' }}
                    >
                      <AnimatePresence mode="popLayout">
                        {history.map((item) => {
                          const normalized = item.results ? normalizeNaxResult(item.results) : null;
                          const score = normalized?.overall_score ?? item.overall_score ?? 0;
                          
                          const hookScore = normalized?.hook_analysis?.score ?? normalized?.modules?.hook?.score ?? null;
                          const retentionScore = normalized?.retention_analysis?.score ?? normalized?.modules?.retention?.score ?? null;
                          const emotionalResonance = normalized?.emotion_analysis?.score ?? normalized?.modules?.emotion?.score ?? null;

                          const filename = normalized?.meta?.file_name || item.video_name || `${normalized?.intelligence?.niche || item.niche || 'general'} Script`;
                          const niche = item.niche || normalized?.intelligence?.niche || 'General';
                          const platform = item.platform || normalized?.intelligence?.platform || 'Unknown';
                          const dateStr = new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

                          // Determine Status Badge & State
                          const hasResults = item.results && typeof item.results === 'object' && Object.keys(item.results).length > 0;
                          const hasRootScore = item.overall_score !== null;
                          const hasExecSummary = item.results?.hasOwnProperty('executive_summary');
                          
                          let status: 'Complete' | 'Partial' | 'Failed' = 'Failed';
                          if (hasResults && hasExecSummary) status = 'Complete';
                          else if (hasRootScore) status = 'Partial';

                          const isOptimistic = item.id.startsWith('temp-');

                          return (
                            <motion.div
                              layout
                              key={item.id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9, y: 10 }}
                              transition={{ duration: 0.3, cubicBezier: [0.16, 1, 0.3, 1] }}
                              className="glass-card-premium"
                              onMouseMove={handleMouseMove}
                              onClick={() => {
                                if (!isOptimistic) {
                                  router.push(`/reports/${item.id}`);
                                }
                              }}
                              style={{
                                opacity: isOptimistic ? 0.6 : 1,
                                pointerEvents: isOptimistic ? 'none' : 'auto'
                              }}
                            >
                              {/* Thumbnail */}
                              <ReportThumbnail platform={platform} score={score} />

                              {/* Badges */}
                              <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                <span style={{
                                  padding: '3px 8px',
                                  background: 'rgba(255, 255, 255, 0.04)',
                                  border: '1px solid rgba(255, 255, 255, 0.06)',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: 'var(--text-secondary)'
                                }}>
                                  {platform}
                                </span>
                                <span style={{
                                  padding: '3px 8px',
                                  background: 'rgba(167, 139, 250, 0.06)',
                                  border: '1px solid rgba(167, 139, 250, 0.12)',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: 'var(--accent)'
                                }}>
                                  {niche}
                                </span>
                              </div>

                              {/* Title */}
                              <h3 
                                title={filename} 
                                style={{
                                  fontSize: '15px',
                                  fontWeight: 750,
                                  color: '#fff',
                                  marginBottom: '4px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  letterSpacing: '-0.01em'
                                }}
                              >
                                {filename}
                              </h3>
                              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '16px' }}>
                                Analyzed {dateStr}
                              </p>

                              {/* Metrics Row */}
                              <div style={{
                                background: 'rgba(255, 255, 255, 0.015)',
                                border: '1px solid rgba(255, 255, 255, 0.03)',
                                borderRadius: '10px',
                                padding: '10px 12px',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '8px',
                                marginBottom: '20px'
                              }}>
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '4px' }}>Hook</div>
                                  <div style={{ fontSize: '13px', fontWeight: 800, color: hookScore ? '#fff' : 'rgba(255,255,255,0.2)' }}>
                                    {hookScore ? hookScore.toFixed(1) : '—'}
                                  </div>
                                </div>
                                <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255, 255, 255, 0.05)', borderRight: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                  <div style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '4px' }}>Ret</div>
                                  <div style={{ fontSize: '13px', fontWeight: 800, color: retentionScore ? '#fff' : 'rgba(255,255,255,0.2)' }}>
                                    {retentionScore ? retentionScore.toFixed(1) : '—'}
                                  </div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '4px' }}>Emotion</div>
                                  <div style={{ fontSize: '13px', fontWeight: 800, color: emotionalResonance ? '#fff' : 'rgba(255,255,255,0.2)' }}>
                                    {emotionalResonance ? emotionalResonance.toFixed(1) : '—'}
                                  </div>
                                </div>
                              </div>

                              {/* Footer */}
                              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '12px' }}>
                                <span className={`badge-status ${status.toLowerCase()}`}>
                                  <span style={{
                                    width: '5px',
                                    height: '5px',
                                    borderRadius: '50%',
                                    background: 'currentColor',
                                    boxShadow: '0 0 6px currentColor'
                                  }} />
                                  {status}
                                </span>

                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button
                                    onClick={(e) => handleDuplicateReport(item, e)}
                                    className="card-action-btn"
                                    title="Duplicate Report"
                                  >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                    </svg>
                                  </button>

                                  <button
                                    onClick={(e) => handleDeleteReport(item.id, e)}
                                    className="card-action-btn delete-btn"
                                    title="Delete Report"
                                  >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <polyline points="3 6 5 6 21 6" />
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </motion.div>
                  ) : (
                    /* Premium Circular Empty State */
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        textAlign: 'center',
                        padding: '80px 24px',
                        background: 'rgba(255,255,255,0.01)',
                        border: '1px solid rgba(255,255,255,0.04)',
                        borderRadius: '24px',
                        maxWidth: '680px',
                        margin: '0 auto 24px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '300px',
                        height: '300px',
                        background: 'radial-gradient(circle, rgba(124, 58, 237, 0.06) 0%, transparent 75%)',
                        filter: 'blur(30px)',
                        pointerEvents: 'none',
                        zIndex: 0
                      }} />

                      <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(124, 58, 237, 0.02) 100%)',
                        border: '1px solid rgba(124, 58, 237, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 24px',
                        zIndex: 1,
                        position: 'relative'
                      }}>
                        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5">
                          <polygon points="12 2 2 7 12 12 22 7 12 2" />
                          <polyline points="2 17 12 22 22 17" />
                          <polyline points="2 12 12 17 22 12" />
                        </svg>
                      </div>

                      <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '8px', zIndex: 1, position: 'relative' }}>
                        No reports yet
                      </h2>
                      <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, marginBottom: '24px', maxWidth: '420px', margin: '0 auto 24px', zIndex: 1, position: 'relative' }}>
                        Run your first Creator Intelligence Analysis<br />
                        to generate platform diagnostics,<br />
                        hook scoring, retention analysis,<br />
                        and creator recommendations.
                      </p>
                      
                      <button onClick={() => router.push('/analyze')} className="btn bp md-btn text-glow-purple border-glow-purple" style={{ zIndex: 1, position: 'relative' }}>
                        Start First Analysis
                      </button>
                    </motion.div>
                  )}
                </div>

                {/* Right Column: Sidebar (Analytics Summary) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Analytics Summary Card */}
                  <div className="analytics-summary-card">
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      📈 Analytics Summary
                    </h3>
                    
                    {history.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Avg. Hook Score</span>
                            <span style={{ color: '#fff', fontWeight: 700 }}>{stats.avgHook.toFixed(1)}/10.0</span>
                          </div>
                          <div style={{ height: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: 'linear-gradient(90deg, #7c3aed, #a78bfa)', width: `${stats.avgHook * 10}%`, borderRadius: '3px' }}></div>
                          </div>
                        </div>

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Avg. Retention Score</span>
                            <span style={{ color: '#fff', fontWeight: 700 }}>{stats.avgRetention.toFixed(1)}/10.0</span>
                          </div>
                          <div style={{ height: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)', width: `${stats.avgRetention * 10}%`, borderRadius: '3px' }}></div>
                          </div>
                        </div>

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Avg. Emotional Resonance</span>
                            <span style={{ color: '#fff', fontWeight: 700 }}>{stats.avgEmotion.toFixed(1)}/10.0</span>
                          </div>
                          <div style={{ height: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', width: `${stats.avgEmotion * 10}%`, borderRadius: '3px' }}></div>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '12px' }}>
                          <div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '2px' }}>Top Platform</div>
                            <div style={{ fontSize: '12px', color: '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={stats.topPlatform}>
                              {stats.topPlatform}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '2px' }}>Top Niche</div>
                            <div style={{ fontSize: '12px', color: '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={stats.topNiche}>
                              {stats.topNiche}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '20px 0', fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
                        No data available yet. Analyze a script to view metrics.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
        </div>
      </div>

      {/* ═══ AI AGENT ═══ */}
      <div id="ai-agent-btn" onClick={() => setIsAgentOpen(!isAgentOpen)}>
        <div className="pulse-ring"></div>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
        </svg>
      </div>

      <div id="ai-panel" className={isAgentOpen ? 'show' : ''} style={{ display: 'flex', flexDirection: 'column', height: '550px' }}>
        <div className="ai-p-header">
          <div className="ai-ph-left">
            <div className="ai-avatar" style={{ background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div className="ai-ph-text">
              <p className="ai-ph-title">Narratix Copilot</p>
              <p className="ai-ph-status">
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }}></span>
                Private Preview · Coming Soon
              </p>
            </div>
          </div>
          <div className="ai-close" onClick={() => setIsAgentOpen(false)}>×</div>
        </div>

        {/* Scrollable Coming Soon Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Interactive Content Companion</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Narratix Copilot is currently in development. When released, it will act as an interactive content assistant for scripts, hooks, and retention pacing.
            </p>
          </div>

          {/* Capability Preview Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Upcoming Capabilities</span>
            
            {[
              { 
                title: 'Explain Scores', 
                desc: 'Get clear, detailed breakdowns of your diagnostic scores and metric calculations.', 
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                ) 
              },
              { 
                title: 'Rewrite Scripts', 
                desc: 'Generate optimized paragraph and voiceover alternatives to smooth out pacing.', 
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                ) 
              },
              { 
                title: 'Generate Hooks', 
                desc: 'Receive multiple scroll-stopping variants matching your platform niche.', 
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                ) 
              },
              { 
                title: 'Improve Retention', 
                desc: 'Identify precise lines causing audience drop-offs and structural solutions.', 
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
                    <polyline points="16 17 22 17 22 11" />
                  </svg>
                ) 
              },
              { 
                title: 'Creator Recommendation Notes', 
                desc: 'Get clearer next-step suggestions based on your Creator Intelligence report.', 
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                ) 
              }
            ].map((cap, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{cap.icon}</span>
                <div>
                  <h5 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>{cap.title}</h5>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{cap.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Waitlist CTA */}
          <div style={{ borderTop: '1px solid var(--border-secondary)', paddingTop: '16px', marginTop: '8px' }}>
            {joinedWaitlist ? (
              <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', padding: '12px 16px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--success-color)', margin: 0 }}>✓ Joined waitlist! We&apos;ll notify you when early access begins.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <h5 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>Get Early Access</h5>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Sign up to be notified as soon as Copilot goes live.</p>
                </div>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!waitlistEmail.trim() || waitlistLoading) return;
                    setWaitlistLoading(true);
                    setTimeout(() => {
                      setWaitlistLoading(false);
                      setJoinedWaitlist(true);
                    }, 800);
                  }}
                  style={{ display: 'flex', gap: '8px' }}
                >
                  <input 
                    type="email" 
                    placeholder="Enter email..." 
                    required 
                    value={waitlistEmail}
                    onChange={(e) => setWaitlistEmail(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: '13px',
                      background: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                  />
                  <button 
                    type="submit" 
                    disabled={waitlistLoading}
                    className="btn bp sm"
                    style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)' }}
                  >
                    {waitlistLoading ? 'Submitting...' : 'Join Waitlist'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Input Area (Disabled) */}
        <div className="ai-input-area" style={{ opacity: 0.6, borderTop: '1px solid var(--border-secondary)' }}>
          <textarea 
            className="ai-input" 
            placeholder="Copilot chat is in private preview..." 
            rows={1}
            disabled
          ></textarea>
          <button className="ai-send" disabled>
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
          </button>
        </div>
      </div>
    </>
  );
}
