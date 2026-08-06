import { AI_CONFIG, isConfiguredSecret } from '../config';
import { ProviderError, isRetryableKind, type AiErrorKind } from '../errors';
import { logAiEvent } from '../telemetry';
import type { ChatMessage, ProviderAdapter, ProviderResponse } from './types';

/**
 * OpenRouter provider — transport adapter only.
 *
 * OpenRouter exposes an OpenAI-compatible Chat Completions API, so this adapter
 * only adapts *transport*: it does not touch prompts, report parsing, validation
 * or orchestration. It normalizes the wire response into the shared
 * ProviderResponse, and every failure mode is mapped onto the existing typed
 * AiErrorKind taxonomy so the engine's retry/circuit/fallback logic works
 * identically to Anthropic and OpenAI.
 *
 * Stage 6B root-cause fix: Node's undici `fetch()` has NO default request
 * timeout. The previous implementation issued a bare `await fetch(...)` with no
 * AbortSignal, so a stalled free-tier generation would never settle — the
 * invoke() promise hung forever, `analyzing:done` never fired, `writer.close()`
 * never ran, and the SSE stream froze the UI at 50%. This adapter now enforces
 * a hard wall-clock timeout via AbortController, retries only transient
 * failures with exponential backoff, and emits per-attempt lifecycle telemetry.
 */

function classifyStatus(status: number): AiErrorKind {
  if (status === 401 || status === 403) return 'auth';
  if (status === 404) return 'model_not_found';
  if (status === 429) return 'rate_limit';
  if (status === 503) return 'overloaded';
  if (status >= 500) return 'server_error';
  return 'unknown';
}

async function safeErrorText(res: Response): Promise<string> {
  try {
    const body = await res.text();
    if (!body) return `HTTP ${res.status}`;
    try {
      const json = JSON.parse(body);
      const message = json?.error?.message ?? json?.message;
      return typeof message === 'string' && message ? message : body.slice(0, 500);
    } catch {
      return body.slice(0, 500);
    }
  } catch {
    return `HTTP ${res.status}`;
  }
}

/** Short, non-secret correlation id so a single logical invoke() is traceable across retries. */
function newRequestId(): string {
  const rand = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  return `or-${Date.now().toString(36)}-${rand}`;
}

export function createOpenRouterAdapter(): ProviderAdapter {
  const { model, maxOutputTokens, baseUrl, referer, title, timeoutMs, maxAttempts, retryBaseDelayMs } =
    AI_CONFIG.openrouter;

  return {
    name: 'openrouter',
    model,

    isConfigured() {
      return isConfiguredSecret(process.env.OPENROUTER_API_KEY);
    },

    async invoke(systemPrompt: string, messages: ChatMessage[]): Promise<ProviderResponse> {
      const clientRequestId = newRequestId();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      };
      // Optional attribution headers — only sent when configured.
      if (referer) headers['HTTP-Referer'] = referer;
      if (title) headers['X-Title'] = title;

      const body = JSON.stringify({
        model,
        max_tokens: maxOutputTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      });
      const requestBytes = Buffer.byteLength(body);

      // Attempt loop: only transient failures are retried, with exponential backoff.
      let lastError: ProviderError | null = null;
      for (let attempt = 1; attempt <= Math.max(1, maxAttempts); attempt++) {
        const startedAt = Date.now();
        // A fresh controller per attempt so a prior timeout can't abort a retry.
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
          logAiEvent({
            event: 'ai_attempt',
            provider: 'openrouter',
            model,
            requestId: clientRequestId,
            outcome: 'request_start',
            attempt,
            requestBytes,
            maxTokens: maxOutputTokens,
            timeoutMs,
            promptVersion: undefined,
          });

          let res: Response;
          try {
            res = await fetch(`${baseUrl}/chat/completions`, {
              method: 'POST',
              headers,
              cache: 'no-store',
              signal: controller.signal,
              body,
            });
          } catch (err) {
            const aborted =
              controller.signal.aborted ||
              (err instanceof Error && /abort/i.test(err.name + err.message));
            const message = aborted
              ? `OpenRouter request exceeded ${timeoutMs}ms timeout`
              : err instanceof Error
                ? err.message
                : String(err);
            throw new ProviderError({
              provider: 'openrouter',
              kind: aborted ? 'timeout' : 'network',
              requestId: clientRequestId,
              message: message || 'OpenRouter network error',
              cause: err,
            });
          }

          const ttfbMs = Date.now() - startedAt;
          const providerRequestId = res.headers.get('x-request-id');

          if (!res.ok) {
            throw new ProviderError({
              provider: 'openrouter',
              kind: classifyStatus(res.status),
              status: res.status,
              requestId: providerRequestId ?? clientRequestId,
              message: await safeErrorText(res),
            });
          }

          const rawBody = await res.text();
          const responseBytes = Buffer.byteLength(rawBody);
          const totalMs = Date.now() - startedAt;

          let data: any;
          try {
            data = JSON.parse(rawBody);
          } catch (err) {
            // A 200 with unparseable body is an invalid response, not a report.
            throw new ProviderError({
              provider: 'openrouter',
              kind: 'invalid_response',
              status: res.status,
              requestId: providerRequestId ?? clientRequestId,
              message: 'OpenRouter returned a non-JSON body',
              cause: err,
            });
          }

          // OpenRouter surfaces upstream provider errors inside a 200 envelope.
          if (data?.error) {
            const status = typeof data.error.code === 'number' ? data.error.code : res.status;
            throw new ProviderError({
              provider: 'openrouter',
              kind: classifyStatus(status),
              status,
              requestId: providerRequestId ?? clientRequestId,
              message:
                typeof data.error.message === 'string' ? data.error.message : 'OpenRouter error',
            });
          }

          const choice = data?.choices?.[0];
          const response: ProviderResponse = {
            text: choice?.message?.content ?? '',
            requestId: data?.id ?? providerRequestId ?? clientRequestId,
            promptTokens: data?.usage?.prompt_tokens ?? null,
            completionTokens: data?.usage?.completion_tokens ?? null,
            stopReason: choice?.finish_reason ?? null,
          };

          logAiEvent({
            event: 'ai_attempt',
            provider: 'openrouter',
            model,
            requestId: response.requestId,
            outcome: 'transport_ok',
            attempt,
            latencyMs: totalMs,
            ttfbMs,
            requestBytes,
            responseBytes,
            promptTokens: response.promptTokens,
            completionTokens: response.completionTokens,
            stopReason: response.stopReason,
          });

          return response;
        } catch (err) {
          // The abort can fire at any await inside the try — the initial fetch,
          // reading headers, or streaming the body. Any of those means we hit
          // the wall-clock ceiling, so classify uniformly as `timeout` (which
          // is retryable) rather than letting a body-read abort leak as `unknown`.
          const aborted =
            controller.signal.aborted ||
            (err instanceof Error && /abort/i.test(`${err.name} ${err.message}`));
          const providerError =
            err instanceof ProviderError
              ? err
              : new ProviderError({
                  provider: 'openrouter',
                  kind: aborted ? 'timeout' : 'unknown',
                  requestId: clientRequestId,
                  message: aborted
                    ? `OpenRouter request exceeded ${timeoutMs}ms timeout`
                    : err instanceof Error
                      ? err.message
                      : String(err),
                  cause: err,
                });
          lastError = providerError;

          logAiEvent({
            event: 'ai_attempt',
            provider: 'openrouter',
            model,
            requestId: providerError.requestId,
            outcome: providerError.kind,
            attempt,
            latencyMs: Date.now() - startedAt,
            errorKind: providerError.kind,
            errorStatus: providerError.status,
            errorMessage: providerError.message,
          });

          // Retry only transient failures, and only if attempts remain.
          const canRetry = isRetryableKind(providerError.kind) && attempt < Math.max(1, maxAttempts);
          if (!canRetry) throw providerError;

          // Exponential backoff: base * 2^(attempt-1).
          const backoff = retryBaseDelayMs * 2 ** (attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, backoff));
        } finally {
          // Always release the timer — no dangling handles, no hanging promises.
          clearTimeout(timer);
        }
      }

      // Unreachable in practice (the loop either returns or throws), but keeps
      // the type checker honest and guarantees we never silently resolve.
      throw (
        lastError ??
        new ProviderError({
          provider: 'openrouter',
          kind: 'unknown',
          requestId: clientRequestId,
          message: 'OpenRouter invoke exhausted all attempts without a result',
        })
      );
    },
  };
}
