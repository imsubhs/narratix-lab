import type { ProviderName } from './config';

/** Classified provider failure modes. Drives retry/skip/circuit decisions. */
export type AiErrorKind =
  | 'auth' // 401/403 — key invalid or unauthorized; never retried
  | 'model_not_found' // 404 — configured model is wrong/retired; never retried
  | 'rate_limit' // 429 — retryable with backoff
  | 'overloaded' // 529/503 — retryable with backoff
  | 'server_error' // other 5xx — retryable once
  | 'timeout'
  | 'network'
  | 'invalid_response' // response arrived but wasn't valid/complete analysis JSON
  | 'unknown';

const RETRYABLE_KINDS: ReadonlySet<AiErrorKind> = new Set<AiErrorKind>([
  'rate_limit',
  'overloaded',
  'server_error',
  'timeout',
  'network',
]);

export function isRetryableKind(kind: AiErrorKind): boolean {
  return RETRYABLE_KINDS.has(kind);
}

/**
 * Strip anything secret-shaped from error text before it reaches logs or
 * telemetry: provider keys, bearer tokens, JWTs.
 */
export function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/sk-[A-Za-z0-9_-]{10,}/g, 'sk-***')
    .replace(/Bearer\s+[A-Za-z0-9._-]{10,}/gi, 'Bearer ***')
    .replace(/eyJ[A-Za-z0-9._-]{20,}/g, 'jwt***');
}

export class ProviderError extends Error {
  readonly kind: AiErrorKind;
  readonly provider: ProviderName;
  readonly status: number | null;
  readonly requestId: string | null;

  constructor(args: {
    provider: ProviderName;
    kind: AiErrorKind;
    message: string;
    status?: number | null;
    requestId?: string | null;
    cause?: unknown;
  }) {
    super(sanitizeErrorMessage(args.message));
    this.name = 'ProviderError';
    this.provider = args.provider;
    this.kind = args.kind;
    this.status = args.status ?? null;
    this.requestId = args.requestId ?? null;
    if (args.cause !== undefined) (this as any).cause = args.cause;
  }
}

export interface ProviderAttemptLog {
  provider: ProviderName;
  model: string;
  outcome: 'success' | AiErrorKind | 'skipped_unconfigured' | 'skipped_circuit_open';
  status: number | null;
  requestId: string | null;
  latencyMs: number | null;
  error: string | null;
}

/**
 * Thrown when every configured provider failed. The route converts this into
 * an honest user-facing failure (Basic Creator Diagnostics) — never a report.
 */
export class AiUnavailableError extends Error {
  readonly attempts: ProviderAttemptLog[];

  constructor(attempts: ProviderAttemptLog[]) {
    super(
      `AI analysis unavailable: all providers failed (${attempts
        .map((a) => `${a.provider}:${a.outcome}`)
        .join(', ') || 'no providers configured'})`
    );
    this.name = 'AiUnavailableError';
    this.attempts = attempts;
  }
}
