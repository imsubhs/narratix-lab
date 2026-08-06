/**
 * Feature Flags - Narratix Lab Beta V1
 *
 * Beta V1 is the Creator Intelligence platform for script and content analysis.
 * V2 systems remain preserved behind flags so they can be activated without a
 * product rewrite.
 *
 * @see ADV_FEATURE_AUDIT.md for activation requirements per future feature.
 */
export const FEATURES = {
  /** Beta V1: email/password and Google OAuth auth remain available. */
  GOOGLE_AUTH: true,

  /** V2: video upload + Cloudinary processing pipeline. */
  VIDEO_UPLOAD: false,
  /** V2: full video intelligence surface. */
  VIDEO_ANALYSIS: false,
  /** V2: visual editing diagnostics. */
  EDITING_INTELLIGENCE: false,
  /** V2: caption generator. */
  CAPTION_GENERATOR: false,
  /** V2: hashtag optimizer. */
  HASHTAG_OPTIMIZER: false,
  /** V2: team workspace. */
  TEAM_WORKSPACE: false,
  /** V2: shared reports. */
  SHARED_REPORTS: false,
  /** V2: OpenAI Whisper transcription from audio. */
  WHISPER: false,
  /** V2: FFmpeg and frame extraction pipeline. */
  FRAME_EXTRACTION: false,
  /** V2: frame-level retention mapping. */
  FRAME_LEVEL_RETENTION: false,
  /** V2: viewer emotion tracking from video signals. */
  VIEWER_EMOTION_TRACKING: false,
  /** V2: rewrite engine execution. */
  CREATOR_REWRITE_ENGINE: false,
  /** V2: CTA generator. */
  CTA_GENERATOR: false,
  /** V2: shared workspaces. */
  SHARED_WORKSPACES: false,
  /** V2: team analytics. */
  TEAM_ANALYTICS: false,
  /** V2: collaboration tools. */
  COLLABORATION_TOOLS: false,
  /** V2: multi-brand management. */
  MULTI_BRAND: false,
  /** V2: client project folders. */
  CLIENT_PROJECT_FOLDERS: false,
  /** V2: creator performance tracking. */
  CREATOR_PERFORMANCE_TRACKING: false,
  /** V2: mobile app companion. */
  MOBILE: false,
} as const;

export type FeatureKey = keyof typeof FEATURES;

export const PRODUCT_POSITIONING = 'Creator Intelligence Platform for Script & Content Analysis';
export const BETA_VERSION_LABEL = 'Narratix Lab Beta V1';
export const BETA_BADGE = '🧪 Beta V1 — Script & Content Analysis';
export const VIDEO_V2_BADGE = 'Video Intelligence available in V2';

export const BETA_V1_MODULES = [
  {
    name: 'Hook Intelligence',
    purpose: 'Analyze hook effectiveness and scroll-stopping potential.',
  },
  {
    name: 'Retention Intelligence',
    purpose: 'Identify retention weaknesses and likely audience drop-off causes.',
  },
  {
    name: 'Script Architecture Analysis',
    purpose: 'Evaluate structure, pacing, clarity, flow, and storytelling.',
  },
  {
    name: 'Emotional Resonance Mapping',
    purpose: 'Analyze emotional engagement throughout content.',
  },
  {
    name: 'Growth Intelligence',
    purpose: 'Provide creator growth recommendations.',
  },
  {
    name: 'Creator Recommendations',
    purpose: 'Generate actionable improvements and optimization suggestions.',
  },
] as const;

export const V2_ROADMAP_FEATURES = [
  'Video Analysis',
  'Editing Intelligence',
  'Frame-Level Retention Mapping',
  'Viewer Emotion Tracking',
  'Creator Rewrite Engine',
  'Caption Generator',
  'Hashtag Optimizer',
  'CTA Generator',
  'Team Workspace',
  'Shared Reports',
  'Shared Workspaces',
  'Team Analytics',
  'Collaboration Tools',
  'Multi Brand Management',
  'Client Project Folders',
  'Creator Performance Tracking',
] as const;
