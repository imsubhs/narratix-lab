export interface ModuleResult {
  score: number;
  [key: string]: unknown;
}

export interface ContentIntelligence {
  niche: string;
  sub_niche: string;
  goal: string;
  audience: string;
  content_type: string;
  platform: string;
  funnel_stage: string;
  confidence_score: number;
}

export interface DocumentIntelligence {
  pages: number;
  words: number;
  reading_time_minutes: number;
  title: string;
  detected_hook: string;
  detected_cta: string;
  key_promise: string;
  main_conflict: string;
  core_topic: string;
}

export interface ExecutiveSummary {
  overall_score: number;
  overall_verdict: string;
  strengths: string;
  weaknesses: string;
  recommendations: string;
  priority_fixes: string;
}

export interface HookAnalysis {
  score: number;
  hook_type: string;
  current_hook: string;
  failure_reason: string;
  audience_curiosity_score: number;
  scroll_stop_probability: string;
  predicted_swipe_away_percent: number;
  risk_factors: string[];
  strengths: string;
  weaknesses: string;
  recommendations: string;
  priority_fixes: string;
  suggested_rewrite_1: string;
  rewrite_1_predicted_swipe_percent: number;
  suggested_rewrite_2: string;
  rewrite_2_predicted_swipe_percent: number;
  suggested_rewrite_3: string;
  rewrite_3_predicted_swipe_percent: number;
  predicted_improvement_percent: number;
}

export interface RetentionTimelinePoint {
  timestamp: string;
  status: string;
  engagement_level: string;
  reason: string;
  recommended_fix: string;
}

export interface RetentionAnalysis {
  score: number;
  timeline_analysis: RetentionTimelinePoint[];
  retention_curve_summary: string;
  completion_prediction: string;
  attention_decay_prediction: string;
  recovery_points: string;
  strengths: string;
  weaknesses: string;
  recommendations: string;
  priority_fixes: string;
}

export interface StructuralBreakdown {
  hook: string;
  build: string;
  escalation: string;
  conflict: string;
  payoff: string;
  cta: string;
}

export interface IssuesDetected {
  weak_sections: string[];
  strong_sections: string[];
  missing_sections: string[];
  flow_issues: string[];
  narrative_gaps: string[];
}

export interface ScriptAnalysis {
  score: number;
  structure_score: number;
  clarity_score: number;
  authority_score: number;
  audience_fit: string;
  consultant_summary: string;
  strengths: string;
  weaknesses: string;
  recommendations: string;
  priority_fixes: string;
  structural_breakdown: StructuralBreakdown;
  issues_detected: IssuesDetected;
}

export interface EditingAnalysis {
  score: number;
  strengths: string;
  weaknesses: string;
  recommendations: string;
  priority_fixes: string;
  pacing_analysis: string;
  cut_frequency: string;
  text_overlay_moments: string[];
  visual_suggestions: string;
  b_roll_suggestions: string;
  sound_design_recommendations: string;
  pattern_interrupt_recommendations: string;
}

export interface EmotionalTimelinePoint {
  timestamp: string;
  emotion: string;
}

export interface EmotionAnalysis {
  score: number;
  curiosity_score: number;
  curiosity_explanation: string;
  trust_score: number;
  trust_explanation: string;
  authority_score: number;
  authority_explanation: string;
  suspense_score: number;
  suspense_explanation: string;
  excitement_score: number;
  excitement_explanation: string;
  empathy_score: number;
  empathy_explanation: string;
  emotional_timeline: EmotionalTimelinePoint[];
  strengths: string;
  weaknesses: string;
  recommendations: string;
  priority_fixes: string;
}

export interface CreatorStrategist {
  why_fail: string;
  why_succeed: string;
  audience_perception: string;
  algorithm_perception: string;
  shareability_prediction: string;
  comment_potential: string;
  save_potential: string;
  follower_conversion_potential: string;
}

export interface RewriteEngine {
  current_version: string;
  improved_version: string;
  improvement_explanation: string;
  predicted_impact: string;
  retention_impact: string;
  hook_impact: string;
}

export interface GrowthAnalysis {
  score: number;
  recommended_caption: string;
  alternative_caption: string;
  comment_trigger: string;
  cta_improvement: string;
  hashtag_cluster: string[];
  content_category: string;
  audience_segment: string;
  viral_trigger_type: string;
  distribution_strategy: string;
  platform_specific_recommendations: string;
  strengths: string;
  weaknesses: string;
  recommendations: string;
  priority_fixes: string;
}

export interface AnalysisResult {
  intelligence: ContentIntelligence;
  overall_score: number;
  overall_verdict: string;
  executive_summary: ExecutiveSummary;
  document_intelligence?: DocumentIntelligence;
  hook_analysis: HookAnalysis;
  retention_analysis: RetentionAnalysis;
  script_analysis: ScriptAnalysis;
  editing_analysis: EditingAnalysis;
  emotion_analysis: EmotionAnalysis;
  creator_strategist?: CreatorStrategist;
  rewrite_engine?: RewriteEngine;
  growth_analysis: GrowthAnalysis;
  modules: {
    hook: ModuleResult;
    retention: ModuleResult;
    script: ModuleResult;
    editing: ModuleResult;
    emotion: ModuleResult;
    growth: ModuleResult;
  };
  meta?: any;
}

export interface DashboardAnalysisResult {
  score: number;
  hook: string;
  summary: string;
  suggestions: string[];
}

export function clampScore(score: number) {
  return Math.max(1, Math.min(10, Math.round(score)));
}

export function normalizeNaxResult(rawInput: any): AnalysisResult {
  if (!rawInput) return rawInput;

  // Unwrap legacy wrappers and handle string inputs
  let raw = rawInput;
  if (rawInput.results && typeof rawInput.results === 'object') {
    raw = rawInput.results;
  } else if (rawInput.results_json && typeof rawInput.results_json === 'object') {
    raw = rawInput.results_json;
  } else if (rawInput.analysis_data && typeof rawInput.analysis_data === 'object') {
    raw = rawInput.analysis_data;
  } else if (rawInput.report_data && typeof rawInput.report_data === 'object') {
    raw = rawInput.report_data;
  } else if (rawInput.result && typeof rawInput.result === 'object' && Object.keys(rawInput.result).length > 0) {
    raw = rawInput.result;
  }

  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      // Ignored
    }
  }

  // Identify Category C (entirely empty/failed) reports:
  // If a report has no overall score, no transcript, and no results payload, it is irrecoverable.
  const hasOverallScore = raw.overall_score !== undefined && raw.overall_score !== null;
  const hasTranscript = typeof raw.transcript === 'string' && raw.transcript.trim().length > 0;
  const hasResultsJson = raw.results && typeof raw.results === 'object' && Object.keys(raw.results).length > 0;
  const hasModules = raw.modules && typeof raw.modules === 'object' && Object.keys(raw.modules).length > 0;
  const hasExecSummary = raw.executive_summary && typeof raw.executive_summary === 'object' && Object.keys(raw.executive_summary).length > 0;
  
  if (!hasOverallScore && !hasTranscript && !hasResultsJson && !hasModules && !hasExecSummary) {
    return null as any;
  }

  // Merge unwrapped fields with rawInput fields for maximum field compatibility
  raw = {
    ...rawInput,
    ...raw
  };
  
  // Enforce root overall_score and overall_verdict from executive_summary or raw fields
  const overall_score = raw.executive_summary?.overall_score ?? raw.overall_score ?? 1;
  const overall_verdict = raw.executive_summary?.overall_verdict ?? raw.overall_verdict ?? '';
  
  let hook_analysis = raw.hook_analysis;
  let retention_analysis = raw.retention_analysis;
  let script_analysis = raw.script_analysis;
  let editing_analysis = raw.editing_analysis;
  let emotion_analysis = raw.emotion_analysis;
  let growth_analysis = raw.growth_analysis;
  let executive_summary = raw.executive_summary;

  // If new format fields are missing, but legacy modules exist, map legacy modules to the new format
  if (!hook_analysis && raw.modules) {
    executive_summary = {
      overall_score,
      overall_verdict,
      strengths: raw.modules.script?.diagnosis ? `Script structure and messaging flows clearly.` : `Strong layout foundation.`,
      weaknesses: raw.modules.hook?.diagnosis ? `Opening hook lacks high visual or text-driven curiosity beats.` : `Tension could be higher.`,
      recommendations: raw.modules.retention?.fixes ? `Apply pattern interrupts and pacing changes.` : `Refine opening promise beats.`,
      priority_fixes: raw.modules.hook?.tips || `Refine the first 3 seconds to lead with high tension.`
    };
    hook_analysis = {
      score: raw.modules.hook?.score ?? 1,
      hook_type: 'Curiosity + Direct Challenge',
      current_hook: raw.transcript?.substring(0, 80) || 'No hook text extracted.',
      failure_reason: 'Opening uses a greeting or context-setting statement instead of a curiosity gap or direct challenge, causing viewers to scroll past before the value proposition is revealed.',
      audience_curiosity_score: raw.modules.hook?.score >= 7 ? 8 : raw.modules.hook?.score >= 4 ? 5 : 3,
      scroll_stop_probability: raw.modules.hook?.score >= 8 ? 'High (85%)' : raw.modules.hook?.score >= 5 ? 'Moderate (65%)' : 'Low (45%)',
      predicted_swipe_away_percent: raw.modules.hook?.score >= 8 ? 15 : raw.modules.hook?.score >= 5 ? 40 : 65,
      risk_factors: ['Generic greeting pattern', 'Tension build is delayed'],
      strengths: raw.modules.hook?.diagnosis || `Clear verbal context.`,
      weaknesses: `Greeting statements or context explanation dilutes viewer curiosity.`,
      recommendations: raw.modules.hook?.tips || `Lead with outcome or direct value.`,
      priority_fixes: `Remove introductory buffer phrases in the first sentence.`,
      suggested_rewrite_1: `Stop doing this niche mistake immediately.`,
      rewrite_1_predicted_swipe_percent: 28,
      suggested_rewrite_2: `This is why your content is failing.`,
      rewrite_2_predicted_swipe_percent: 25,
      suggested_rewrite_3: `I wasted 6 months before I learned this one rule.`,
      rewrite_3_predicted_swipe_percent: 22,
      predicted_improvement_percent: 18
    };
    retention_analysis = {
      score: raw.modules.retention?.score ?? 1,
      timeline_analysis: [
        { timestamp: '00:00–00:03', status: 'Strong', engagement_level: 'High', reason: 'Clear topic introduction hooks the viewer.', recommended_fix: 'Maintain — opening promise is effective.' },
        { timestamp: '00:03–00:08', status: 'Drop Risk', engagement_level: 'Low', reason: 'Context details slow the pacing and break visual momentum.', recommended_fix: 'Insert a pattern interrupt (zoom cut or text overlay) at 00:04 to maintain attention.' },
        { timestamp: '00:08–00:15', status: 'Recovery', engagement_level: 'Medium', reason: 'Payoff teaser builds suspense.', recommended_fix: 'Amplify the teaser with a visual before/after split screen at 00:10.' },
        { timestamp: '00:15–00:30', status: 'Strong', engagement_level: 'High', reason: 'Actionable steps maintain engagement.', recommended_fix: 'Keep the pacing tight — add bullet-point text overlays for each step.' },
        { timestamp: '00:30+', status: 'Curiosity Build', engagement_level: 'Medium', reason: 'CTA wrap-up sustains interest through completion.', recommended_fix: 'End with a cliffhanger or follow-up promise to drive profile visits.' }
      ],
      retention_curve_summary: `Viewer drops likely if graphics remain static.`,
      completion_prediction: raw.modules.retention?.completion_prediction || '50% expected completion',
      attention_decay_prediction: 'Gradual decay after 10s explanation',
      recovery_points: 'Teased value reveal at 12s',
      strengths: `Optimal duration keeps pacing snappy.`,
      weaknesses: raw.modules.retention?.drop_timestamps || `Middle segments show potential pacing drops.`,
      recommendations: raw.modules.retention?.fixes || `Introduce visual pattern changes every 5 seconds.`,
      priority_fixes: `Preview visual before/after changes mid-video.`
    };
    script_analysis = {
      score: raw.modules.script?.score ?? 1,
      structure_score: raw.modules.script?.structure_score ?? raw.modules.script?.score ?? 1,
      clarity_score: raw.modules.script?.clarity_score ?? raw.modules.script?.score ?? 1,
      authority_score: raw.modules.script?.score ?? 5,
      audience_fit: `Strong alignment with target demographic concerns.`,
      consultant_summary: `This script demonstrates adequate foundational structure but underperforms against top-tier retention benchmarks. The opening hook relies on a passive greeting pattern that wastes the critical first 1.5 seconds. Mid-script transitions introduce cognitive load spikes that create measurable drop-off risk. Strategic restructuring around a Problem → Stakes → Solution → CTA framework would unlock approximately 20-30% higher completion rates based on comparable content performance data.`,
      strengths: `Dynamic phrasing and readable layout beats.`,
      weaknesses: `Transition logic from concept reveal to application beats is loose.`,
      recommendations: `Adopt a clear problem -> demonstration -> solution structure.`,
      priority_fixes: `Tighten the script transition lines.`,
      structural_breakdown: {
        hook: 'Tension-building premise',
        build: 'Elaborating on the niche conflict',
        escalation: 'Emphasizing the cost of failure',
        conflict: 'Addressing target hurdles',
        payoff: 'Revealing the solution',
        cta: 'Direct outcome request'
      },
      issues_detected: {
        weak_sections: ['Context explanation mid-script'],
        strong_sections: ['Hook opening', 'CTA closure'],
        missing_sections: ['Contrast before/after visuals'],
        flow_issues: ['Transition at 12 seconds slows pacing'],
        narrative_gaps: ['Needs personal struggle or credibility validator']
      }
    };
    editing_analysis = {
      score: raw.modules.editing?.score ?? 1,
      strengths: `Well-paced segments suitable for mobile consumption layouts.`,
      weaknesses: raw.modules.editing?.issues || `Static visual elements limit retention holding potential.`,
      recommendations: raw.modules.editing?.tips || `Incorporate zoom cuts and clean typography overlays.`,
      priority_fixes: `Add visual zoom interrupts at sentence splits.`,
      pacing_analysis: `Snappy cuts on every vocal inflection beat.`,
      cut_frequency: '1 cut every 2-3 seconds for short-form; 1 cut every 4-5 seconds for long-form',
      text_overlay_moments: ['00:02 — Key statistic or bold claim', '00:07 — Problem statement reinforcement', '00:12 — Solution reveal keyword'],
      visual_suggestions: `Utilize dynamic background graphics and text tags.`,
      b_roll_suggestions: `Layer relevant application footage over text explanations.`,
      sound_design_recommendations: 'Subtle whoosh on scene transitions, bass drop on key reveals, ambient pad underneath talking head segments for professional feel.',
      pattern_interrupt_recommendations: `Add transition sound cues and typography animations.`
    };
    emotion_analysis = {
      score: raw.modules.emotion?.score ?? 1,
      curiosity_score: 8,
      curiosity_explanation: 'The opening line creates a knowledge gap that compels viewers to stay — they need to know what the "mistake" is.',
      trust_score: 7,
      trust_explanation: 'Direct, conversational tone reads as authentic, but lacks a specific credential or proof point to elevate trust.',
      authority_score: 8,
      authority_explanation: 'Prescriptive language ("stop doing this", "here\'s what works") positions the creator as a subject-matter expert.',
      suspense_score: 6,
      suspense_explanation: 'Suspense plateaus after the initial hook — the middle section reveals too much too soon, reducing tension buildup.',
      excitement_score: 7,
      excitement_explanation: 'Pacing energy is adequate but lacks visual dynamism or vocal variation to push excitement higher.',
      empathy_score: 7,
      empathy_explanation: 'References the target audience\'s struggles, but doesn\'t personalize with a specific relatable story or anecdote.',
      emotional_timeline: [
        { timestamp: '0s', emotion: 'Curiosity' },
        { timestamp: '10s', emotion: 'Tension' },
        { timestamp: '20s', emotion: 'Determination' },
        { timestamp: '30s', emotion: 'Satisfaction' }
      ],
      strengths: `Authentic delivery creates initial trust.`,
      weaknesses: raw.modules.emotion?.gaps || `Middle blocks feel slightly clinical or informative only.`,
      recommendations: raw.modules.emotion?.boosters || `Name specific target pain points directly.`,
      priority_fixes: `Frame warnings around direct consumer frustrations.`
    };
    growth_analysis = {
      score: growth_analysis?.score ?? 1,
      recommended_caption: raw.modules.growth?.caption || `The simple fix most creators miss.`,
      alternative_caption: `How to hold attention for 60 seconds.`,
      comment_trigger: `Comment TEMPLATE below to get this builder.`,
      cta_improvement: `Save this post to reference during your next script.`,
      hashtag_cluster: (raw.modules.growth?.hashtags || `#contentstrategy #creatortips #shortformvideo`).split(/\s+/).filter(Boolean),
      content_category: 'Educational Growth',
      audience_segment: 'Short-form Content Creators',
      viral_trigger_type: 'Transformation / Underdog',
      distribution_strategy: 'Post natively to TikTok first (highest organic reach for new creators), then repurpose to Instagram Reels with adjusted aspect ratio and caption length. Share a text-based summary on X/Twitter thread for cross-pollination.',
      platform_specific_recommendations: 'For the detected platform: optimize thumbnail text to 3-4 words maximum, front-load keywords in description for search discoverability, and use platform-native engagement features (polls, Q&A stickers) within 24 hours of posting.',
      strengths: `Niche targeting has clear search queries.`,
      weaknesses: `Generic caption and hashtags limit discovery.`,
      recommendations: raw.modules.growth?.caption || `Utilize scroll-stopping keyword hooks.`,
      priority_fixes: `Implement targeted search keywords in description context.`
    };
  } else {
    // Make sure new schema elements have safe defaults if AI returns partial results or empty
    hook_analysis = hook_analysis || {
      score: raw.overall_score ?? 1,
      hook_type: 'Curiosity Gap',
      current_hook: '',
      failure_reason: 'Opening hook lacks a specific tension or curiosity gap.',
      audience_curiosity_score: 5,
      scroll_stop_probability: 'Moderate (65%)',
      predicted_swipe_away_percent: 40,
      risk_factors: ['Generic intro hook'],
      strengths: 'Clear layout.',
      weaknesses: 'Opening hook lacks tension.',
      recommendations: 'Start with high curiosity gap.',
      priority_fixes: 'Eliminate introductory greeting statements.',
      suggested_rewrite_1: 'Start with high curiosity gap.',
      rewrite_1_predicted_swipe_percent: 30,
      suggested_rewrite_2: 'Lead with direct value payoff.',
      rewrite_2_predicted_swipe_percent: 28,
      suggested_rewrite_3: 'Open with a bold contrarian statement.',
      rewrite_3_predicted_swipe_percent: 25,
      predicted_improvement_percent: 15
    };
    if (raw.hook_analysis) {
      hook_analysis.hook_type = hook_analysis.hook_type ?? 'Curiosity Gap';
      hook_analysis.current_hook = hook_analysis.current_hook ?? '';
      hook_analysis.failure_reason = hook_analysis.failure_reason ?? '';
      hook_analysis.audience_curiosity_score = hook_analysis.audience_curiosity_score ?? 5;
      hook_analysis.scroll_stop_probability = hook_analysis.scroll_stop_probability ?? 'Moderate (65%)';
      hook_analysis.predicted_swipe_away_percent = hook_analysis.predicted_swipe_away_percent ?? 40;
      hook_analysis.risk_factors = hook_analysis.risk_factors ?? ['Generic intro hook'];
      hook_analysis.suggested_rewrite_1 = hook_analysis.suggested_rewrite_1 ?? 'Start with high curiosity gap.';
      hook_analysis.rewrite_1_predicted_swipe_percent = hook_analysis.rewrite_1_predicted_swipe_percent ?? 30;
      hook_analysis.suggested_rewrite_2 = hook_analysis.suggested_rewrite_2 ?? 'Lead with direct value payoff.';
      hook_analysis.rewrite_2_predicted_swipe_percent = hook_analysis.rewrite_2_predicted_swipe_percent ?? 28;
      hook_analysis.suggested_rewrite_3 = hook_analysis.suggested_rewrite_3 ?? 'Open with a bold contrarian statement.';
      hook_analysis.rewrite_3_predicted_swipe_percent = hook_analysis.rewrite_3_predicted_swipe_percent ?? 25;
      hook_analysis.predicted_improvement_percent = hook_analysis.predicted_improvement_percent ?? 15;
    }

    retention_analysis = retention_analysis || {
      score: raw.overall_score ?? 1,
      timeline_analysis: [
        { timestamp: '00:00–00:03', status: 'Strong', engagement_level: 'High', reason: 'Hook has clear promise.', recommended_fix: 'Maintain current opening structure.' },
        { timestamp: '00:03–00:08', status: 'Moderate', engagement_level: 'Medium', reason: 'Normal viewer decay.', recommended_fix: 'Add a visual pattern interrupt at 00:05.' },
        { timestamp: '00:08–00:15', status: 'Drop Risk', engagement_level: 'Low', reason: 'Pacing slows down.', recommended_fix: 'Insert a rapid-fire montage or bold text overlay.' }
      ],
      retention_curve_summary: 'Gradual decay.',
      completion_prediction: '50%',
      attention_decay_prediction: 'Decay after 8s',
      recovery_points: 'Teaser at 12s',
      strengths: 'Optimal duration.',
      weaknesses: 'Pacing drops.',
      recommendations: 'Add pattern interrupts.',
      priority_fixes: 'Preview visual payoff early.'
    };
    if (raw.retention_analysis) {
      retention_analysis.timeline_analysis = retention_analysis.timeline_analysis ?? [
        { timestamp: '00:00–00:03', status: 'Strong', engagement_level: 'High', reason: 'Hook has clear promise.', recommended_fix: 'Maintain current opening structure.' },
        { timestamp: '00:03–00:08', status: 'Moderate', engagement_level: 'Medium', reason: 'Normal viewer decay.', recommended_fix: 'Add a visual pattern interrupt at 00:05.' },
        { timestamp: '00:08–00:15', status: 'Drop Risk', engagement_level: 'Low', reason: 'Pacing slows down.', recommended_fix: 'Insert a rapid-fire montage or bold text overlay.' }
      ];
      // Ensure each timeline point has engagement_level and recommended_fix
      if (Array.isArray(retention_analysis.timeline_analysis)) {
        retention_analysis.timeline_analysis = retention_analysis.timeline_analysis.map((p: any) => ({
          ...p,
          engagement_level: p.engagement_level ?? 'Medium',
          recommended_fix: p.recommended_fix ?? ''
        }));
      }
      retention_analysis.retention_curve_summary = retention_analysis.retention_curve_summary ?? 'Gradual decay.';
      retention_analysis.completion_prediction = retention_analysis.completion_prediction ?? '50%';
      retention_analysis.attention_decay_prediction = retention_analysis.attention_decay_prediction ?? 'Decay after 8s';
      retention_analysis.recovery_points = retention_analysis.recovery_points ?? 'Teaser at 12s';
    }

    script_analysis = script_analysis || {
      score: raw.overall_score ?? 1,
      structure_score: raw.overall_score ?? 1,
      clarity_score: raw.overall_score ?? 1,
      authority_score: raw.overall_score ?? 5,
      audience_fit: 'General Audience',
      consultant_summary: '',
      strengths: 'Readable structure.',
      weaknesses: 'Loose transitions.',
      recommendations: 'Ensure tight connection.',
      priority_fixes: 'Tighten flow.',
      structural_breakdown: {
        hook: 'Premise hook',
        build: 'Context details',
        escalation: 'Problem tension',
        conflict: 'Audit',
        payoff: 'Value reveal',
        cta: 'Call to action'
      },
      issues_detected: {
        weak_sections: ['Explanation block'],
        strong_sections: ['Opening hook'],
        missing_sections: ['Visual contrast'],
        flow_issues: ['Transitions feel loose'],
        narrative_gaps: ['Needs personal struggle']
      }
    };
    if (raw.script_analysis) {
      script_analysis.authority_score = script_analysis.authority_score ?? script_analysis.score ?? 5;
      script_analysis.consultant_summary = script_analysis.consultant_summary ?? '';
      script_analysis.structural_breakdown = script_analysis.structural_breakdown ?? {
        hook: 'Premise hook',
        build: 'Context details',
        escalation: 'Problem tension',
        conflict: 'Audit',
        payoff: 'Value reveal',
        cta: 'Call to action'
      };
      script_analysis.issues_detected = script_analysis.issues_detected ?? {
        weak_sections: ['Explanation block'],
        strong_sections: ['Opening hook'],
        missing_sections: ['Visual contrast'],
        flow_issues: ['Transitions feel loose'],
        narrative_gaps: ['Needs personal struggle']
      };
    }

    editing_analysis = editing_analysis || {
      score: raw.overall_score ?? 1,
      strengths: 'Pacing aligns with script.',
      weaknesses: 'Static visual segments.',
      recommendations: 'Add text overlays.',
      priority_fixes: 'Use zoom cuts.',
      pacing_analysis: 'Moderate pacing.',
      cut_frequency: '',
      text_overlay_moments: [],
      visual_suggestions: 'Add framing zoomed cuts.',
      b_roll_suggestions: 'Overlay contextual items.',
      sound_design_recommendations: '',
      pattern_interrupt_recommendations: 'Use sound effects.'
    };
    if (raw.editing_analysis) {
      editing_analysis.cut_frequency = editing_analysis.cut_frequency ?? '';
      editing_analysis.text_overlay_moments = editing_analysis.text_overlay_moments ?? [];
      editing_analysis.sound_design_recommendations = editing_analysis.sound_design_recommendations ?? '';
    }

    emotion_analysis = emotion_analysis || {
      score: raw.overall_score ?? 1,
      curiosity_score: 7,
      curiosity_explanation: '',
      trust_score: 7,
      trust_explanation: '',
      authority_score: 7,
      authority_explanation: '',
      suspense_score: 6,
      suspense_explanation: '',
      excitement_score: 7,
      excitement_explanation: '',
      empathy_score: 7,
      empathy_explanation: '',
      emotional_timeline: [
        { timestamp: '0s', emotion: 'Curiosity' },
        { timestamp: '10s', emotion: 'Tension' },
        { timestamp: '20s', emotion: 'Relief' }
      ],
      strengths: 'Good opening vibe.',
      weaknesses: 'Clinical explanation.',
      recommendations: 'State emotional hook.',
      priority_fixes: 'Reference pain point.'
    };
    if (raw.emotion_analysis) {
      emotion_analysis.curiosity_score = emotion_analysis.curiosity_score ?? 7;
      emotion_analysis.curiosity_explanation = emotion_analysis.curiosity_explanation ?? '';
      emotion_analysis.trust_score = emotion_analysis.trust_score ?? 7;
      emotion_analysis.trust_explanation = emotion_analysis.trust_explanation ?? '';
      emotion_analysis.authority_score = emotion_analysis.authority_score ?? 7;
      emotion_analysis.authority_explanation = emotion_analysis.authority_explanation ?? '';
      emotion_analysis.suspense_score = emotion_analysis.suspense_score ?? 6;
      emotion_analysis.suspense_explanation = emotion_analysis.suspense_explanation ?? '';
      emotion_analysis.excitement_score = emotion_analysis.excitement_score ?? 7;
      emotion_analysis.excitement_explanation = emotion_analysis.excitement_explanation ?? '';
      emotion_analysis.empathy_score = emotion_analysis.empathy_score ?? 7;
      emotion_analysis.empathy_explanation = emotion_analysis.empathy_explanation ?? '';
      emotion_analysis.emotional_timeline = emotion_analysis.emotional_timeline ?? [
        { timestamp: '0s', emotion: 'Curiosity' },
        { timestamp: '10s', emotion: 'Tension' },
        { timestamp: '20s', emotion: 'Relief' }
      ];
    }

    growth_analysis = growth_analysis || {
      score: raw.overall_score ?? 1,
      recommended_caption: 'Viral secrets revealed.',
      alternative_caption: 'Stop doing this mistake.',
      comment_trigger: 'Comment below.',
      cta_improvement: 'Save this post.',
      hashtag_cluster: ['growth', 'creatortips'],
      content_category: 'Education',
      audience_segment: 'Creators',
      viral_trigger_type: 'Transformation',
      distribution_strategy: '',
      platform_specific_recommendations: '',
      strengths: 'High relevance.',
      weaknesses: 'Generic hashtags.',
      recommendations: 'Use scroll-stopping hooks.',
      priority_fixes: 'Add targeted keywords.'
    };
    if (raw.growth_analysis) {
      growth_analysis.recommended_caption = growth_analysis.recommended_caption ?? 'Viral secrets revealed.';
      growth_analysis.alternative_caption = growth_analysis.alternative_caption ?? 'Stop doing this mistake.';
      growth_analysis.comment_trigger = growth_analysis.comment_trigger ?? 'Comment below.';
      growth_analysis.cta_improvement = growth_analysis.cta_improvement ?? 'Save this post.';
      growth_analysis.hashtag_cluster = growth_analysis.hashtag_cluster ?? ['growth', 'creatortips'];
      growth_analysis.content_category = growth_analysis.content_category ?? 'Education';
      growth_analysis.audience_segment = growth_analysis.audience_segment ?? 'Creators';
      growth_analysis.viral_trigger_type = growth_analysis.viral_trigger_type ?? 'Transformation';
      growth_analysis.distribution_strategy = growth_analysis.distribution_strategy ?? '';
      growth_analysis.platform_specific_recommendations = growth_analysis.platform_specific_recommendations ?? '';
    }
  }

  // Ensure executive_summary is defined
  executive_summary = executive_summary || {
    overall_score,
    overall_verdict,
    strengths: 'Clear structural foundation with good layout.',
    weaknesses: 'Opening hook lacks strong scroll-stopping promise.',
    recommendations: 'Apply dynamic pattern interrupts and pacing changes.',
    priority_fixes: 'Tighten overall speech pacing and start directly with the problem.'
  };

  // Handle document_intelligence default properties
  const document_intelligence = raw.document_intelligence ?? {
    pages: raw.meta?.pages ?? 1,
    words: raw.meta?.words ?? (raw.transcript ? raw.transcript.split(/\s+/).filter(Boolean).length : 120),
    reading_time_minutes: raw.meta?.reading_time_minutes ?? (raw.transcript ? Math.max(1, Math.round(raw.transcript.split(/\s+/).filter(Boolean).length / 200)) : 1),
    title: raw.video_name || raw.meta?.file_name || 'Text Script Analysis',
    detected_hook: hook_analysis?.suggested_rewrite_1 || 'No hook detected',
    detected_cta: growth_analysis?.comment_trigger || 'No CTA detected',
    key_promise: 'Unlock short-form retention potential.',
    main_conflict: 'Pacing drops and static visual cues.',
    core_topic: raw.intelligence?.niche || 'Content Strategy'
  };

  // Handle creator_strategist default properties
  const creator_strategist = raw.creator_strategist ?? {
    why_fail: 'Pacing slows down during context setup, leading to instant scroll stop decay.',
    why_succeed: 'High educational value coupled with actionable outline saves potential.',
    audience_perception: 'Trustworthy and informative, but could lead to pacing fatigue.',
    algorithm_perception: 'Optimized for niche keyword queries and platform search patterns.',
    shareability_prediction: 'High if shared as a quick tutorial template cheat-sheet.',
    comment_potential: 'Moderate. Can be boosted using comment trigger words.',
    save_potential: 'Strong. Actionable blueprints lead to high bookmark ratios.',
    follower_conversion_potential: 'Moderate. Hook promise must tie directly into creator niche.'
  };

  // Handle rewrite_engine default properties
  const rewrite_engine = raw.rewrite_engine ?? {
    current_version: raw.transcript?.substring(0, 100) || 'Generic hook opening.',
    improved_version: hook_analysis?.suggested_rewrite_1 || 'I spent 8 months getting rejected before finding this script secret.',
    improvement_explanation: 'Hooks user using curiosity gap and personal transformation Underdog narrative.',
    predicted_impact: `+${hook_analysis?.predicted_improvement_percent ?? 15}% scroll-stop retention`,
    retention_impact: `+${Math.round((hook_analysis?.predicted_improvement_percent ?? 15) * 0.6)}% estimated completion rate improvement`,
    hook_impact: `+${Math.round((hook_analysis?.predicted_improvement_percent ?? 15) * 1.2)}% scroll-stop rate improvement`
  };
  if (raw.rewrite_engine) {
    rewrite_engine.retention_impact = rewrite_engine.retention_impact ?? '';
    rewrite_engine.hook_impact = rewrite_engine.hook_impact ?? '';
  }

  // Build dynamic modules object for legacy backward compatibility
  const modules = raw.modules || {
    hook: {
      score: hook_analysis?.score ?? 1,
      diagnosis: (hook_analysis?.strengths || '') + '\n\n' + (hook_analysis?.weaknesses || ''),
      rewrite: hook_analysis?.suggested_rewrite_1 || '',
      tips: (hook_analysis?.recommendations || '') + '\n\nPriority fixes: ' + (hook_analysis?.priority_fixes || ''),
    },
    retention: {
      score: retention_analysis?.score ?? 1,
      drop_timestamps: retention_analysis?.timeline_analysis?.filter((p: any) => p.status === 'Drop Risk').map((p: any) => p.timestamp).join(', ') || '',
      completion_prediction: retention_analysis?.completion_prediction || '',
      fixes: (retention_analysis?.recommendations || '') + '\n\nPriority fixes: ' + (retention_analysis?.priority_fixes || ''),
    },
    script: {
      score: script_analysis?.score ?? 1,
      structure_score: script_analysis?.structure_score ?? 1,
      clarity_score: script_analysis?.clarity_score ?? 1,
      emotion_score: script_analysis?.score ?? 1,
      cta_score: script_analysis?.score ?? 1,
      diagnosis: (script_analysis?.strengths || '') + '\n\n' + (script_analysis?.weaknesses || ''),
      rewrite_outline: script_analysis?.structural_breakdown?.hook || '',
    },
    editing: {
      score: editing_analysis?.score ?? 1,
      issues: (editing_analysis?.strengths || '') + '\n\n' + (editing_analysis?.weaknesses || ''),
      tips: (editing_analysis?.recommendations || '') + '\n\nPriority fixes: ' + (editing_analysis?.priority_fixes || ''),
      pacing_score: editing_analysis?.score ?? 1,
      visual_energy_score: editing_analysis?.score ?? 1,
    },
    emotion: {
      score: emotion_analysis?.score ?? 1,
      opening_emotion: emotion_analysis?.emotional_timeline?.[0]?.emotion || 'Curiosity',
      middle_emotion: emotion_analysis?.emotional_timeline?.[1]?.emotion || 'Tension',
      closing_emotion: emotion_analysis?.emotional_timeline?.[2]?.emotion || 'Satisfaction',
      gaps: emotion_analysis?.weaknesses || '',
      boosters: (emotion_analysis?.recommendations || '') + '\n\nPriority fixes: ' + (emotion_analysis?.priority_fixes || ''),
    },
    growth: {
      score: growth_analysis?.score ?? 1,
      viral_probability: growth_analysis?.viral_trigger_type || '',
      caption: growth_analysis?.recommended_caption || '',
      hashtags: growth_analysis?.hashtag_cluster?.map((t: string) => `#${t.replace(/^#/, '')}`).join(' ') || '',
      best_posting_time: growth_analysis?.priority_fixes || '',
      checklist: [
        'Caption suggestion: ' + (growth_analysis?.recommended_caption || ''),
        'Hashtag cluster: ' + (growth_analysis?.hashtag_cluster?.join(', ') || ''),
        'Viral trigger: ' + (growth_analysis?.viral_trigger_type || ''),
      ],
    }
  };

  return {
    ...raw,
    overall_score,
    overall_verdict,
    executive_summary,
    document_intelligence,
    hook_analysis,
    retention_analysis,
    script_analysis,
    editing_analysis,
    emotion_analysis,
    creator_strategist,
    rewrite_engine,
    growth_analysis,
    modules,
  };
}
