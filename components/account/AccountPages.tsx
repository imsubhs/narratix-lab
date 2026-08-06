'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/auth/AuthProvider';
import { getDisplayName, getInitials } from '@/lib/account';
import { createClient } from '@/lib/supabase-browser';
import { normalizeNaxResult, type AnalysisResult } from '@/lib/ai-engine-client';

type AnalysisRecord = {
  id: string;
  user_id?: string;
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
};

function AccountHeader({
  label,
  title,
  action,
}: {
  label: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="account-head">
      <div>
        <div className="sec-lbl">
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a78bfa', display: 'block' }} />
          {label}
        </div>
        <h1 style={{ fontSize: 'clamp(32px,4vw,46px)', fontWeight: 800, color: '#fff', letterSpacing: '-.04em' }}>
          {title}
        </h1>
      </div>
      {action}
    </div>
  );
}

function AccountMetric({
  label,
  value,
  note,
}: {
  label: string;
  value: ReactNode;
  note?: string;
}) {
  return (
    <div className="account-card">
      <div className="account-card-label">{label}</div>
      <div className="account-card-value">{value}</div>
      {note && <p className="account-card-note">{note}</p>}
    </div>
  );
}

function useAccountIdentity() {
  const auth = useAuth();
  const displayName = getDisplayName(auth.user, auth.profile);
  const email = auth.profile?.email || auth.user?.email || 'No email on file';
  const plan = auth.profile?.plan === 'pro' ? 'Pro' : (auth.profile?.plan === 'team' ? 'Team' : 'Free');
  const initials = getInitials(auth.profile?.full_name || email || displayName);

  return { ...auth, displayName, email, plan, initials };
}

export function ProfileAccountPage() {
  const { displayName, email, initials, plan, analysesUsed, accountState } = useAccountIdentity();

  return (
    <main className="account-page">
      <div className="wrap">
        <AccountHeader label="Profile" title="Account Profile" />
        <div className="account-profile-row">
          <div className="account-avatar-lg">{initials}</div>
          <div>
            <h2>{displayName}</h2>
            <p>{email}</p>
          </div>
        </div>
        <div className="account-grid">
          <AccountMetric label="Email" value={email} />
          <AccountMetric label="Plan" value={plan} />
          <AccountMetric label="Analyses Used" value={analysesUsed} note="Current account usage from your profile." />
          <AccountMetric label="Account State" value={<span className="account-status">{accountState}</span>} />
        </div>
      </div>
    </main>
  );
}

export function SettingsAccountPage() {
  const { displayName, email, plan, accountState, signOut, profile } = useAccountIdentity();

  return (
    <main className="account-page">
      <div className="wrap">
        <AccountHeader
          label="Settings"
          title="Account Settings"
          action={<button className="btn bg-btn md-btn" onClick={signOut}>Logout</button>}
        />
        <div className="account-card">
          <div className="account-list">
            <div className="account-list-row">
              <span>Name</span>
              <span>{displayName}</span>
            </div>
            <div className="account-list-row">
              <span>Email</span>
              <span>{email}</span>
            </div>
            <div className="account-list-row">
              <span>Plan</span>
              <span>{plan}</span>
            </div>
            <div className="account-list-row">
              <span>Session</span>
              <span>{accountState}</span>
            </div>
            <div className="account-list-row">
              <span>Usage Reset</span>
              <span>{profile?.usage_reset_at ? new Date(profile.usage_reset_at).toLocaleDateString() : 'Not scheduled'}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export function BillingAccountPage() {
  const { plan, analysesUsed } = useAccountIdentity();
  const freeLimit = 3;
  const isPremium = plan === 'Pro' || plan === 'Team';

  return (
    <main className="account-page">
      <div className="wrap">
        <AccountHeader label="Billing" title="Billing & Plans" />
        <div className="account-grid">
          <AccountMetric 
            label="Current Plan" 
            value={plan} 
            note={isPremium ? `${plan} plan state is preserved for future access. Beta V1 public features remain script and content analysis.` : 'Free beta account with 3 analyses per month limit.'} 
          />
          <AccountMetric label="Usage" value={isPremium ? `${analysesUsed} used` : `${analysesUsed}/${freeLimit}`} />
          <AccountMetric label="Billing Status" value={<span className="account-status">active</span>} />
        </div>

        {plan === 'Free' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '24px' }}>
            <div className="account-card" style={{ opacity: 0.8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '18px', flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '7px' }}>Narratix Pro</h2>
                  <p className="account-card-note" style={{ marginTop: 0 }}>Available After Beta Launch. Future Creator Intelligence features remain Coming Soon.</p>
                </div>
                <div style={{ minWidth: '220px' }}>
                  <button className="btn bo md-btn" style={{ width: '100%', opacity: 0.6, cursor: 'not-allowed' }} disabled>Coming Soon</button>
                </div>
              </div>
            </div>

            <div className="account-card" style={{ opacity: 0.8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '18px', flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '7px' }}>Narratix Team</h2>
                  <p className="account-card-note" style={{ marginTop: 0 }}>Available After Beta Launch. Team Workspace, Shared Reports, and Team Analytics are Coming Soon.</p>
                </div>
                <div style={{ minWidth: '220px' }}>
                  <button className="btn bo md-btn" style={{ width: '100%', opacity: 0.6, cursor: 'not-allowed' }} disabled>Coming Soon</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {plan === 'Pro' && (
          <div className="account-card" style={{ marginTop: '24px', opacity: 0.8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '18px', flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '7px' }}>Narratix Team</h2>
                <p className="account-card-note" style={{ marginTop: 0 }}>Team Workspace and client project folders are Coming Soon after Beta V1.</p>
              </div>
              <div style={{ minWidth: '220px' }}>
                <button className="btn bo md-btn" style={{ width: '100%', opacity: 0.6, cursor: 'not-allowed' }} disabled>Coming Soon</button>
              </div>
            </div>
          </div>
        )}

        {plan === 'Team' && (
          <div className="account-card" style={{ marginTop: '24px', textAlign: 'center', padding: '40px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '7px' }}>🌟 Narratix Team Member</h2>
            <p className="account-card-note" style={{ maxWidth: '480px', margin: '8px auto 0' }}>
              Team plan state is preserved. Team Workspace, collaboration tools, and premium team features remain Coming Soon during Beta V1.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

export function HistoryAccountPage() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Search, Filters & Sorting states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [selectedNiche, setSelectedNiche] = useState('');
  const [selectedDate, setSelectedDate] = useState('all'); // 'all', '24h', '7d', '30d'
  const [scoreRange, setScoreRange] = useState('all'); // 'all', 'high', 'med', 'low'
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'highest', 'lowest'

  // Toast / Status state for feedback
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Optimistic Duplicate Analysis Action
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

    // Optimistically insert into UI state
    setHistory((prev) => [optimisticRecord, ...prev]);
    showToast('Duplicating analysis...');

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
        // Swap temp ID for the actual DB ID
        setHistory((prev) => prev.map((item) => item.id === tempId ? (data[0] as AnalysisRecord) : item));
        showToast('Analysis duplicated successfully!');
      }
    } catch (err: any) {
      // Revert optimistic update on failure
      setHistory((prev) => prev.filter((item) => item.id !== tempId));
      showToast(`Failed to duplicate: ${err.message}`, 'error');
    }
  };

  // Optimistic Delete Action
  const handleDeleteReport = async (reportId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Are you sure you want to permanently delete this report? This action cannot be undone.')) {
      return;
    }

    const backupRecord = history.find((r) => r.id === reportId);
    if (!backupRecord) return;

    // Optimistically remove from state
    setHistory((prev) => prev.filter((r) => r.id !== reportId));
    showToast('Report deleted.');

    try {
      console.log('[delete] Attempting DB delete for reportId:', reportId);
      const { data, error, status } = await supabase
        .from('analyses')
        .delete()
        .eq('id', reportId)
        .select();

      console.log('[delete] DB response:', { data, error, status });

      if (error) throw error;
    } catch (err: any) {
      console.error('[delete] Caught exception during delete:', err);
      // Revert on failure
      setHistory((prev) => [backupRecord, ...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      showToast(`Failed to delete report: ${err.message}`, 'error');
    }
  };

  useEffect(() => {
    async function fetchHistory() {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('analyses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setHistory((data || []) as AnalysisRecord[]);
      } catch (err: any) {
        showToast(`Failed to load history: ${err.message}`, 'error');
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [supabase, user]);

  // Dynamically extract unique niches
  const uniqueNiches = useMemo(() => {
    const niches = new Set<string>();
    history.forEach((item) => {
      const norm = item.results ? normalizeNaxResult(item.results) : null;
      const niche = item.niche || norm?.intelligence?.niche;
      if (niche) niches.add(niche);
    });
    return Array.from(niches).sort();
  }, [history]);

  // Dynamically extract unique platforms
  const uniquePlatforms = useMemo(() => {
    const platforms = new Set<string>();
    history.forEach((item) => {
      const norm = item.results ? normalizeNaxResult(item.results) : null;
      const platform = item.platform || norm?.intelligence?.platform;
      if (platform) platforms.add(platform);
    });
    return Array.from(platforms).sort();
  }, [history]);

  // Filter and Sort history list
  const filteredAndSortedHistory = useMemo(() => {
    const filtered = history.filter((item) => {
      const norm = item.results ? normalizeNaxResult(item.results) : null;
      const filename = norm?.meta?.file_name || item.video_name || '';
      const niche = item.niche || norm?.intelligence?.niche || '';
      const platform = item.platform || norm?.intelligence?.platform || '';
      const score = norm?.overall_score ?? item.overall_score ?? 0;

      const matchesSearch =
        filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        niche.toLowerCase().includes(searchTerm.toLowerCase()) ||
        platform.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.transcript && item.transcript.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesPlatform = !selectedPlatform || platform.toLowerCase() === selectedPlatform.toLowerCase();
      const matchesNiche = !selectedNiche || niche.toLowerCase() === selectedNiche.toLowerCase();
      
      const matchesDateFilter = (() => {
        if (selectedDate === 'all') return true;
        const diffMs = Date.now() - new Date(item.created_at).getTime();
        if (selectedDate === '24h') return diffMs <= 24 * 60 * 60 * 1000;
        if (selectedDate === '7d') return diffMs <= 7 * 24 * 60 * 60 * 1000;
        if (selectedDate === '30d') return diffMs <= 30 * 24 * 60 * 60 * 1000;
        return true;
      })();

      const matchesScoreFilter = (() => {
        if (scoreRange === 'all') return true;
        if (scoreRange === 'high') return score >= 8;
        if (scoreRange === 'med') return score >= 5 && score < 8;
        if (scoreRange === 'low') return score >= 1 && score < 5;
        return true;
      })();

      return matchesSearch && matchesPlatform && matchesNiche && matchesDateFilter && matchesScoreFilter;
    });

    return [...filtered].sort((a, b) => {
      const normA = a.results ? normalizeNaxResult(a.results) : null;
      const normB = b.results ? normalizeNaxResult(b.results) : null;
      const scoreA = normA?.overall_score ?? a.overall_score ?? 0;
      const scoreB = normB?.overall_score ?? b.overall_score ?? 0;

      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === 'highest') {
        return scoreB - scoreA;
      }
      if (sortBy === 'lowest') {
        return scoreA - scoreB;
      }
      return 0;
    });
  }, [history, searchTerm, selectedPlatform, selectedNiche, selectedDate, scoreRange, sortBy]);

  const hasActiveFilters = searchTerm !== '' || selectedPlatform !== '' || selectedNiche !== '' || selectedDate !== 'all' || scoreRange !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedPlatform('');
    setSelectedNiche('');
    setSelectedDate('all');
    setScoreRange('all');
  };

  // Card cursor spotlight tracking handler
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  return (
    <main className="account-page" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(124, 58, 237, 0.08), transparent)', minHeight: '90vh' }}>
      <div className="wrap" style={{ maxWidth: '1240px' }}>
        <AccountHeader
          label="Intelligence Library"
          title="Creator Intelligence"
          action={<Link href="/analyze" className="btn bp md-btn text-glow-purple border-glow-purple">+ New Analysis</Link>}
        />

        {/* Dynamic Toast Feedback Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className={`stg-toast ${toastMessage.type === 'error' ? 'error' : 'success'}`}
              style={{ zIndex: 1000, bottom: '24px' }}
            >
              {toastMessage.text}
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          /* Premium Pulsing Skeleton Cards */
          <div className="history-reports-grid" style={{ marginTop: '32px' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : history.length > 0 ? (
          <>
            {/* Dark Luxury Search & Filter Command Panel */}
            <div className="filter-search-container">
              <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="text"
                    placeholder="Search creator reports, transcripts, niches..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input-premium"
                    style={{ paddingLeft: '44px' }}
                  />
                  <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </div>
                </div>

                <div style={{ width: '160px' }}>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="filter-select-premium"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="highest">Highest Score</option>
                    <option value="lowest">Lowest Score</option>
                  </select>
                </div>
              </div>

              {/* Sub-Filters Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div>
                  <select
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value)}
                    className="filter-select-premium"
                  >
                    <option value="">All Platforms</option>
                    {uniquePlatforms.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    value={selectedNiche}
                    onChange={(e) => setSelectedNiche(e.target.value)}
                    className="filter-select-premium"
                  >
                    <option value="">All Niches</option>
                    {uniqueNiches.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="filter-select-premium"
                  >
                    <option value="all">Any Date</option>
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                  </select>
                </div>

                <div>
                  <select
                    value={scoreRange}
                    onChange={(e) => setScoreRange(e.target.value)}
                    className="filter-select-premium"
                  >
                    <option value="all">Any Score</option>
                    <option value="high">High (8.0 - 10.0)</option>
                    <option value="med">Medium (5.0 - 7.9)</option>
                    <option value="low">Low (1.0 - 4.9)</option>
                  </select>
                </div>

                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="btn bg-btn"
                    style={{
                      height: '46px',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--text-secondary)'
                    }}
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            {/* Results Grid with Animations */}
            {filteredAndSortedHistory.length > 0 ? (
              <motion.div
                layout
                className="history-reports-grid"
              >
                <AnimatePresence mode="popLayout">
                  {filteredAndSortedHistory.map((item) => {
                    const normalized = item.results ? normalizeNaxResult(item.results) : null;
                    const score = normalized?.overall_score ?? item.overall_score ?? 0;
                    
                    const hookScore = normalized?.hook_analysis?.score ?? normalized?.modules?.hook?.score ?? null;
                    const retentionScore = normalized?.retention_analysis?.score ?? normalized?.modules?.retention?.score ?? null;
                    const emotionalResonance = normalized?.emotion_analysis?.score ?? normalized?.modules?.emotion?.score ?? null;

                    const filename = normalized?.meta?.file_name || item.video_name || `${normalized?.intelligence?.niche || item.niche || 'general'} Script`;
                    const niche = item.niche || normalized?.intelligence?.niche || 'General';
                    const platform = item.platform || normalized?.intelligence?.platform || 'Unknown';
                    const dateStr = new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

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
                        {/* 1. Styled Dynamic Thumbnail */}
                        <ReportThumbnail platform={platform} score={score} />

                        {/* 2. Platform & Niche Badges */}
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

                        {/* 3. Title & Date */}
                        <h3 
                          title={filename} 
                          style={{
                            fontSize: '16px',
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
                        <p style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.35)', marginBottom: '16px' }}>
                          {dateStr}
                        </p>

                        {/* 4. Sleek Modular Metrics Row */}
                        {hookScore !== null && retentionScore !== null ? (
                          <div style={{
                            background: 'rgba(255, 255, 255, 0.015)',
                            border: '1px solid rgba(255, 255, 255, 0.03)',
                            borderRadius: '10px',
                            padding: '10px 12px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '8px',
                            marginBottom: '20px'
                          }}>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '4px' }}>Hook Score</div>
                              <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>
                                {hookScore.toFixed(1)}/10
                              </div>
                            </div>
                            <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '4px' }}>Retention Score</div>
                              <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>
                                {retentionScore.toFixed(1)}/10
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div style={{
                            background: 'rgba(239, 68, 68, 0.04)',
                            border: '1px solid rgba(239, 68, 68, 0.1)',
                            borderRadius: '10px',
                            padding: '12px',
                            textAlign: 'center',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#f87171',
                            marginBottom: '20px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            Incomplete Analysis
                          </div>
                        )}

                        {/* 5. Status Badge & Quick Actions footer */}
                        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '12px' }}>
                          <span className={`badge-status ${status.toLowerCase()}`}>
                            <span style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: 'currentColor',
                              boxShadow: '0 0 8px currentColor'
                            }} />
                            {status}
                          </span>

                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={(e) => handleDuplicateReport(item, e)}
                              className="card-action-btn"
                              title="Duplicate Report"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                            </button>

                            <button
                              onClick={(e) => handleDeleteReport(item.id, e)}
                              className="card-action-btn delete-btn"
                              title="Delete Report"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
              /* Filter Empty State (no search match) */
              <div style={{
                textAlign: 'center',
                padding: '60px var(--space-6)',
                background: 'rgba(255,255,255,0.01)',
                border: '1px dashed rgba(255,255,255,0.06)',
                borderRadius: '16px'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>🔍</div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  No matching reports found
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px', maxWidth: '380px', margin: '0 auto 20px' }}>
                  We couldn&apos;t find any creator analyses matching your current search filters or keywords.
                </p>
                <button onClick={clearFilters} className="btn bg-btn md-btn">Clear Search Filters</button>
              </div>
            )}
          </>
        ) : (
          /* Premium Absolute Empty State Illustration & CTA */
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', marginTop: '32px' }}>
            <p style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '20px', fontWeight: 600 }}>
              Recent Reports
            </p>
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                textAlign: 'center',
                padding: '100px 24px',
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid rgba(255,255,255,0.04)',
                borderRadius: '24px',
                maxWidth: '680px',
                width: '100%',
                margin: '0 auto',
                boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Stylized background glow grid */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '400px',
                height: '400px',
                background: 'radial-gradient(circle, rgba(124, 58, 237, 0.08) 0%, transparent 70%)',
                filter: 'blur(40px)',
                pointerEvents: 'none',
                zIndex: 0
              }} />

              {/* Glowing circular illustration */}
              <div style={{
                width: '96px',
                height: '96px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.2) 0%, rgba(124, 58, 237, 0.03) 100%)',
                border: '1px solid rgba(124, 58, 237, 0.3)',
                boxShadow: '0 0 30px rgba(124, 58, 237, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 28px',
                zIndex: 1,
                position: 'relative'
              }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              </div>

              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginBottom: '12px', zIndex: 1, position: 'relative', letterSpacing: '-0.02em' }}>
                No reports yet
              </h2>
              <p style={{ fontSize: '14.5px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: '32px', maxWidth: '420px', margin: '0 auto 32px', zIndex: 1, position: 'relative' }}>
                Run your first Creator Intelligence Analysis<br />
                to generate platform diagnostics,<br />
                hook scoring, retention analysis,<br />
                and creator recommendations.
              </p>
              
              <Link href="/analyze" className="btn bp md-btn text-glow-purple border-glow-purple" style={{ zIndex: 1, position: 'relative', padding: '12px 28px' }}>
                Start First Analysis
              </Link>
            </motion.div>
          </div>
        )}
      </div>
    </main>
  );
}

// ─── Auxiliary Premium Components ────────────────────────────────────

export function PlatformIcon({ platform, size = 16 }: { platform: string; size?: number }) {
  const p = platform?.toLowerCase() || '';
  if (p.includes('youtube')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#ef4444">
        <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.871.508 9.388.508 9.388.508s7.517 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    );
  }
  if (p.includes('tiktok')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#00f2fe">
        <path d="M12.525.024a1.25 1.25 0 0 0-1.25 1.25v16.14a4.19 4.19 0 1 1-5.44-4.04 1.25 1.25 0 0 0 1.05-1.23V7.276a1.25 1.25 0 0 0-1.39-1.24c-3.79.46-6.73 3.73-6.73 7.68 0 4.29 3.48 7.76 7.76 7.76s7.76-3.48 7.76-7.76V6.52A7.26 7.26 0 0 0 20.8.293a1.25 1.25 0 0 0-1.07.96 4.76 4.76 0 0 1-4.75 3.77h-.7v-3.75a1.25 1.25 0 0 0-1.25-1.25h-.5z" fill="#fff"/>
      </svg>
    );
  }
  if (p.includes('instagram') || p.includes('reels')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="url(#ig-grad-badge)" strokeWidth="2.5">
        <defs>
          <linearGradient id="ig-grad-badge" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f9ce34"/>
            <stop offset="50%" stopColor="#ee2a7b"/>
            <stop offset="100%" stopColor="#6228d7"/>
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

export function ReportThumbnail({ platform, score }: { platform: string; score: number }) {
  const p = platform?.toLowerCase() || '';
  let thumbClass = 'premium-thumb-generic';
  if (p.includes('youtube')) thumbClass = 'premium-thumb-youtube';
  else if (p.includes('tiktok')) thumbClass = 'premium-thumb-tiktok';
  else if (p.includes('instagram') || p.includes('reels')) thumbClass = 'premium-thumb-instagram';

  const barCount = 12;
  const bars = Array.from({ length: barCount }).map((_, i) => {
    // Generate heights that look like a nice sound wave/chart
    const h = Math.sin((i / (barCount - 1)) * Math.PI) * 45 + 15 + Math.random() * 15;
    const delay = (i * 0.12).toFixed(2);
    const color = p.includes('youtube') ? '#ef4444' : p.includes('tiktok') ? '#00f2fe' : p.includes('instagram') ? '#ee2a7b' : '#7c3aed';
    return (
      <div
        key={i}
        className="thumb-wave-bar"
        style={{
          '--bar-height': `${h}px`,
          '--bar-delay': `${delay}s`,
          '--bar-color': color,
          margin: '0 2px'
        } as any}
      />
    );
  });

  return (
    <div className={`premium-thumb-container ${thumbClass}`}>
      {/* Background glow circle */}
      <div style={{
        position: 'absolute',
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: p.includes('youtube') ? 'rgba(239, 68, 68, 0.15)' : p.includes('tiktok') ? 'rgba(0, 242, 254, 0.15)' : p.includes('instagram') ? 'rgba(238, 42, 123, 0.15)' : 'rgba(124, 58, 237, 0.15)',
        filter: 'blur(30px)',
        zIndex: 0
      }} />
      
      {/* Wave Bars Container */}
      <div style={{ display: 'flex', alignItems: 'center', height: '80px', zIndex: 1 }}>
        {bars}
      </div>

      {/* Floating Center Icon */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(6px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '6px',
        padding: '5px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2
      }}>
        <PlatformIcon platform={platform} size={13} />
      </div>

      {/* Floating Score Badge in Top-Left */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        background: 'rgba(15, 17, 34, 0.85)',
        backdropFilter: 'blur(4px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        padding: '3px 8px',
        fontSize: '11px',
        fontWeight: 800,
        color: score >= 8 ? '#4ade80' : score >= 5 ? '#facc15' : '#f87171',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        zIndex: 2,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)'
      }}>
        <span style={{
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          background: score >= 8 ? '#4ade80' : score >= 5 ? '#facc15' : '#f87171'
        }} />
        {score > 0 ? `${score.toFixed(1)} Pts` : '— Pts'}
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="glass-card-premium" style={{ minHeight: '350px' }}>
      <div className="skeleton-shimmer" style={{ width: '100%', height: '140px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', marginBottom: '16px' }} />
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        <div className="skeleton-shimmer" style={{ width: '60px', height: '18px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px' }} />
        <div className="skeleton-shimmer" style={{ width: '60px', height: '18px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px' }} />
      </div>
      <div className="skeleton-shimmer" style={{ width: '80%', height: '16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px', marginBottom: '8px' }} />
      <div className="skeleton-shimmer" style={{ width: '40%', height: '10px', background: 'rgba(255, 255, 255, 0.01)', borderRadius: '4px', marginBottom: '16px' }} />
      
      <div className="skeleton-shimmer" style={{ width: '100%', height: '48px', background: 'rgba(255, 255, 255, 0.015)', borderRadius: '10px', marginBottom: '20px' }} />
      
      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="skeleton-shimmer" style={{ width: '70px', height: '18px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '100px' }} />
        <div className="skeleton-shimmer" style={{ width: '32px', height: '32px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px' }} />
      </div>
    </div>
  );
}
