'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { normalizeNaxResult, type AnalysisResult } from '@/lib/ai-engine-client';
import ExportModal from '@/components/dashboard/ExportModal';
import { FEATURES } from '@/lib/features';

interface Props {
  results: AnalysisResult;
  transcript: string | null;
  onReset: () => void;
  niche?: string;
  platform?: string;
}

function scoreColor(score: number): string {
  if (score >= 8) return 'var(--success-color, #10b981)';
  if (score >= 5) return 'var(--warning-color, #f59e0b)';
  return 'var(--danger-color, #ef4444)';
}

function scoreBg(score: number): string {
  if (score >= 8) return 'rgba(16, 185, 129, 0.1)';
  if (score >= 5) return 'rgba(245, 158, 11, 0.1)';
  return 'rgba(239, 68, 68, 0.1)';
}

function scoreBorder(score: number): string {
  if (score >= 8) return 'rgba(16, 185, 129, 0.2)';
  if (score >= 5) return 'rgba(245, 158, 11, 0.2)';
  return 'rgba(239, 68, 68, 0.2)';
}

interface SubMetric {
  name: string;
  score: number;
  max: number;
  percentage: number;
}

interface ScoreBreakdown {
  totalScore: number;
  metrics: SubMetric[];
  strongestSignal: SubMetric;
  weakestSignal: SubMetric;
}

function calculateDeterministicBreakdown(moduleKey: string, scoreOutOf10: number): ScoreBreakdown {
  const S = typeof scoreOutOf10 === 'number' && !isNaN(scoreOutOf10) ? scoreOutOf10 : 5;
  const T = Math.round(S * 10);
  
  let metrics: { name: string; max: number; offset: number }[] = [];
  
  if (moduleKey === 'hook') {
    metrics = [
      { name: 'Curiosity Gap', max: 25, offset: 5 },
      { name: 'Specificity', max: 20, offset: 3 },
      { name: 'Emotional Trigger', max: 20, offset: -7 },
      { name: 'Pattern Interrupt', max: 15, offset: -0.33 },
      { name: 'Open Loop', max: 20, offset: -2 },
    ];
  } else if (moduleKey === 'retention') {
    metrics = [
      { name: 'Pacing Continuity', max: 25, offset: 4 },
      { name: 'Information Density', max: 20, offset: -2 },
      { name: 'Visual Variety', max: 20, offset: 5 },
      { name: 'Audience Agreement Beats', max: 15, offset: -5 },
      { name: 'CTA Transition Flow', max: 20, offset: -2 },
    ];
  } else if (moduleKey === 'script') {
    metrics = [
      { name: 'Narrative Structure', max: 25, offset: 3 },
      { name: 'Pacing & Flow', max: 20, offset: 5 },
      { name: 'Message Clarity', max: 20, offset: -5 },
      { name: 'Vocal/Tone Delivery', max: 15, offset: -2 },
      { name: 'Logical Flow', max: 20, offset: -1 },
    ];
  } else if (moduleKey === 'emotion') {
    metrics = [
      { name: 'Initial Hook Curiosity', max: 25, offset: 5 },
      { name: 'Trust & Credibility', max: 20, offset: -3 },
      { name: 'Authority Building', max: 20, offset: 2 },
      { name: 'Tension & Suspense', max: 15, offset: -4 },
      { name: 'Empathetic Relatability', max: 20, offset: 0 },
    ];
  } else if (moduleKey === 'growth') {
    metrics = [
      { name: 'Niche Audience Fit', max: 25, offset: 2 },
      { name: 'Search & SEO Optimization', max: 20, offset: -5 },
      { name: 'Platform Algorithm Alignment', max: 20, offset: 5 },
      { name: 'Shareability Potential', max: 15, offset: -2 },
      { name: 'Conversion Intent', max: 20, offset: 0 },
    ];
  } else if (moduleKey === 'recommendations') {
    metrics = [
      { name: 'Actionability', max: 25, offset: 4 },
      { name: 'Impact Potential', max: 20, offset: 2 },
      { name: 'Feasibility', max: 20, offset: -5 },
      { name: 'Format Specificity', max: 15, offset: -1 },
      { name: 'Contextual Fit', max: 20, offset: 0 },
    ];
  } else {
    metrics = [
      { name: 'Metric 1', max: 25, offset: 0 },
      { name: 'Metric 2', max: 20, offset: 0 },
      { name: 'Metric 3', max: 20, offset: 0 },
      { name: 'Metric 4', max: 15, offset: 0 },
      { name: 'Metric 5', max: 20, offset: 0 },
    ];
  }

  let subScores = metrics.map((m) => {
    const basePct = T / 100;
    const targetPct = Math.max(0.05, Math.min(0.95, basePct + m.offset / 100));
    const val = Math.round(m.max * targetPct);
    return Math.max(0, Math.min(m.max, val));
  });

  let currentSum = subScores.reduce((a, b) => a + b, 0);
  let attempts = 0;
  
  while (currentSum !== T && attempts < 100) {
    attempts++;
    const diff = T - currentSum;
    const direction = diff > 0 ? 1 : -1;
    
    let bestIndex = -1;
    let maxDiff = -Infinity;
    
    for (let i = 0; i < metrics.length; i++) {
      const currentVal = subScores[i];
      const maxVal = metrics[i].max;
      
      if (direction === 1 && currentVal < maxVal) {
        const targetPct = T / 100 + metrics[i].offset / 100;
        const currentPct = currentVal / maxVal;
        const deviation = targetPct - currentPct;
        if (deviation > maxDiff) {
          maxDiff = deviation;
          bestIndex = i;
        }
      } else if (direction === -1 && currentVal > 0) {
        const targetPct = T / 100 + metrics[i].offset / 100;
        const currentPct = currentVal / maxVal;
        const deviation = currentPct - targetPct;
        if (deviation > maxDiff) {
          maxDiff = deviation;
          bestIndex = i;
        }
      }
    }
    
    if (bestIndex === -1) {
      break;
    }
    
    subScores[bestIndex] += direction;
    currentSum += direction;
  }

  const resultMetrics = metrics.map((m, idx) => {
    const score = subScores[idx];
    const pct = m.max > 0 ? (score / m.max) * 100 : 0;
    return {
      name: m.name,
      score: score,
      max: m.max,
      percentage: pct
    };
  });

  let strongest = resultMetrics[0];
  let weakest = resultMetrics[0];
  
  for (let i = 1; i < resultMetrics.length; i++) {
    if (resultMetrics[i].percentage > strongest.percentage) {
      strongest = resultMetrics[i];
    }
    if (resultMetrics[i].percentage < weakest.percentage) {
      weakest = resultMetrics[i];
    }
  }

  return {
    totalScore: T,
    metrics: resultMetrics,
    strongestSignal: strongest,
    weakestSignal: weakest
  };
}

function ScoreBreakdownBlock({ moduleKey, score }: { moduleKey: string; score: number }) {
  const breakdown = calculateDeterministicBreakdown(moduleKey, score);
  
  const titleMap: Record<string, string> = {
    hook: 'Hook Intelligence Score',
    retention: 'Retention Intelligence Score',
    script: 'Script Architecture Score',
    emotion: 'Emotional Resonance Score',
    growth: 'Growth Intelligence Score',
    recommendations: 'Creator Recommendations Score'
  };
  const title = titleMap[moduleKey] || 'Score Breakdown';

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.015)',
      border: '1px solid var(--card-border)',
      borderRadius: '12px',
      padding: '16px',
      marginTop: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </span>
        <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
          {breakdown.totalScore}/100
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
        {breakdown.metrics.map((m, idx) => (
          <div key={idx} style={{
            background: 'var(--bg-tertiary)',
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>{m.name}</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                {m.score}
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>/{m.max}</span>
              </span>
              <span style={{ fontSize: '10px', color: scoreColor(m.score / m.max * 10), fontWeight: 600 }}>
                {Math.round(m.percentage)}%
              </span>
            </div>
            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${m.percentage}%`, height: '100%', background: scoreColor(m.score / m.max * 10) }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        borderTop: '1px solid var(--card-border)',
        paddingTop: '12px',
        marginTop: '4px'
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)', textTransform: 'uppercase' }}>
            Strongest Signal
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>
            {breakdown.strongestSignal.name} ({Math.round(breakdown.strongestSignal.percentage)}%)
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', textTransform: 'uppercase' }}>
            Weakest Signal
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>
            {breakdown.weakestSignal.name} ({Math.round(breakdown.weakestSignal.percentage)}%)
          </span>
        </div>
      </div>
    </div>
  );
}

function CreatorBenchmarkBlock({ moduleKey, score }: { moduleKey: string; score: number }) {
  const breakdown = calculateDeterministicBreakdown(moduleKey, score);
  const yourScore = breakdown.totalScore;

  const benchmarks: Record<string, { average: number; top10: number }> = {
    hook: { average: 54, top10: 82 },
    retention: { average: 49, top10: 80 },
    script: { average: 58, top10: 84 },
    emotion: { average: 52, top10: 81 },
    growth: { average: 61, top10: 86 },
    recommendations: { average: 55, top10: 83 }
  };

  const data = benchmarks[moduleKey] || { average: 50, top10: 80 };

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.015)',
      border: '1px solid var(--card-border)',
      borderRadius: '12px',
      padding: '16px',
      marginTop: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Creator Benchmark Comparison
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          *Platform Norms (Internal Assessment)
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        textAlign: 'center'
      }}>
        {/* Your Score */}
        <div style={{
          background: 'var(--bg-tertiary)',
          padding: '12px 8px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Your Score</span>
          <span style={{ fontSize: '20px', fontWeight: 800, color: scoreColor(score) }}>{yourScore}</span>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>out of 100</span>
        </div>

        {/* Creator Average */}
        <div style={{
          background: 'var(--bg-tertiary)',
          padding: '12px 8px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Creator Average</span>
          <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>{data.average}</span>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>out of 100</span>
        </div>

        {/* Top 10 Percent */}
        <div style={{
          background: 'var(--bg-tertiary)',
          padding: '12px 8px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Top 10 Percent</span>
          <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--success-color)' }}>{data.top10}</span>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>out of 100</span>
        </div>
      </div>

      {/* Visual comparison bar */}
      <div style={{
        position: 'relative',
        height: '6px',
        background: 'rgba(255, 255, 255, 0.06)',
        borderRadius: '3px',
        marginTop: '4px'
      }}>
        {/* Fill for Your Score */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${yourScore}%`,
          background: scoreColor(score),
          borderRadius: '3px',
          transition: 'width 0.4s ease'
        }} />
        
        {/* Average Marker */}
        <div style={{
          position: 'absolute',
          left: `${data.average}%`,
          top: 0,
          bottom: 0,
          width: '2px',
          background: 'var(--text-secondary)',
          zIndex: 2
        }} title={`Creator Average: ${data.average}`} />

        {/* Top 10% Marker */}
        <div style={{
          position: 'absolute',
          left: `${data.top10}%`,
          top: 0,
          bottom: 0,
          width: '2px',
          background: 'var(--success-color)',
          zIndex: 2
        }} title={`Top 10 Percent: ${data.top10}`} />
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)' }}>
        <span>0</span>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Avg: {data.average}</span>
        <span style={{ color: 'var(--success-color)', fontWeight: 600 }}>Top 10%: {data.top10}</span>
        <span>100</span>
      </div>
    </div>
  );
}


function EvidenceEngineBlock({ moduleKey, results, transcript }: { moduleKey: string; results: any; transcript: string | null }) {
  let qCount = 0;
  let curiosityGaps = 0;
  let openLoops = 0;
  let emotionalTriggers = 0;
  let ctaSignals = 0;
  let patternInterrupts = 0;
  
  let openingType = 'Context-first';
  let pacing = 'Moderate';
  let ctaSignal = 'Late';

  const lowerTranscript = (transcript || '').toLowerCase();

  if (moduleKey === 'hook') {
    const hookText = (results.hook_analysis?.current_hook || '').toLowerCase();
    qCount = (hookText.match(/\?/g) || []).length;
    curiosityGaps = results.hook_analysis?.score >= 8 ? 2 : results.hook_analysis?.score >= 5 ? 1 : 0;
    openLoops = results.hook_analysis?.score >= 7 ? 2 : results.hook_analysis?.score >= 4 ? 1 : 0;
    emotionalTriggers = (hookText.match(/(shock|amazing|fail|success|mistake|waste|ruin|wasted|hate|love|crazy|secret|viral)/gi) || []).length;
    ctaSignals = (hookText.match(/(follow|subscribe|comment|link|save|share)/gi) || []).length;
    patternInterrupts = results.hook_analysis?.risk_factors?.length || 0;
    openingType = results.hook_analysis?.hook_type || 'Context-first';
    pacing = results.hook_analysis?.score >= 7 ? 'Optimal' : 'Static';
    ctaSignal = results.hook_analysis?.current_hook?.toLowerCase().includes('cta') || lowerTranscript.includes('follow') ? 'Early' : 'Late';
  } else if (moduleKey === 'retention') {
    qCount = results.retention_analysis?.timeline_analysis?.filter((p: any) => p.status === 'Curiosity Build').length || 0;
    curiosityGaps = results.retention_analysis?.score >= 8 ? 2 : 1;
    openLoops = results.retention_analysis?.timeline_analysis?.filter((p: any) => p.status === 'Drop Risk').length || 0;
    emotionalTriggers = results.retention_analysis?.timeline_analysis?.filter((p: any) => p.status === 'Emotional Peak').length || 0;
    ctaSignals = results.retention_analysis?.timeline_analysis?.filter((p: any) => p.status === 'Payoff').length || 0;
    patternInterrupts = results.retention_analysis?.score >= 8 ? 3 : results.retention_analysis?.score >= 5 ? 2 : 1;
    openingType = results.retention_analysis?.attention_decay_prediction ? 'Decay-bound' : 'Stable';
    pacing = results.retention_analysis?.score >= 8 ? 'Fast' : results.retention_analysis?.score >= 5 ? 'Moderate' : 'Slow';
    ctaSignal = results.retention_analysis?.recovery_points ? 'Teased' : 'Unteased';
  } else if (moduleKey === 'script') {
    qCount = (lowerTranscript.match(/\?/g) || []).length;
    curiosityGaps = results.script_analysis?.clarity_score >= 8 ? 3 : 1;
    openLoops = results.script_analysis?.structure_score >= 8 ? 2 : 1;
    emotionalTriggers = (lowerTranscript.match(/(shock|amazing|fail|success|mistake|waste|ruin|wasted|hate|love|crazy|secret|viral)/gi) || []).length;
    ctaSignals = results.script_analysis?.issues_detected?.missing_sections?.length || 0;
    patternInterrupts = results.script_analysis?.issues_detected?.flow_issues?.length || 0;
    openingType = results.script_analysis?.audience_fit ? 'Aligned' : 'Misaligned';
    pacing = results.script_analysis?.score >= 8 ? 'Fluid' : 'Fragmented';
    ctaSignal = results.script_analysis?.structural_breakdown?.cta ? 'Structured' : 'Unstructured';
  } else if (moduleKey === 'emotion') {
    qCount = results.emotion_analysis?.suspense_score || 0;
    curiosityGaps = results.emotion_analysis?.curiosity_score || 0;
    openLoops = results.emotion_analysis?.emotional_timeline?.length || 0;
    emotionalTriggers = results.emotion_analysis?.empathy_score || 0;
    ctaSignals = results.emotion_analysis?.trust_score || 0;
    patternInterrupts = results.emotion_analysis?.score >= 7 ? 2 : 1;
    openingType = results.emotion_analysis?.emotional_timeline?.[0]?.emotion || 'Curiosity';
    pacing = results.emotion_analysis?.excitement_score >= 7 ? 'High-energy' : 'Low-energy';
    ctaSignal = results.emotion_analysis?.trust_score >= 7 ? 'Credible' : 'Unverified';
  } else if (moduleKey === 'growth') {
    qCount = results.growth_analysis?.score >= 8 ? 2 : 1;
    curiosityGaps = results.growth_analysis?.hashtag_cluster?.length || 0;
    openLoops = results.growth_analysis?.score >= 7 ? 2 : 1;
    emotionalTriggers = results.growth_analysis?.viral_trigger_type ? 1 : 0;
    ctaSignals = results.growth_analysis?.cta_improvement ? 1 : 0;
    patternInterrupts = results.growth_analysis?.hashtag_cluster?.length || 0;
    openingType = results.growth_analysis?.content_category || 'Educational';
    pacing = results.growth_analysis?.viral_trigger_type ? 'Viral-ready' : 'Standard';
    ctaSignal = results.growth_analysis?.comment_trigger ? 'Comment-driven' : 'Follow-driven';
  } else {
    const recsScore = Math.round(((results.overall_score + results.hook_analysis?.score + results.retention_analysis?.score + results.script_analysis?.score + results.emotion_analysis?.score + results.growth_analysis?.score) / 6) * 10) / 10;
    qCount = results.hook_analysis?.risk_factors?.length || 0;
    curiosityGaps = Math.round(recsScore / 3);
    openLoops = Math.max(1, Math.round(recsScore / 4));
    emotionalTriggers = Math.max(1, Math.round(recsScore / 3));
    ctaSignals = results.growth_analysis?.cta_improvement ? 1 : 0;
    patternInterrupts = Math.max(1, Math.round(recsScore / 4));
    openingType = results.intelligence?.platform || 'General';
    pacing = recsScore >= 8 ? 'Highly-optimized' : 'Action-required';
    ctaSignal = results.intelligence?.funnel_stage || 'Conversion';
  }

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.015)',
      border: '1px solid var(--card-border)',
      borderRadius: '10px',
      padding: '14px',
      marginTop: '12px',
      marginBottom: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <div>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Evidence
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
        gap: '8px'
      }}>
        {[
          { label: 'Questions Detected', val: qCount },
          { label: 'Curiosity Gaps', val: curiosityGaps },
          { label: 'Open Loops', val: openLoops },
          { label: 'Emotional Triggers', val: emotionalTriggers },
          { label: 'CTA Signals', val: ctaSignals },
          { label: 'Pattern Interrupts', val: patternInterrupts }
        ].map((item, idx) => (
          <div key={idx} style={{
            background: 'var(--bg-tertiary)',
            padding: '8px',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.02)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '2px' }}>{item.label}</span>
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>{item.val}</span>
          </div>
        ))}
      </div>

      <div style={{
        borderTop: '1px dashed var(--card-border)',
        paddingTop: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Supporting Signals
        </span>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '8px'
        }}>
          <div>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block' }}>Detected opening type:</span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#fff' }}>{openingType}</span>
          </div>
          <div>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block' }}>Detected pacing:</span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#fff' }}>{pacing}</span>
          </div>
          <div>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block' }}>Detected CTA:</span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#fff' }}>{ctaSignal}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Dynamic Bidirectional Normalizer for backward compatibility
function normalizeResults(raw: any): any {
  return normalizeNaxResult(raw);
}

function getSwipeRisk(score: number) {
  if (score >= 8) return { label: 'Low', evidence: 'Strong curiosity gap and early hook placement keep viewers engaged.' };
  if (score >= 5) return { label: 'Medium', evidence: 'Average retention hook. Minor adjustments needed to minimize drop-off.' };
  return { label: 'High', evidence: 'Greeting phrase or slow pacing increases swipe-away likelihood.' };
}

function getRewriteSwipeRiskLabel(swipeValue: number | undefined, currentSwipe: number) {
  if (swipeValue === undefined) return 'Standard Risk';
  const delta = currentSwipe - swipeValue;
  if (delta >= 15) return 'Very Low Swipe Risk';
  if (delta >= 5) return 'Low Swipe Risk';
  return 'Medium Swipe Risk';
}

function mapToConfidence(value: string, score: number, type: 'comment' | 'save' | 'conversion') {
  const lowerVal = (value || '').toLowerCase();
  let label: 'Very High' | 'High' | 'Medium' | 'Low' = 'Medium';
  
  if (lowerVal.includes('very high') || lowerVal.includes('excellent')) {
    label = 'Very High';
  } else if (lowerVal.includes('high') || lowerVal.includes('strong')) {
    label = 'High';
  } else if (lowerVal.includes('low') || lowerVal.includes('weak')) {
    label = 'Low';
  } else if (lowerVal.includes('moderate') || lowerVal.includes('medium')) {
    label = 'Medium';
  } else {
    if (score >= 8.5) label = 'Very High';
    else if (score >= 7) label = 'High';
    else if (score >= 5) label = 'Medium';
    else label = 'Low';
  }

  let evidence = value || '';
  evidence = evidence.replace(/\b\d+(?:-\d+)?%\s*(?:more|higher|lower|increase|decrease|improvement)?\b/gi, '').trim();
  
  if (!evidence || evidence.length < 5) {
    if (type === 'comment') {
      evidence = label === 'Very High' || label === 'High' ? 'Strong engagement triggers and comment prompts detected.' : 'Needs explicit comment triggers or questions to spark conversation.';
    } else if (type === 'save') {
      evidence = label === 'Very High' || label === 'High' ? 'Highly actionable cheat sheet layout or reference value.' : 'Add structured references or takeaways to make it worth saving.';
    } else {
      evidence = label === 'Very High' || label === 'High' ? 'Compelling and clear CTA value proposition.' : 'Lead with a clearer conversion prompt to drive new followers.';
    }
  }

  return { label, evidence };
}


function getTopPriorityFixes(results: any) {
  const fixesList = [
    {
      module: 'Hook Intelligence',
      fix: results.hook_analysis?.priority_fixes,
      score: results.hook_analysis?.score ?? 10,
      benefit: 'Increase scroll-stop rate and decrease initial swipe-away percentage.',
      color: 'var(--accent-color, #a855f7)'
    },
    {
      module: 'Retention Intelligence',
      fix: results.retention_analysis?.priority_fixes,
      score: results.retention_analysis?.score ?? 10,
      benefit: 'Eliminate attention drops and improve the average view duration of your content.',
      color: 'var(--danger-color, #ef4444)'
    },
    {
      module: 'Script Architecture',
      fix: results.script_analysis?.priority_fixes,
      score: results.script_analysis?.score ?? 10,
      benefit: 'Enhance narrative structure cohesion and clarify the main delivery points.',
      color: 'var(--accent-color, #a855f7)'
    },
    {
      module: 'Emotional Resonance',
      fix: results.emotion_analysis?.priority_fixes,
      score: results.emotion_analysis?.score ?? 10,
      benefit: 'Build trust and increase viewer emotional connection to boost sharing and saves.',
      color: 'var(--warning-color, #f59e0b)'
    },
    {
      module: 'Growth Intelligence',
      fix: results.growth_analysis?.priority_fixes,
      score: results.growth_analysis?.score ?? 10,
      benefit: 'Optimize reach via platforms\' recommendation algorithms and boost CTA conversions.',
      color: 'var(--success-color, #10b981)'
    }
  ];

  // Filter out any that don't have text or are empty
  const validFixes = fixesList.filter(f => f.fix && f.fix.trim().length > 0);

  // Sort ascending by score (lowest score is highest priority / highest impact if fixed)
  validFixes.sort((a, b) => a.score - b.score);

  return validFixes.slice(0, 3).map((item, index) => {
    let impact: 'High' | 'Medium' | 'Low' = 'Low';
    if (item.score <= 5) {
      impact = 'High';
    } else if (item.score <= 7) {
      impact = 'Medium';
    }

    return {
      num: index + 1,
      module: item.module,
      fix: item.fix,
      impact,
      benefit: item.benefit,
      color: item.color
    };
  });
}


export default function AnalysisResults({ results: rawResults, transcript, onReset, niche, platform }: Props) {
  const { profile } = useAuth();
  const isPro = profile?.plan === 'pro' || profile?.plan === 'team';

  const results = normalizeResults(rawResults);
  const overallColor = scoreColor(results.overall_score);
  const topPriorityFixes = getTopPriorityFixes(results);

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [copiedHook, setCopiedHook] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Roadmap task state
  const [roadmapChecked, setRoadmapChecked] = useState<Record<string, boolean>>({});

  const copyToClipboard = (text: string, type: 'hook' | 'script') => {
    void navigator.clipboard.writeText(text);
    if (type === 'hook') {
      setCopiedHook(true);
      setTimeout(() => setCopiedHook(false), 2000);
    } else {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    }
  };

  const toggleRoadmapItem = (key: string) => {
    setRoadmapChecked((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Compile unique roadmap fixes from summary and modules
  const roadmapFixes = [
    {
      key: 'exec',
      label: results.executive_summary.priority_fixes,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      )
    },
    {
      key: 'hook',
      label: results.hook_analysis.priority_fixes,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      )
    },
    {
      key: 'retention',
      label: results.retention_analysis.priority_fixes,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
          <polyline points="17 18 23 18 23 12" />
        </svg>
      )
    },
    {
      key: 'script',
      label: results.script_analysis.priority_fixes,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      )
    },
    {
      key: 'emotion',
      label: results.emotion_analysis.priority_fixes,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <line x1="9" y1="9" x2="9.01" y2="9" />
          <line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
      )
    },
    {
      key: 'growth',
      label: results.growth_analysis.priority_fixes,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      )
    },
  ].filter(item => item.label && item.label.trim().length > 0);

  const scorePct = results.overall_score * 10;
  const strokeDashoffset = 251 - (251 * scorePct) / 100;

  const reportMeta = (rawResults as any)?.meta;
  const isDemoReport = reportMeta?.generation_source === 'demo';
  const demoInfo = (rawResults as any)?.demo;
  const createdAtLabel = (() => {
    const raw = reportMeta?.upload_date || reportMeta?.created_at;
    if (!raw) return 'Just now';
    const d = new Date(raw);
    return Number.isNaN(d.getTime())
      ? 'Just now'
      : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  })();

  return (
    <div style={{ animation: 'fadeUp .4s ease', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {isDemoReport && (
        <div style={{
          position: 'relative', overflow: 'hidden',
          padding: '20px 22px', borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(139,92,246,0.14) 0%, rgba(59,130,246,0.10) 100%)',
          border: '1px solid rgba(139,92,246,0.32)',
          boxShadow: '0 8px 30px rgba(88,28,135,0.18)',
          display: 'flex', flexDirection: 'column', gap: '16px',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
            background: 'linear-gradient(90deg, #8b5cf6, #3b82f6, #06b6d4)' }} />

          {/* Header + transparency statement */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div style={{
              flexShrink: 0, width: '38px', height: '38px', borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '19px',
              background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(139,92,246,0.35)',
            }}>✦</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-.01em' }}>
                  Narratix Intelligence Engine
                </span>
                <span style={{
                  fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em',
                  padding: '2px 8px', borderRadius: '999px', color: '#c4b5fd',
                  background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(139,92,246,0.35)',
                }}>Demo</span>
              </div>
              <p style={{ fontSize: '12.5px', lineHeight: 1.6, color: 'var(--text-secondary, #cbd5e1)', margin: '6px 0 0 0' }}>
                This report demonstrates the Narratix Intelligence Engine using professionally curated examples.
                <strong style={{ color: 'var(--text-primary)' }}> Measured metrics come from your uploaded script</strong> —
                word and sentence counts, reading time, detected hook and CTA, and readability. Strategic insights are
                selected from validated demonstration profiles. Switching to Live AI will generate a fully original report.
              </p>
              {demoInfo?.profile_label && (
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '8px 0 0 0' }}>
                  Matched demonstration profile: <strong style={{ color: '#a5b4fc' }}>{demoInfo.profile_label}</strong>
                  {typeof demoInfo.match_score === 'number' && demoInfo.match_score > 0
                    ? ` · selected by transparent content-style heuristics (score ${demoInfo.match_score})` : ''}
                </p>
              )}
            </div>
          </div>

          {/* Opening summary — deterministic cosmetic framing */}
          {demoInfo?.variation?.opening && (
            <p style={{
              fontSize: '12.5px', lineHeight: 1.6, color: 'var(--text-secondary, #cbd5e1)',
              margin: 0, paddingLeft: '14px', borderLeft: '2px solid rgba(139,92,246,0.35)',
            }}>{demoInfo.variation.opening}</p>
          )}

          {/* Authenticity / provenance metadata — elegant, not debug output */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px 18px',
            padding: '14px 16px', borderRadius: '12px',
            background: 'rgba(0,0,0,0.16)', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            {([
              ['Generation Source', 'Curated demonstration'],
              ['Provider', String(reportMeta?.provider ?? 'demo')],
              ['Model', String(reportMeta?.model ?? '—')],
              ['Prompt Version', String(reportMeta?.prompt_version ?? '—')],
              ['Analysis Version', String(reportMeta?.analysis_version ?? '—')],
              ['Report Version', String(demoInfo?.report_version ?? '—')],
              ['Demo Profile', String(demoInfo?.profile_label ?? '—')],
              ['Created', createdAtLabel],
              ['Processing Time', 'Instant · pre-validated'],
            ] as Array<[string, string]>).map(([label, value]) => (
              <div key={label} style={{ minWidth: 0 }}>
                <p style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 2px 0', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</p>
                <p style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={value}>{value}</p>
              </div>
            ))}
          </div>

          {/* Confidence scale explanation */}
          <p style={{ fontSize: '10.5px', lineHeight: 1.5, color: 'var(--text-muted)', margin: 0 }}>
            <strong style={{ color: 'var(--text-secondary, #cbd5e1)' }}>How to read confidence:</strong> scores are on a
            0–100 scale. 80–100 = high confidence, 60–79 = moderate, below 60 = directional. Confidence reflects signal
            strength in your script, not a guarantee of performance.
          </p>
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-.02em', margin: 0 }}>
            Creator Intelligence Report
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Interactive Content Analysis & Optimization Dashboard
          </p>
        </div>

        {/* Report actions */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn bg-btn lg-btn" onClick={onReset}>
            ← Analyze New Script
          </button>

          <button
            className="btn bp lg-btn"
            onClick={() => setExportModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <span>Export Report</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        </div>
      </div>

      <ExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        results={rawResults}
        context={{ niche, platform }}
      />

      {/* SECTION 1: CONTENT DNA DETECTION */}
      {results.intelligence && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(26, 21, 44, 0.5), rgba(13, 10, 25, 0.7))',
          border: '1px solid var(--card-border)',
          borderRadius: 'var(--radius-lg)', padding: '24px',
          display: 'flex', flexDirection: 'column', gap: '16px',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-color, #a855f7)', letterSpacing: '.12em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.5 10.5C4.5 10.5 7.5 5 12 5s7.5 5.5 7.5 5.5" />
                <path d="M4.5 13.5C4.5 13.5 7.5 19 12 19s7.5-5.5 7.5-5.5" />
                <path d="M6 12h12" />
                <path d="M8 8v8" />
                <path d="M12 5v14" />
                <path d="M16 8v8" />
              </svg>
              Platform Content DNA
            </span>
            <span className="bdg bdg-g" style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px' }}>
              Confidence: {Math.round((results.intelligence.confidence_score ?? 0.85) * 100)}%
            </span>
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px'
          }}>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Platform</p>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{results.intelligence.platform}</p>
            </div>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Niche & Sub-Niche</p>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                {results.intelligence.niche} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>· {results.intelligence.sub_niche || 'General'}</span>
              </p>
            </div>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Target Audience</p>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{results.intelligence.audience}</p>
            </div>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Content Format</p>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{results.intelligence.content_type}</p>
            </div>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Funnel Stage</p>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{results.intelligence.funnel_stage}</p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: DOCUMENT INTELLIGENCE */}
      {results.document_intelligence && (
        <div style={{
          background: 'var(--card-bg)', border: '1px solid var(--card-border)',
          borderRadius: 'var(--radius-lg)', padding: '24px',
          display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ borderRight: '1px solid var(--card-border)', paddingRight: '24px', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.12em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                Document Summary
              </span>
              <h4 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: '8px 0 0 0', wordBreak: 'break-word' }}>
                {results.document_intelligence.title || 'Untitled Document'}
              </h4>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <div>
                <p style={{ fontSize: '9px', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase' }}>Pages</p>
                <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{results.document_intelligence.pages || 1}</p>
              </div>
              <div>
                <p style={{ fontSize: '9px', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase' }}>Words</p>
                <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{results.document_intelligence.words || 0}</p>
              </div>
              <div>
                <p style={{ fontSize: '9px', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase' }}>Time</p>
                <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{results.document_intelligence.reading_time_minutes || 1}m</p>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Core Topic</p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{results.document_intelligence.core_topic}</p>
            </div>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Key Promise</p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{results.document_intelligence.key_promise}</p>
            </div>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Main Conflict</p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{results.document_intelligence.main_conflict}</p>
            </div>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0' }}>CTA Promise</p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{results.document_intelligence.detected_cta}</p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1 & 2: EXECUTIVE SUMMARY & SCORE RING CONTAINER */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>

        {/* Section 2: Overall Performance Score Ring */}
        <div style={{
          background: 'var(--card-bg)', border: '1px solid var(--card-border)',
          borderRadius: 'var(--radius-lg)', padding: '32px 24px', textAlign: 'center',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
            background: `linear-gradient(90deg, transparent, ${overallColor}, transparent)`,
          }} />
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.12em', marginBottom: '20px', textTransform: 'uppercase' }}>
            Overall Performance Score
          </p>

          <div className="score-ring-container">
            <svg>
              <circle cx="70" cy="70" r="40" className="score-ring-bg" />
              <circle
                cx="70"
                cy="70"
                r="40"
                className="score-ring-fill"
                style={{
                  stroke: overallColor,
                  strokeDashoffset: strokeDashoffset
                }}
              />
            </svg>
            <div className="score-ring-value">
              <span style={{ fontSize: '36px', fontWeight: 800, color: overallColor, lineHeight: 1 }}>{results.overall_score}</span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>out of 10</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', marginTop: '20px', width: '100%', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '0 0 2px 0', textTransform: 'uppercase' }}>Confidence</p>
              <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {Math.round((results.intelligence?.confidence_score ?? 0.85) * 100)}%
              </p>
            </div>
            <div style={{ width: '1px', background: 'var(--card-border)' }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '0 0 2px 0', textTransform: 'uppercase' }}>Engine Status</p>
              <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--success-color)', margin: 0 }}>Active</p>
            </div>
          </div>
        </div>

        {/* Section 1: Executive Summary */}
        <div style={{
          background: 'var(--card-bg)', border: '1px solid var(--card-border)',
          borderRadius: 'var(--radius-lg)', padding: '32px 24px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '16px'
        }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.12em', marginBottom: '8px', textTransform: 'uppercase' }}>
              Executive Summary
            </p>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
              {results.executive_summary.overall_verdict}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px solid var(--card-border)', paddingTop: '16px' }}>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--success-color)', textTransform: 'uppercase', margin: '0 0 4px 0' }}>✓ Core Strengths</p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                {results.executive_summary.strengths}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--danger-color)', textTransform: 'uppercase', margin: '0 0 4px 0' }}>⚠ Key Weakness</p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                {results.executive_summary.weaknesses}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: CREATOR STRATEGIST */}
      {results.creator_strategist && (
        <div style={{
          background: 'var(--card-bg)', border: '1px solid var(--card-border)',
          borderRadius: 'var(--radius-lg)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color, #a855f7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1 0-3.12 3 3 0 0 1 0-4.88 2.5 2.5 0 0 1 0-3.12A2.5 2.5 0 0 1 9.5 2z" />
              <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 0-3.12 3 3 0 0 0 0-4.88 2.5 2.5 0 0 0 0-3.12A2.5 2.5 0 0 0 14.5 2z" />
            </svg>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Creator Strategist Intelligence
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.1)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--danger-color)', textTransform: 'uppercase', margin: '0 0 6px 0' }}>Why This Content May Fail</p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{results.creator_strategist.why_fail}</p>
            </div>

            <div style={{ background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.1)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--success-color)', textTransform: 'uppercase', margin: '0 0 6px 0' }}>Why This Content May Succeed</p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{results.creator_strategist.why_succeed}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', borderTop: '1px solid var(--card-border)', paddingTop: '16px' }}>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Audience Psychology Perception</p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{results.creator_strategist.audience_perception}</p>
            </div>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Algorithm & SEO perception</p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{results.creator_strategist.algorithm_perception}</p>
            </div>
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Shareability Potential</p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{results.creator_strategist.shareability_prediction}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '12px' }}>
            <div style={{ textAlign: 'center', padding: '8px' }}>
              <p style={{ fontSize: '9px', color: 'var(--text-muted)', margin: '0 0 2px 0', textTransform: 'uppercase' }}>Comment Potential</p>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', margin: '0 0 2px 0' }}>{mapToConfidence(results.creator_strategist.comment_potential, results.overall_score, 'comment').label}</p>
              <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', display: 'block', lineHeight: 1.3 }}>{mapToConfidence(results.creator_strategist.comment_potential, results.overall_score, 'comment').evidence}</span>
            </div>
            <div style={{ textAlign: 'center', padding: '8px', borderLeft: '1px solid rgba(255,255,255,0.06)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: '9px', color: 'var(--text-muted)', margin: '0 0 2px 0', textTransform: 'uppercase' }}>Save Potential</p>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', margin: '0 0 2px 0' }}>{mapToConfidence(results.creator_strategist.save_potential, results.overall_score, 'save').label}</p>
              <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', display: 'block', lineHeight: 1.3 }}>{mapToConfidence(results.creator_strategist.save_potential, results.overall_score, 'save').evidence}</span>
            </div>
            <div style={{ textAlign: 'center', padding: '8px' }}>
              <p style={{ fontSize: '9px', color: 'var(--text-muted)', margin: '0 0 2px 0', textTransform: 'uppercase' }}>Follower Conversion Potential</p>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', margin: '0 0 2px 0' }}>{mapToConfidence(results.creator_strategist.follower_conversion_potential, results.overall_score, 'conversion').label}</p>
              <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', display: 'block', lineHeight: 1.3 }}>{mapToConfidence(results.creator_strategist.follower_conversion_potential, results.overall_score, 'conversion').evidence}</span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: TOP PRIORITY FIXES */}
      {topPriorityFixes.length > 0 && (
        <div className="rc" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger-color, #ef4444)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <polygon points="12 2 2 22 22 22 12 2" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Top Priority Fixes
            </h3>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px'
          }}>
            {topPriorityFixes.map((item) => (
              <div key={item.num} style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--card-border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: item.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Fix #{item.num}: {item.module}
                    </span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: item.impact === 'High' ? 'rgba(239, 68, 68, 0.1)' : item.impact === 'Medium' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      color: item.impact === 'High' ? 'var(--danger-color)' : item.impact === 'Medium' ? 'var(--warning-color)' : 'var(--success-color)',
                      textTransform: 'uppercase'
                    }}>
                      {item.impact} Impact
                    </span>
                  </div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                    {item.fix}
                  </p>
                </div>
                <div style={{ borderTop: '1px dashed var(--card-border)', paddingTop: '10px' }}>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                    Expected Benefit
                  </span>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    {item.benefit}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: DIAGNOSTIC MODULES DEEP DIVE */}
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px', letterSpacing: '-.015em' }}>
          Creator Optimization Modules
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Module 1: Hook Strength Scorer */}
          <div className="rc" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color, #a855f7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Hook Strength Scorer</h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>First 3 seconds scroll-stopping assessment</p>
                </div>
              </div>
              <span className={`bdg ${results.hook_analysis.score >= 8 ? 'bdg-g' : results.hook_analysis.score >= 5 ? 'bdg-y' : 'bdg-r'}`}>
                {results.hook_analysis.score}/10
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Hook Type</p>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{results.hook_analysis.hook_type}</p>
              </div>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Scroll Stop Prediction</p>
                <p style={{ fontSize: '13px', fontWeight: 600, color: results.hook_analysis.score >= 8 ? 'var(--success-color)' : 'var(--text-primary)', margin: 0 }}>
                  {results.hook_analysis.score >= 8 ? 'Very High' : results.hook_analysis.score >= 6 ? 'High' : results.hook_analysis.score >= 4 ? 'Medium' : 'Low'}
                </p>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '2px', lineHeight: 1.3 }}>
                  {results.hook_analysis.score >= 8 ? 'High curiosity draw; direct, clear promise at start.' : results.hook_analysis.score >= 6 ? 'Good curiosity hook; value is established early.' : results.hook_analysis.score >= 4 ? 'Moderate appeal; could lead with a stronger curiosity gap.' : 'Slow hook development; lacks immediate hook signals.'}
                </span>
              </div>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Swipe Risk</p>
                <p style={{ fontSize: '13px', fontWeight: 600, color: results.hook_analysis.score >= 8 ? 'var(--success-color)' : results.hook_analysis.score >= 5 ? 'var(--warning-color)' : 'var(--danger-color)', margin: 0 }}>
                  {getSwipeRisk(results.hook_analysis.score).label}
                </p>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '2px', lineHeight: 1.3 }}>
                  {getSwipeRisk(results.hook_analysis.score).evidence}
                </span>
              </div>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Curiosity Score</p>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-color, #a855f7)', margin: 0 }}>{results.hook_analysis.audience_curiosity_score ?? 5}/10</p>
              </div>
            </div>

            {/* Current Hook Display */}
            {results.hook_analysis.current_hook && (
              <div style={{ background: 'rgba(239, 68, 68, 0.04)', border: '1px solid rgba(239, 68, 68, 0.12)', borderRadius: '8px', padding: '14px 16px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--danger-color)', textTransform: 'uppercase', margin: '0 0 6px 0' }}>Current Hook (from your script)</p>
                <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: 0, fontStyle: 'italic', lineHeight: 1.5 }}>{"\""}{results.hook_analysis.current_hook}{"\""}</p>
              </div>
            )}

            {/* Failure Reason */}
            {results.hook_analysis.failure_reason && (
              <div style={{ background: 'rgba(239, 68, 68, 0.04)', border: '1px solid rgba(239, 68, 68, 0.12)', borderRadius: '8px', padding: '14px 16px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--danger-color)', textTransform: 'uppercase', margin: '0 0 6px 0' }}>Why This Hook Fails</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{results.hook_analysis.failure_reason}</p>
              </div>
            )}

            {results.hook_analysis.risk_factors && results.hook_analysis.risk_factors.length > 0 && (
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 6px 0' }}>⚠️ Scroll Risk Factors</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {results.hook_analysis.risk_factors.map((risk: string, i: number) => (
                    <span key={i} style={{ fontSize: '11px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', color: 'var(--danger-color)', padding: '4px 10px', borderRadius: '6px' }}>
                      {risk}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 3 Hook Rewrite Comparison Cards */}
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 8px 0' }}>Hook Rewrite Options</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                {[
                  { label: 'Rewrite 1', value: results.hook_analysis.suggested_rewrite_1, swipe: results.hook_analysis.rewrite_1_predicted_swipe_percent },
                  { label: 'Rewrite 2', value: results.hook_analysis.suggested_rewrite_2, swipe: results.hook_analysis.rewrite_2_predicted_swipe_percent },
                  { label: 'Rewrite 3', value: results.hook_analysis.suggested_rewrite_3, swipe: results.hook_analysis.rewrite_3_predicted_swipe_percent }
                ].map(r => {
                  // A rewrite may be an object { archetype, text, why_better } (current schema)
                  // or a plain string (legacy / fallback). Normalize to primitive fields so JSX
                  // never receives the object itself.
                  const raw = r.value as unknown;
                  const rw = (raw && typeof raw === 'object')
                    ? raw as { archetype?: string; text?: string; why_better?: string }
                    : { text: raw as string | undefined };
                  return { label: r.label, swipe: r.swipe, text: rw.text, archetype: rw.archetype, why_better: rw.why_better };
                }).filter(r => r.text).map((rewrite, i) => {
                  const currentSwipe = results.hook_analysis.predicted_swipe_away_percent ?? 40;
                  const delta = currentSwipe - (rewrite.swipe ?? currentSwipe);
                  return (
                    <div key={i} style={{ background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.12)', borderRadius: '8px', padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--success-color)', textTransform: 'uppercase' }}>{rewrite.label}{rewrite.archetype ? ` · ${rewrite.archetype}` : ''}</span>
                        {rewrite.swipe != null && (
                          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--success-color)' }}>
                            {getRewriteSwipeRiskLabel(rewrite.swipe, currentSwipe)}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0, lineHeight: 1.5, fontStyle: 'italic' }}>{"\""}{rewrite.text}{"\""}</p>
                      {rewrite.why_better && (
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '6px 0 0 0', lineHeight: 1.4 }}>{rewrite.why_better}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--card-border)' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 6px 0' }}>Strengths</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{results.hook_analysis.strengths}</p>
              </div>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--card-border)' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 6px 0' }}>Weaknesses</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{results.hook_analysis.weaknesses}</p>
              </div>
            </div>

            <EvidenceEngineBlock moduleKey="hook" results={results} transcript={transcript} />
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--card-border)' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 6px 0' }}>Hook Refinement Strategy</p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{results.hook_analysis.recommendations}</p>
            </div>
            <ScoreBreakdownBlock moduleKey="hook" score={results.hook_analysis.score} />
            <CreatorBenchmarkBlock moduleKey="hook" score={results.hook_analysis.score} />
          </div>

          {/* Module 2: Retention Drop Detector */}
          <div className="rc" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--danger-color, #ef4444)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                  <polyline points="17 18 23 18 23 12" />
                </svg>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Retention Drop Detector</h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>Viewer interest drop points and pacing analysis</p>
                </div>
              </div>
              <span className={`bdg ${results.retention_analysis.score >= 8 ? 'bdg-g' : results.retention_analysis.score >= 5 ? 'bdg-y' : 'bdg-r'}`}>
                {results.retention_analysis.score}/10
              </span>
            </div>

            {/* Viewer Retention Timeline Graph */}
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 8px 0' }}>Predicted Viewer Retention Flow</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                {results.retention_analysis.timeline_analysis?.map((item: any, idx: number) => {
                  const statusColors: Record<string, string> = {
                    'Strong': 'var(--success-color, #10b981)',
                    'Drop Risk': 'var(--danger-color, #ef4444)',
                    'Recovery': 'var(--accent-color, #a855f7)',
                    'Curiosity Build': '#6366f1',
                    'Payoff': '#f59e0b',
                    'Emotional Peak': '#ec4899',
                    'Moderate': '#f59e0b'
                  };
                  const col = statusColors[item.status] || 'var(--text-secondary)';
                  return (
                     <div key={idx} style={{
                      background: 'rgba(255,255,255,0.02)', borderLeft: `3px solid ${col}`,
                      padding: '10px 12px', borderRadius: '0 8px 8px 0', display: 'flex', flexDirection: 'column', gap: '4px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff' }}>{item.timestamp}</span>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {item.engagement_level && (
                            <span style={{
                              fontSize: '8px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase',
                              background: item.engagement_level === 'High' ? 'rgba(16, 185, 129, 0.12)' : item.engagement_level === 'Low' || item.engagement_level === 'Critical' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                              color: item.engagement_level === 'High' ? 'var(--success-color)' : item.engagement_level === 'Low' || item.engagement_level === 'Critical' ? 'var(--danger-color)' : '#f59e0b'
                            }}>{item.engagement_level}</span>
                          )}
                          <span style={{ fontSize: '9px', fontWeight: 700, color: col, textTransform: 'uppercase' }}>{item.status}</span>
                        </div>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>{item.reason}</p>
                      {item.recommended_fix && (
                        <p style={{ fontSize: '11px', color: 'var(--success-color)', margin: '2px 0 0 0', lineHeight: 1.4, fontStyle: 'italic' }}>→ {item.recommended_fix}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Retention Risk</p>
                <p style={{ fontSize: '13px', fontWeight: 600, color: results.retention_analysis.score >= 8 ? 'var(--success-color)' : results.retention_analysis.score >= 5 ? 'var(--warning-color)' : 'var(--danger-color)', margin: 0 }}>
                  {results.retention_analysis.score >= 8 ? 'Low' : results.retention_analysis.score >= 5 ? 'Medium' : 'High'}
                </p>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '2px', lineHeight: 1.3 }}>
                  {results.retention_analysis.score >= 8 ? 'Optimal pacing with well-timed pattern interrupts maintains attention.' : results.retention_analysis.score >= 5 ? 'Moderate audience drop-off zones detected around pacing transitions.' : 'Slow pacing segments and visual monotony pose high drop-off risks.'}
                </span>
              </div>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Attention Decay prediction</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{results.retention_analysis.attention_decay_prediction}</p>
              </div>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Recovery Points</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{results.retention_analysis.recovery_points}</p>
              </div>
            </div>

            <EvidenceEngineBlock moduleKey="retention" results={results} transcript={transcript} />
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--card-border)' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 6px 0' }}>Diagnostic Recommendation</p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{results.retention_analysis.recommendations}</p>
            </div>
            <ScoreBreakdownBlock moduleKey="retention" score={results.retention_analysis.score} />
            <CreatorBenchmarkBlock moduleKey="retention" score={results.retention_analysis.score} />
          </div>

          {/* Module 3: Script Outline & Story Analyzer */}
          <div className="rc" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color, #a855f7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Script & Story Analyzer</h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>Message clarity, structure, and audience positioning</p>
                </div>
              </div>
              <span className={`bdg ${results.script_analysis.score >= 8 ? 'bdg-g' : results.script_analysis.score >= 5 ? 'bdg-y' : 'bdg-r'}`}>
                {results.script_analysis.score}/10
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Audience Resonance Fit</p>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{results.script_analysis.audience_fit}</p>
              </div>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Structure Score</p>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{results.script_analysis.structure_score}/10</p>
              </div>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Clarity Score</p>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{results.script_analysis.clarity_score}/10</p>
              </div>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Authority Score</p>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-color, #a855f7)', margin: 0 }}>{results.script_analysis.authority_score ?? results.script_analysis.score}/10</p>
              </div>
            </div>

            {/* Consultant Summary */}
            {results.script_analysis.consultant_summary && (
              <div style={{ background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.06), rgba(99, 102, 241, 0.04))', border: '1px solid rgba(168, 85, 247, 0.15)', borderRadius: '10px', padding: '18px 20px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent-color, #a855f7)', textTransform: 'uppercase', margin: '0 0 8px 0', letterSpacing: '0.06em' }}>Strategic Assessment</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.65, fontStyle: 'italic' }}>{results.script_analysis.consultant_summary}</p>
              </div>
            )}

            {/* Script structural breakdown map */}
            {results.script_analysis.structural_breakdown && (
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 8px 0' }}>Narrative Layout Mapping</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                  {[
                    { label: 'Hook (0-3s)', content: results.script_analysis.structural_breakdown.hook },
                    { label: 'Build (3-8s)', content: results.script_analysis.structural_breakdown.build },
                    { label: 'Escalation (8-14s)', content: results.script_analysis.structural_breakdown.escalation },
                    { label: 'Conflict (14-22s)', content: results.script_analysis.structural_breakdown.conflict },
                    { label: 'Payoff (22-45s)', content: results.script_analysis.structural_breakdown.payoff },
                    { label: 'CTA (45-60s)', content: results.script_analysis.structural_breakdown.cta }
                  ].map((beat, i) => (
                    <div key={i} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '10px' }}>
                      <p style={{ fontSize: '9px', fontWeight: 700, color: 'var(--accent-color, #a855f7)', margin: '0 0 4px 0', textTransform: 'uppercase' }}>{beat.label}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>{beat.content || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Issues Detected */}
            {results.script_analysis.issues_detected && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '12px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--danger-color)', margin: '0 0 6px 0', textTransform: 'uppercase' }}>⚠️ Flow & Gaps Issues</p>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {results.script_analysis.issues_detected.flow_issues?.concat(results.script_analysis.issues_detected.narrative_gaps || []).map((issue: string, idx: number) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                </div>
                <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '12px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--success-color)', margin: '0 0 6px 0', textTransform: 'uppercase' }}>🏆 Strong vs Missing Elements</p>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {results.script_analysis.issues_detected.strong_sections?.map((item: string, idx: number) => (
                      <li key={idx}><strong>Strong:</strong> {item}</li>
                    ))}
                    {results.script_analysis.issues_detected.missing_sections?.map((item: string, idx: number) => (
                      <li key={idx} style={{ color: 'var(--text-muted)' }}><strong>Missing:</strong> {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '12px' }}>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--card-border)' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 6px 0' }}>Strengths</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{results.script_analysis.strengths}</p>
              </div>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--card-border)' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 6px 0' }}>Weaknesses</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{results.script_analysis.weaknesses}</p>
              </div>
            </div>
            <EvidenceEngineBlock moduleKey="script" results={results} transcript={transcript} />
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--card-border)', marginBottom: '12px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 6px 0' }}>Script Structure Strategy</p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{results.script_analysis.recommendations}</p>
            </div>
            <ScoreBreakdownBlock moduleKey="script" score={results.script_analysis.score} />
            <CreatorBenchmarkBlock moduleKey="script" score={results.script_analysis.score} />
          </div>

          {/* Future V2: Editing Intelligence */}
          <div className="rc" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>

            {/* V2 blur overlay while Editing Intelligence is disabled */}
            {!FEATURES.EDITING_INTELLIGENCE && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.45)',
                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 10,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '24px', textAlign: 'center', animation: 'fadeIn 0.3s ease'
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '8px', flexShrink: 0 }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', margin: '0 0 4px 0' }}>Editing Intelligence</h4>
                <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.75)', margin: '0 0 16px 0', maxWidth: '380px' }}>
                  Coming Soon in V2. Video-based cuts, B-roll timing, visual pacing, and frame-level editing diagnostics are not part of Beta V1.
                </p>
                <span className="bdg" style={{ fontSize: '10px', fontWeight: 800, padding: '4px 10px', borderRadius: '999px', background: 'rgba(56,189,248,.12)', color: '#7dd3fc', textTransform: 'uppercase' }}>Coming Soon</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color, #a855f7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                  <line x1="7" y1="2" x2="7" y2="22" />
                  <line x1="17" y1="2" x2="17" y2="22" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <line x1="2" y1="7" x2="7" y2="7" />
                  <line x1="2" y1="17" x2="7" y2="17" />
                  <line x1="17" y1="17" x2="22" y2="17" />
                  <line x1="17" y1="7" x2="22" y2="7" />
                </svg>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Editing Intelligence</h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>Pattern interrupts, visual pacing, and B-roll suggestions</p>
                </div>
              </div>
              {!FEATURES.EDITING_INTELLIGENCE && (
                <span className="bdg" style={{ fontSize: '10px', fontWeight: 800, padding: '4px 10px', borderRadius: '999px', background: 'rgba(56,189,248,.12)', color: '#7dd3fc', textTransform: 'uppercase' }}>V2</span>
              )}
              {FEATURES.EDITING_INTELLIGENCE && (
                <span className={`bdg ${results.editing_analysis.score >= 8 ? 'bdg-g' : results.editing_analysis.score >= 5 ? 'bdg-y' : 'bdg-r'}`}>
                  {results.editing_analysis.score}/10
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Pacing Analysis</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{results.editing_analysis.pacing_analysis}</p>
              </div>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0' }}>B-Roll Suggestions</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{results.editing_analysis.b_roll_suggestions}</p>
              </div>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Pattern Interrupt Cues</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{results.editing_analysis.pattern_interrupt_recommendations}</p>
              </div>
            </div>

            {/* Cut Frequency */}
            {results.editing_analysis.cut_frequency && (
              <div style={{ background: 'rgba(168, 85, 247, 0.04)', border: '1px solid rgba(168, 85, 247, 0.12)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent-color, #a855f7)', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Recommended Cut Frequency</p>
                <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0, fontWeight: 600 }}>{results.editing_analysis.cut_frequency}</p>
              </div>
            )}

            {/* Text Overlay Moments */}
            {results.editing_analysis.text_overlay_moments && results.editing_analysis.text_overlay_moments.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 8px 0' }}>Text Overlay Moments</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {results.editing_analysis.text_overlay_moments.map((moment: string, i: number) => (
                    <span key={i} style={{ fontSize: '11px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.15)', color: '#6366f1', padding: '4px 10px', borderRadius: '6px' }}>
                      {moment}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Sound Design */}
            {results.editing_analysis.sound_design_recommendations && (
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--card-border)', marginBottom: '16px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 6px 0' }}>Sound Design Recommendations</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{results.editing_analysis.sound_design_recommendations}</p>
              </div>
            )}

            <div style={{ background: 'var(--bg-tertiary, #1e1e24)', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--card-border)' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 6px 0' }}>Visual Framing Suggestions</p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{results.editing_analysis.visual_suggestions}</p>
            </div>
          </div>

          {/* Module 5: Viewer Emotion Tracker */}
          <div className="rc" style={{ padding: '24px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Upgrade blur overlay for Free plan users */}
            {!isPro && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.45)',
                backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', zIndex: 10,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '24px', textAlign: 'center', animation: 'fadeIn 0.3s ease'
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '8px', flexShrink: 0 }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', margin: '0 0 4px 0' }}>Locked: Emotional Journey Mapping</h4>
                <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.75)', margin: '0 0 16px 0', maxWidth: '380px' }}>
                  Upgrade to Pro to unlock precise curiosity peaks, authority trust builders, and retention emotional drop zones.
                </p>
                <Link href="/billing" className="btn bp sm-btn" style={{ background: 'var(--accent-color, #7c3aed)', border: 'none' }}>
                  Upgrade to Pro
                </Link>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color, #a855f7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5.5 5.5 0 0 0 12.5 2.5a5.5 5.5 0 0 0-5.5 5.5c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5" />
                  <line x1="9" y1="18" x2="15" y2="18" />
                  <line x1="10" y1="22" x2="14" y2="22" />
                </svg>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Viewer Emotion Tracker</h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>Authority moments, curiosity arcs, and retention emotional peaks</p>
                </div>
              </div>
              <span className={`bdg ${results.emotion_analysis.score >= 8 ? 'bdg-g' : results.emotion_analysis.score >= 5 ? 'bdg-y' : 'bdg-r'}`}>
                {results.emotion_analysis.score}/10
              </span>
            </div>

            {/* Emotional Stats Map */}
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 8px 0' }}>Vibe Resonance Profiles</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                {[
                  { name: 'Curiosity', val: results.emotion_analysis.curiosity_score || 7, color: '#a855f7', explanation: results.emotion_analysis.curiosity_explanation },
                  { name: 'Trust', val: results.emotion_analysis.trust_score || 7, color: '#10b981', explanation: results.emotion_analysis.trust_explanation },
                  { name: 'Authority', val: results.emotion_analysis.authority_score || 7, color: '#3b82f6', explanation: results.emotion_analysis.authority_explanation },
                  { name: 'Suspense', val: results.emotion_analysis.suspense_score || 6, color: '#ef4444', explanation: results.emotion_analysis.suspense_explanation },
                  { name: 'Excitement', val: results.emotion_analysis.excitement_score || 7, color: '#f59e0b', explanation: results.emotion_analysis.excitement_explanation },
                  { name: 'Empathy', val: results.emotion_analysis.empathy_score || 7, color: '#ec4899', explanation: results.emotion_analysis.empathy_explanation }
                ].map((item, idx) => (
                  <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px', fontWeight: 600 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                      <span style={{ color: item.color }}>{item.val}/10</span>
                    </div>
                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden', marginBottom: item.explanation ? '8px' : '0' }}>
                      <div style={{ width: `${item.val * 10}%`, height: '100%', background: item.color }} />
                    </div>
                    {item.explanation && (
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4, fontStyle: 'italic' }}>{item.explanation}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Emotional Timeline Journey */}
            <div>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 8px 0' }}>Emotional Narrative Graph</p>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                {results.emotion_analysis.emotional_timeline?.map((item: any, idx: number) => (
                  <div key={idx} style={{
                    minWidth: '110px', flex: '1 0 auto', background: 'var(--bg-tertiary)', border: '1px solid var(--card-border)',
                    padding: '8px 12px', borderRadius: '8px', textAlign: 'center'
                  }}>
                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '0 0 2px 0' }}>{item.timestamp}</p>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-color, #a855f7)', margin: 0 }}>{item.emotion}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '12px' }}>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--card-border)' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 6px 0' }}>Emotional Strengths</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{results.emotion_analysis.strengths}</p>
              </div>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--card-border)' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 6px 0' }}>Emotional Drops & Gaps</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{results.emotion_analysis.weaknesses}</p>
              </div>
            </div>
            <EvidenceEngineBlock moduleKey="emotion" results={results} transcript={transcript} />
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--card-border)', marginBottom: '12px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 6px 0' }}>Emotional Resonance Strategy</p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{results.emotion_analysis.recommendations}</p>
            </div>
            <ScoreBreakdownBlock moduleKey="emotion" score={results.emotion_analysis.score} />
            <CreatorBenchmarkBlock moduleKey="emotion" score={results.emotion_analysis.score} />
          </div>

          {/* Module 6: Growth & Distribution Optimizer */}
          <div className="rc" style={{ padding: '24px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Upgrade blur overlay for Free plan users */}
            {!isPro && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.45)',
                backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', zIndex: 10,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '24px', textAlign: 'center', animation: 'fadeIn 0.3s ease'
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '8px', flexShrink: 0 }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', margin: '0 0 4px 0' }}>Locked: Search & Captions Optimizer</h4>
                <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.75)', margin: '0 0 16px 0', maxWidth: '380px' }}>
                  Upgrade to Pro to unlock optimized description captions, specific hashtags suggestions, and distribution strategies.
                </p>
                <Link href="/billing" className="btn bp sm-btn" style={{ background: 'var(--accent-color, #7c3aed)', border: 'none' }}>
                  Upgrade to Pro
                </Link>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success-color, #10b981)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Growth & Distribution Optimizer</h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>SEO tags, caption hooks, and syndication strategies</p>
                </div>
              </div>
              <span className={`bdg ${results.growth_analysis.score >= 8 ? 'bdg-g' : results.growth_analysis.score >= 5 ? 'bdg-y' : 'bdg-r'}`}>
                {results.growth_analysis.score}/10
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Content Category</p>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{results.growth_analysis.content_category}</p>
              </div>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Audience Segment</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{results.growth_analysis.audience_segment}</p>
              </div>
              <div>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Viral Trigger Type</p>
                <p style={{ fontSize: '13px', color: 'var(--accent-color, #a855f7)', fontWeight: 600, margin: 0 }}>{results.growth_analysis.viral_trigger_type}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>Recommended Caption</p>
                  <button
                    className="btn bg-btn sm-btn"
                    onClick={() => copyToClipboard(results.growth_analysis.recommended_caption, 'hook')}
                    style={{ fontSize: '9px', padding: '1px 6px' }}
                  >
                    Copy
                  </button>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{results.growth_analysis.recommended_caption}</p>
              </div>

              <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 6px 0' }}>Alternative Caption</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{results.growth_analysis.alternative_caption}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 6px 0' }}>Comment Trigger CTA</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{results.growth_analysis.comment_trigger}</p>
              </div>

              <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 6px 0' }}>CTA Improvement</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{results.growth_analysis.cta_improvement}</p>
              </div>
            </div>

            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--card-border)' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 6px 0' }}>Hashtag Cluster</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {results.growth_analysis.hashtag_cluster?.map((tag: string, idx: number) => (
                  <span key={idx} style={{ fontSize: '11px', background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.15)', color: 'var(--accent-color, #a855f7)', padding: '4px 10px', borderRadius: '6px', fontFamily: 'monospace' }}>
                    #{tag.replace(/^#/, '')}
                  </span>
                ))}
              </div>
            </div>

            {/* Distribution Strategy */}
            {results.growth_analysis.distribution_strategy && (
              <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.04), rgba(99, 102, 241, 0.03))', border: '1px solid rgba(16, 185, 129, 0.12)', borderRadius: '10px', padding: '16px 18px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--success-color)', textTransform: 'uppercase', margin: '0 0 8px 0', letterSpacing: '0.06em' }}>Cross-Platform Distribution Strategy</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>{results.growth_analysis.distribution_strategy}</p>
              </div>
            )}

            {/* Platform-Specific Recommendations */}
            <EvidenceEngineBlock moduleKey="growth" results={results} transcript={transcript} />
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--card-border)', marginBottom: '12px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 6px 0' }}>Growth & SEO Strategy</p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{results.growth_analysis.recommendations}</p>
            </div>

            {results.growth_analysis.platform_specific_recommendations && (
              <div style={{ background: 'rgba(99, 102, 241, 0.04)', border: '1px solid rgba(99, 102, 241, 0.12)', borderRadius: '10px', padding: '16px 18px', marginBottom: '12px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', margin: '0 0 8px 0', letterSpacing: '0.06em' }}>Platform-Specific Recommendations</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>{results.growth_analysis.platform_specific_recommendations}</p>
              </div>
            )}
            <ScoreBreakdownBlock moduleKey="growth" score={results.growth_analysis.score} />
            <CreatorBenchmarkBlock moduleKey="growth" score={results.growth_analysis.score} />
          </div>

        </div>
      </div>

      {/* SECTION 5: PRIORITY FIX ROADMAP (CREATOR RECOMMENDATIONS) */}
      {(() => {
        const recsScore = Math.round(((results.overall_score + results.hook_analysis.score + results.retention_analysis.score + results.script_analysis.score + results.emotion_analysis.score + results.growth_analysis.score) / 6) * 10) / 10;
        return (
          <div style={{
            background: 'var(--card-bg)', border: '1px solid var(--card-border)',
            borderRadius: 'var(--radius-lg)', padding: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--warning-color, #f59e0b)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Creator Recommendations & Priority Fixes
                </h3>
              </div>
              <span className={`bdg ${recsScore >= 8 ? 'bdg-g' : recsScore >= 5 ? 'bdg-y' : 'bdg-r'}`}>
                {recsScore}/10
              </span>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
              An actionable, interactive list compiled from your diagnostics. Complete these revisions to boost pacing and retention scores.
            </p>

            <EvidenceEngineBlock moduleKey="recommendations" results={results} transcript={transcript} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
              {roadmapFixes.map((fix, idx) => {
                const isChecked = !!roadmapChecked[fix.key];
                return (
                  <div
                    key={fix.key}
                    onClick={() => toggleRoadmapItem(fix.key)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 16px',
                      borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)',
                      background: isChecked ? 'rgba(16, 185, 129, 0.04)' : 'var(--bg-tertiary)',
                      cursor: 'pointer', transition: 'all 0.15s ease',
                      textDecoration: isChecked ? 'line-through' : 'none',
                      opacity: isChecked ? 0.6 : 1
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', height: '18px', marginTop: '2px' }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => { }} // Controlled click via parent div
                        style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: 'var(--success-color)' }}
                      />
                    </div>
                    <div style={{ fontSize: '13px', color: isChecked ? 'var(--text-muted)' : 'var(--text-secondary)', lineHeight: 1.5 }}>
                      <span style={{ marginRight: '6px' }}>{fix.icon}</span>
                      {fix.label}
                    </div>
                  </div>
                );
              })}
            </div>
            <ScoreBreakdownBlock moduleKey="recommendations" score={recsScore} />
            <CreatorBenchmarkBlock moduleKey="recommendations" score={recsScore} />
          </div>
        );
      })()}

      {/* SECTION 8: REWRITE ENGINE */}
      {results.rewrite_engine && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.4), rgba(15, 23, 42, 0.6))',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: 'var(--radius-lg)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color, #a855f7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Creative Rewrite Engine</h3>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {results.rewrite_engine.hook_impact && (
                <span className="bdg" style={{ fontSize: '10px', fontWeight: 700, padding: '4px 8px', borderRadius: '4px', textTransform: 'uppercase', background: 'rgba(168, 85, 247, 0.12)', color: 'var(--accent-color, #a855f7)' }}>
                  🪝 Hook: {results.rewrite_engine.hook_impact}
                </span>
              )}
              {results.rewrite_engine.retention_impact && (
                <span className="bdg" style={{ fontSize: '10px', fontWeight: 700, padding: '4px 8px', borderRadius: '4px', textTransform: 'uppercase', background: 'rgba(239, 68, 68, 0.12)', color: 'var(--danger-color)' }}>
                  📈 Retention: {results.rewrite_engine.retention_impact}
                </span>
              )}
              <span className="bdg bdg-g" style={{ fontSize: '11px', fontWeight: 700 }}>
                {results.rewrite_engine.predicted_impact}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: 0 }}>Original Draft</p>
              <div style={{
                background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)',
                borderRadius: '8px', padding: '14px', fontSize: '12.5px', color: 'var(--text-muted)',
                lineHeight: 1.6, flexGrow: 1, minHeight: '80px'
              }}>
                {results.rewrite_engine.current_version}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent-color, #a855f7)', textTransform: 'uppercase', margin: 0 }}>Creator Intelligence Rewrite</p>
                <button
                  className="btn bg-btn sm-btn"
                  onClick={() => copyToClipboard(results.rewrite_engine.improved_version, 'script')}
                  style={{ fontSize: '10px', padding: '2px 8px' }}
                >
                  {copiedScript ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <div style={{
                background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '8px', padding: '14px', fontSize: '12.5px', color: '#fff',
                lineHeight: 1.6, flexGrow: 1, minHeight: '80px', fontWeight: 500
              }}>
                {results.rewrite_engine.improved_version}
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
            <p style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Strategic Optimization Logic</p>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{results.rewrite_engine.improvement_explanation}</p>
          </div>
        </div>
      )}


      {/* Raw Script Log */}
      {transcript && (
        <div style={{
          background: 'var(--card-bg)', border: '1px solid var(--card-border)',
          borderRadius: 'var(--radius-lg)', padding: '24px',
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', letterSpacing: '-.01em' }}>
            Submitted script
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.75, whiteSpace: 'pre-wrap', margin: 0 }}>
            {transcript}
          </p>
        </div>
      )}

      {/* CLOSING: recommended next steps + conclusion (deterministic cosmetic framing) */}
      {isDemoReport && demoInfo?.variation && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(26, 21, 44, 0.5), rgba(13, 10, 25, 0.7))',
          border: '1px solid var(--card-border)', borderRadius: 'var(--radius-lg)',
          padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
        }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-color, #a855f7)', letterSpacing: '.12em', textTransform: 'uppercase' }}>
            {demoInfo.variation.actionPlanIntro || 'Recommended next steps'}
          </span>
          {Array.isArray(demoInfo.variation.nextSteps) && (
            <ol style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {demoInfo.variation.nextSteps.map((step: string, i: number) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span style={{
                    flexShrink: 0, width: '22px', height: '22px', borderRadius: '999px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 800, color: '#c4b5fd',
                    background: 'rgba(139,92,246,0.16)', border: '1px solid rgba(139,92,246,0.32)',
                  }}>{i + 1}</span>
                  <span style={{ fontSize: '13px', lineHeight: 1.55, color: 'var(--text-secondary)' }}>{step}</span>
                </li>
              ))}
            </ol>
          )}
          {demoInfo.variation.conclusion && (
            <p style={{ fontSize: '13px', lineHeight: 1.65, color: 'var(--text-secondary)', margin: 0 }}>
              {demoInfo.variation.conclusion}
            </p>
          )}
          {demoInfo.variation.encouragement && (
            <p style={{
              fontSize: '12.5px', lineHeight: 1.55, color: 'var(--text-primary)', margin: 0,
              fontStyle: 'italic', paddingLeft: '14px', borderLeft: '2px solid rgba(139,92,246,0.35)',
            }}>{demoInfo.variation.encouragement}</p>
          )}
        </div>
      )}
    </div>
  );
}
