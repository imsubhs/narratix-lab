import { estimateCostUsd } from './config';
import { sanitizeErrorMessage } from './errors';

/**
 * Structured, secret-safe telemetry for the AI pipeline.
 * One JSON object per line under the [ai-telemetry] prefix so serverless log
 * drains (Vercel, Datadog, etc.) can parse events without custom regex.
 */
export interface AiTelemetryEvent {
  event:
    | 'ai_attempt'
    | 'ai_analysis_complete'
    | 'ai_analysis_unavailable'
    | 'ai_health_check'
    | 'ai_usage_refund';
  provider?: string;
  model?: string;
  requestId?: string | null;
  latencyMs?: number | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  estimatedCostUsd?: number | null;
  promptVersion?: string;
  fallbackTriggered?: boolean;
  outcome?: string;
  errorKind?: string;
  errorStatus?: number | null;
  errorMessage?: string | null;
  [key: string]: unknown;
}

export function logAiEvent(event: AiTelemetryEvent): void {
  const payload: AiTelemetryEvent = {
    ...event,
    ts: new Date().toISOString(),
  };
  if (typeof payload.errorMessage === 'string') {
    payload.errorMessage = sanitizeErrorMessage(payload.errorMessage).slice(0, 500);
  }
  // console.log keeps this visible in every deploy target without new deps.
  console.log('[ai-telemetry]', JSON.stringify(payload));
}

export function buildUsageFields(
  model: string,
  promptTokens: number | null,
  completionTokens: number | null
) {
  return {
    promptTokens,
    completionTokens,
    estimatedCostUsd: estimateCostUsd(model, promptTokens, completionTokens),
  };
}
