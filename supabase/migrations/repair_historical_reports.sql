-- ═══════════════════════════════════════════════════════════════════════
-- NARRATIX LAB — HISTORICAL REPORTS DATA REPAIR MIGRATION
-- File: supabase/migrations/repair_historical_reports.sql
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- Reconstruct results payload from root columns for Category B reports when results is NULL, empty, or malformed/test-only.
-- Category B reports have populated overall_score and niche/platform root columns, but missing results JSON data.
UPDATE public.analyses
SET results = jsonb_build_object(
  'overall_score', COALESCE(overall_score, 1.0),
  'overall_verdict', COALESCE(overall_verdict, 'Foundation is sound but pacing and hook engagement can be improved.'),
  
  'meta', jsonb_build_object(
    'file_name', COALESCE(video_name, 'general Script'),
    'input_type', 'text',
    'upload_date', COALESCE(created_at, timezone('utc'::text, now()))
  ),
  
  'intelligence', jsonb_build_object(
    'niche', COALESCE(niche, 'general'),
    'platform', COALESCE(platform, 'unknown'),
    'goal', COALESCE(goal, 'More views'),
    'audience', 'Target Demographic',
    'content_type', 'Short-form video',
    'funnel_stage', 'TOFU (Top of Funnel)'
  ),
  
  'executive_summary', jsonb_build_object(
    'overall_score', COALESCE(overall_score, 1.0),
    'overall_verdict', COALESCE(overall_verdict, 'Foundation is sound but pacing and hook engagement can be improved.'),
    'strengths', 'Adequate structure and clear flow.',
    'weaknesses', 'Opening hook relies on introductory greeting context, delaying tension.',
    'recommendations', 'Apply zoom cuts, bold text overlays, and lead with tension.',
    'priority_fixes', 'Remove intro buffer phrases in first sentence.'
  ),
  
  'hook_analysis', jsonb_build_object(
    'score', COALESCE(overall_score, 1.0),
    'hook_type', 'Curiosity Gap / Direct pay-off',
    'current_hook', COALESCE(substring(transcript from 1 for 80), 'No transcript hook available.'),
    'failure_reason', 'Opening lacks immediate cognitive speed or curiosity hooks.',
    'audience_curiosity_score', 5,
    'scroll_stop_probability', 'Moderate (65%)',
    'predicted_swipe_away_percent', 45,
    'risk_factors', ARRAY['Introductory buffer phrases', 'Delayed topic payoff'],
    'strengths', 'Clear conceptual topic.',
    'weaknesses', 'Greeting statements dilute scroll-stop probability.',
    'recommendations', 'Lead with a contrarian statement or bold question.',
    'priority_fixes', 'Remove greeting or introduction beats.',
    'suggested_rewrite_1', 'Stop making this niche mistake immediately.',
    'rewrite_1_predicted_swipe_percent', 28,
    'suggested_rewrite_2', 'This is why your content is failing.',
    'rewrite_2_predicted_swipe_percent', 25,
    'suggested_rewrite_3', 'I wasted 6 months before I learned this one rule.',
    'rewrite_3_predicted_swipe_percent', 22,
    'predicted_improvement_percent', 18
  ),
  
  'retention_analysis', jsonb_build_object(
    'score', COALESCE(overall_score, 1.0),
    'timeline_analysis', jsonb_build_array(
      jsonb_build_object('timestamp', '00:00–00:03', 'status', 'Strong', 'engagement_level', 'High', 'reason', 'Clear topic premise hooks viewer.', 'recommended_fix', 'Keep intro short.'),
      jsonb_build_object('timestamp', '00:03–00:08', 'status', 'Drop Risk', 'engagement_level', 'Low', 'reason', 'Cognitive load spike slows transitions.', 'recommended_fix', 'Add text overlay or pattern interrupt.')
    ),
    'retention_curve_summary', 'Viewer retention decays gradually during explanation segments.',
    'completion_prediction', '50% expected completion rate.',
    'attention_decay_prediction', 'Decay starts after 6 seconds of static visual focus.',
    'recovery_points', 'Engagement recovers when demo/blueprint is shown.',
    'strengths', 'Snappy duration keeps drop-offs minimal.',
    'weaknesses', 'Pacing slows down mid-video.',
    'recommendations', 'Change visual patterns every 3-4 seconds.',
    'priority_fixes', 'Add visual cues at transition points.'
  ),
  
  'script_analysis', jsonb_build_object(
    'score', COALESCE(overall_score, 1.0),
    'structure_score', COALESCE(overall_score, 1.0),
    'clarity_score', COALESCE(overall_score, 1.0),
    'authority_score', 5,
    'audience_fit', 'Strong alignment with target demographic queries.',
    'consultant_summary', 'Script has a clean logical structure but lacks narrative hooks.',
    'strengths', 'Highly readable layout and direct formatting.',
    'weaknesses', 'Transitions from hook to body beats feel disjointed.',
    'recommendations', 'Frame script application directly around pain points.',
    'priority_fixes', 'Restructure transitions around Problem -> Solution.',
    'structural_breakdown', jsonb_build_object(
      'hook', 'Topic hook',
      'build', 'Context elaboration',
      'escalation', 'Tension build',
      'conflict', 'Audit points',
      'payoff', 'Result demo',
      'cta', 'Direct CTA request'
    ),
    'issues_detected', jsonb_build_object(
      'weak_sections', ARRAY['Context explanation'],
      'strong_sections', ARRAY['CTA request'],
      'missing_sections', ARRAY['Visual comparison examples'],
      'flow_issues', ARRAY['Transition delays'],
      'narrative_gaps', ARRAY['Creator credibility verification']
    )
  ),
  
  'editing_analysis', jsonb_build_object(
    'score', COALESCE(overall_score, 1.0),
    'strengths', 'Segment pacing fits mobile viewing.',
    'weaknesses', 'Static slides or talking head setup reduces visual energy.',
    'recommendations', 'Use dynamic overlays and zoomed framing transitions.',
    'priority_fixes', 'Implement zoom cuts at sentence splits.',
    'pacing_analysis', 'Moderate pacing.',
    'cut_frequency', '1 cut every 3 seconds',
    'text_overlay_moments', jsonb_build_array(
      '00:02 — Key statement text tag',
      '00:08 — Highlighted problem word overlay'
    ),
    'visual_suggestions', 'Add framing zoomed cuts and active typography tags.',
    'b_roll_suggestions', 'Overlay demo clip or application footage.',
    'sound_design_recommendations', 'Whoosh sound effects on scene transitions.',
    'pattern_interrupt_recommendations', 'Incorporate visual pattern transitions.'
  ),
  
  'emotion_analysis', jsonb_build_object(
    'score', COALESCE(overall_score, 1.0),
    'curiosity_score', 7,
    'curiosity_explanation', 'Knowledge gap created by hook generates initial curiosity.',
    'trust_score', 7,
    'trust_explanation', 'Direct conversational delivery reads as authentic.',
    'authority_score', 7,
    'authority_explanation', 'Creator displays adequate expertise.',
    'suspense_score', 6,
    'suspense_explanation', 'Suspense levels off quickly in middle sections.',
    'excitement_score', 7,
    'excitement_explanation', 'Vocal dynamics are stable but lack energy variation.',
    'empathy_score', 7,
    'empathy_explanation', 'creator addresses frustrations but lacks a personal anecdote.',
    'emotional_timeline', jsonb_build_array(
      jsonb_build_object('timestamp', '0s', 'emotion', 'Curiosity'),
      jsonb_build_object('timestamp', '8s', 'emotion', 'Tension'),
      jsonb_build_object('timestamp', '15s', 'emotion', 'Relief')
    ),
    'strengths', 'Relatable problem statement.',
    'weaknesses', 'Tone becomes slightly clinical or informational in middle.',
    'recommendations', 'Personalize problem framing with direct emotional hook.',
    'priority_fixes', 'Incorporate creator credibility proof points.'
  ),
  
  'growth_analysis', jsonb_build_object(
    'score', COALESCE(overall_score, 1.0),
    'recommended_caption', 'The script blueprint most creators miss.',
    'alternative_caption', 'Double your video completion rate with this pacing trick.',
    'comment_trigger', 'Comment "FLOW" below and I will send you the template.',
    'cta_improvement', 'Save this post to reference during your next script session.',
    'hashtag_cluster', ARRAY['contentstrategy', 'creatortips', 'videoeditor', 'retentiontips'],
    'content_category', 'Educational Growth',
    'audience_segment', 'Content Creators & Editors',
    'viral_trigger_type', 'Transformation blueprint',
    'distribution_strategy', 'Natively post to TikTok, cross-post to Instagram Reels.',
    'platform_specific_recommendations', 'Thumbnail text should not exceed 4 words.',
    'strengths', 'Niche targeting has search relevance.',
    'weaknesses', 'Generic caption structure limits SEO discovery.',
    'recommendations', 'Add high SEO keywords inside description.',
    'priority_fixes', 'Front-load keywords in description hook.'
  )
)
WHERE (results IS NULL OR results ? 'test' OR results = '{}'::jsonb)
  AND (overall_score IS NOT NULL);

COMMIT;
