import { AI_CONFIG, ANALYSIS_VERSION, estimateCostUsd, type ProviderName } from './config';
import {
  AiUnavailableError,
  ProviderError,
  isRetryableKind,
  sanitizeErrorMessage,
  type ProviderAttemptLog,
} from './errors';
import { circuitOpen, closeCircuit, openCircuit } from './health';
import {
  PROMPT_VERSION,
  buildCorrectionPrompt,
  buildSystemPrompt,
  buildUserPrompt,
  type AnalysisPromptContext,
} from './prompts';
import { createAnthropicAdapter } from './providers/anthropic';
import { createOpenAIAdapter } from './providers/openai';
import { createOpenRouterAdapter } from './providers/openrouter';
import type { ChatMessage, ProviderAdapter, ProviderResponse } from './providers/types';
import { logAiEvent } from './telemetry';
import { AiResponseParseError, extractJsonObject, validateAnalysisResult } from './validate';
import { normalizeNaxResult, type AnalysisResult } from '../ai-engine-client';

export interface AnalysisRunMeta {
  /**
   * Which provider actually produced the report. Full reports are LLM-only,
   * except in DEMO_MODE where a curated gold-standard report is served and this
   * is stamped 'demo' (never misrepresented as a live generation).
   */
  generationSource: ProviderName | 'demo';
  /** Provenance: the provider family. Mirrors generationSource. */
  provider: ProviderName | 'demo';
  /** Provenance: version of the analysis engine (see ANALYSIS_VERSION). */
  analysisVersion: string;
  model: string;
  requestId: string | null;
  latencyMs: number;
  promptTokens: number | null;
  completionTokens: number | null;
  estimatedCostUsd: number | null;
  promptVersion: string;
  /** Always false on a returned report: fallback never yields a report. */
  fallbackTriggered: false;
  attempts: ProviderAttemptLog[];
}

function defaultAdapters(): ProviderAdapter[] {
  const byName: Record<ProviderName, () => ProviderAdapter> = {
    anthropic: createAnthropicAdapter,
    openai: createOpenAIAdapter,
    openrouter: createOpenRouterAdapter,
  };
  return AI_CONFIG.providerOrder.map((name) => byName[name]());
}

async function invokeWithTransientRetry(
  adapter: ProviderAdapter,
  system: string,
  messages: ChatMessage[]
): Promise<ProviderResponse> {
  try {
    return await adapter.invoke(system, messages);
  } catch (err) {
    if (err instanceof ProviderError && isRetryableKind(err.kind)) {
      await new Promise((resolve) => setTimeout(resolve, AI_CONFIG.transientRetryDelayMs));
      return adapter.invoke(system, messages);
    }
    throw err;
  }
}

/**
 * Run the full Creator Intelligence analysis.
 *
 * Contract: resolves ONLY with a validated LLM-generated report. On any other
 * outcome it throws AiUnavailableError with a per-provider attempt log — the
 * caller is responsible for honest degradation (Basic Creator Diagnostics).
 */
export async function runCreatorIntelligenceAnalysis(
  context: AnalysisPromptContext,
  options?: { providers?: ProviderAdapter[] }
): Promise<{ results: AnalysisResult; meta: AnalysisRunMeta }> {
  const adapters = options?.providers ?? defaultAdapters();
  const system = buildSystemPrompt(context.platform);
  const userPrompt = buildUserPrompt(context);
  const attempts: ProviderAttemptLog[] = [];
  const runStartedAt = Date.now();

  for (const adapter of adapters) {
    if (!adapter.isConfigured()) {
      attempts.push({
        provider: adapter.name,
        model: adapter.model,
        outcome: 'skipped_unconfigured',
        status: null,
        requestId: null,
        latencyMs: null,
        error: 'API key not configured',
      });
      continue;
    }

    const circuit = circuitOpen(adapter.name);
    if (circuit) {
      attempts.push({
        provider: adapter.name,
        model: adapter.model,
        outcome: 'skipped_circuit_open',
        status: null,
        requestId: null,
        latencyMs: null,
        error: `circuit open: ${circuit.reason}`,
      });
      continue;
    }

    const messages: ChatMessage[] = [{ role: 'user', content: userPrompt }];
    const MAX_MODEL_CALLS = 2; // initial call + one corrective re-ask

    for (let call = 1; call <= MAX_MODEL_CALLS; call++) {
      const startedAt = Date.now();
      let response: ProviderResponse;
      try {
        response = await invokeWithTransientRetry(adapter, system, messages);
      } catch (err) {
        const providerError =
          err instanceof ProviderError
            ? err
            : new ProviderError({
                provider: adapter.name,
                kind: 'unknown',
                message: err instanceof Error ? err.message : String(err),
              });

        attempts.push({
          provider: adapter.name,
          model: adapter.model,
          outcome: providerError.kind,
          status: providerError.status,
          requestId: providerError.requestId,
          latencyMs: Date.now() - startedAt,
          error: providerError.message,
        });
        logAiEvent({
          event: 'ai_attempt',
          provider: adapter.name,
          model: adapter.model,
          requestId: providerError.requestId,
          latencyMs: Date.now() - startedAt,
          outcome: providerError.kind,
          errorKind: providerError.kind,
          errorStatus: providerError.status,
          errorMessage: providerError.message,
          promptVersion: PROMPT_VERSION,
        });

        // Configuration failures won't self-heal — stop hammering the provider.
        if (providerError.kind === 'auth' || providerError.kind === 'model_not_found') {
          openCircuit(adapter.name, `${providerError.kind} (HTTP ${providerError.status ?? '?'})`);
        }
        break; // give up on this provider, move to the next
      }

      const latencyMs = Date.now() - startedAt;
      try {
        const parsed = extractJsonObject(response.text);
        const validation = validateAnalysisResult(parsed);
        if (!validation.ok) throw new AiResponseParseError(validation.problems);

        closeCircuit(adapter.name);
        attempts.push({
          provider: adapter.name,
          model: adapter.model,
          outcome: 'success',
          status: 200,
          requestId: response.requestId,
          latencyMs,
          error: null,
        });

        const meta: AnalysisRunMeta = {
          generationSource: adapter.name,
          provider: adapter.name,
          analysisVersion: ANALYSIS_VERSION,
          model: adapter.model,
          requestId: response.requestId,
          latencyMs: Date.now() - runStartedAt,
          promptTokens: response.promptTokens,
          completionTokens: response.completionTokens,
          estimatedCostUsd: estimateCostUsd(
            adapter.model,
            response.promptTokens,
            response.completionTokens
          ),
          promptVersion: PROMPT_VERSION,
          fallbackTriggered: false,
          attempts,
        };

        logAiEvent({
          event: 'ai_analysis_complete',
          provider: adapter.name,
          model: adapter.model,
          requestId: response.requestId,
          latencyMs: meta.latencyMs,
          promptTokens: response.promptTokens,
          completionTokens: response.completionTokens,
          estimatedCostUsd: meta.estimatedCostUsd,
          promptVersion: PROMPT_VERSION,
          fallbackTriggered: false,
          outcome: 'success',
        });

        return { results: normalizeNaxResult(parsed), meta };
      } catch (err) {
        const problems =
          err instanceof AiResponseParseError
            ? err.problems
            : [sanitizeErrorMessage(err instanceof Error ? err.message : String(err))];

        attempts.push({
          provider: adapter.name,
          model: adapter.model,
          outcome: 'invalid_response',
          status: 200,
          requestId: response.requestId,
          latencyMs,
          error: `invalid response${response.stopReason === 'max_tokens' || response.stopReason === 'length' ? ' (output truncated at max_tokens)' : ''}: ${problems.join('; ')}`,
        });
        logAiEvent({
          event: 'ai_attempt',
          provider: adapter.name,
          model: adapter.model,
          requestId: response.requestId,
          latencyMs,
          promptTokens: response.promptTokens,
          completionTokens: response.completionTokens,
          outcome: 'invalid_response',
          errorKind: 'invalid_response',
          errorMessage: problems.join('; '),
          promptVersion: PROMPT_VERSION,
        });

        if (call < MAX_MODEL_CALLS) {
          messages.push(
            {
              role: 'assistant',
              content:
                response.text.slice(0, 4000) + (response.text.length > 4000 ? '\n…(truncated)' : ''),
            },
            { role: 'user', content: buildCorrectionPrompt(problems) }
          );
          continue; // one corrective re-ask on the same provider
        }
      }
    }
  }

  logAiEvent({
    event: 'ai_analysis_unavailable',
    latencyMs: Date.now() - runStartedAt,
    fallbackTriggered: true,
    promptVersion: PROMPT_VERSION,
    outcome: 'unavailable',
    attemptSummary: attempts.map((a) => `${a.provider}:${a.outcome}`).join(','),
  });

  throw new AiUnavailableError(attempts);
}
