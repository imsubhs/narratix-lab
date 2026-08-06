import Anthropic from '@anthropic-ai/sdk';
import { AI_CONFIG, isConfiguredSecret } from '../config';
import { ProviderError, type AiErrorKind } from '../errors';
import type { ChatMessage, ProviderAdapter, ProviderResponse } from './types';

function classifyAnthropicError(err: unknown): { kind: AiErrorKind; status: number | null; requestId: string | null; message: string } {
  if (err instanceof Anthropic.APIError) {
    const status = typeof err.status === 'number' ? err.status : null;
    const requestId = (err as any).request_id ?? (err as any).requestID ?? null;
    const message = err.message || 'Anthropic API error';
    if (err instanceof Anthropic.AuthenticationError) return { kind: 'auth', status, requestId, message };
    if (err instanceof Anthropic.PermissionDeniedError) return { kind: 'auth', status, requestId, message };
    if (err instanceof Anthropic.NotFoundError) return { kind: 'model_not_found', status, requestId, message };
    if (err instanceof Anthropic.RateLimitError) return { kind: 'rate_limit', status, requestId, message };
    if (err instanceof Anthropic.APIConnectionTimeoutError) return { kind: 'timeout', status, requestId, message };
    if (err instanceof Anthropic.APIConnectionError) return { kind: 'network', status, requestId, message };
    if (status === 529 || status === 503) return { kind: 'overloaded', status, requestId, message };
    if (status !== null && status >= 500) return { kind: 'server_error', status, requestId, message };
    return { kind: 'unknown', status, requestId, message };
  }
  const message = err instanceof Error ? err.message : String(err);
  return { kind: /timeout|abort/i.test(message) ? 'timeout' : 'network', status: null, requestId: null, message };
}

export function createAnthropicAdapter(): ProviderAdapter {
  const model = AI_CONFIG.anthropic.model;

  return {
    name: 'anthropic',
    model,

    isConfigured() {
      return isConfiguredSecret(process.env.ANTHROPIC_API_KEY);
    },

    async invoke(systemPrompt: string, messages: ChatMessage[]): Promise<ProviderResponse> {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      try {
        const response = await client.messages.create({
          model,
          max_tokens: AI_CONFIG.anthropic.maxOutputTokens,
          system: systemPrompt,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        });

        const text = response.content
          .filter((block) => block.type === 'text')
          .map((block) => ('text' in block ? block.text : ''))
          .join('\n');

        return {
          text,
          requestId: (response as any)._request_id ?? null,
          promptTokens: response.usage?.input_tokens ?? null,
          completionTokens: response.usage?.output_tokens ?? null,
          stopReason: response.stop_reason ?? null,
        };
      } catch (err) {
        const { kind, status, requestId, message } = classifyAnthropicError(err);
        throw new ProviderError({ provider: 'anthropic', kind, status, requestId, message, cause: err });
      }
    },
  };
}
