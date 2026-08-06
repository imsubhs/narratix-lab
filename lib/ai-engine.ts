/**
 * AI engine facade — Stage 2 reconstruction.
 *
 * The Stage 1 implementation lived entirely in this file: inline prompt,
 * hardcoded (retired) model, silent provider waterfall and the
 * createFallbackAnalysis() template engine that fabricated reports. All of
 * that is replaced by lib/ai/*:
 *
 *   lib/ai/engine.ts       — provider orchestration, retries, circuit breaker
 *   lib/ai/providers/*     — Anthropic / OpenAI adapters behind one interface
 *   lib/ai/prompts.ts      — versioned prompts (evidence/reasoning/confidence)
 *   lib/ai/validate.ts     — strict response validation (no padding)
 *   lib/ai/basic-diagnostics.ts — honest degradation when AI is unavailable
 *   lib/ai/health.ts       — provider health probes + circuit state
 *   lib/ai/telemetry.ts    — structured, secret-safe logging
 *
 * Contract: analyzeTextContent resolves ONLY with a genuine, validated LLM
 * report. When no provider can produce one it throws AiUnavailableError —
 * callers must degrade honestly (Basic Creator Diagnostics), never fabricate.
 */
import { runCreatorIntelligenceAnalysis, type AnalysisRunMeta } from './ai/engine';
import { buildDemoAnalysis, isDemoMode } from './ai/demo';
import type { AnalysisResult } from './ai-engine-client';

export * from './ai-engine-client';
export { AiUnavailableError } from './ai/errors';
export { PROMPT_VERSION } from './ai/prompts';
export type { AnalysisRunMeta } from './ai/engine';

export interface TextAnalysisContext {
  niche: string;
  platform: string;
  script: string;
  videoLength?: string;
  goal?: string;
  concern?: string;
}

export async function analyzeTextContent(
  context: TextAnalysisContext
): Promise<{ results: AnalysisResult; transcript: string; meta: AnalysisRunMeta }> {
  // DEMO_MODE: serve the curated gold-standard report with zero API cost. The
  // live provider pipeline below stays intact for when demo mode is disabled.
  if (isDemoMode()) {
    const { results, meta } = buildDemoAnalysis(context);
    return { results, transcript: context.script, meta };
  }

  const { results, meta } = await runCreatorIntelligenceAnalysis(context);
  return { results, transcript: context.script, meta };
}
