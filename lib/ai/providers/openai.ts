import OpenAI from 'openai';
import { AI_CONFIG, isConfiguredSecret } from '../config';
import { ProviderError, type AiErrorKind } from '../errors';
import type { ChatMessage, ProviderAdapter, ProviderResponse } from './types';

function classifyOpenAIError(err: unknown): { kind: AiErrorKind; status: number | null; requestId: string | null; message: string } {
  if (err instanceof OpenAI.APIError) {
    const status = typeof err.status === 'number' ? err.status : null;
    const requestId = (err as any).request_id ?? null;
    const message = err.message || 'OpenAI API error';
    if (status === 401 || status === 403) return { kind: 'auth', status, requestId, message };
    if (status === 404) return { kind: 'model_not_found', status, requestId, message };
    if (status === 429) return { kind: 'rate_limit', status, requestId, message };
    if (status === 503) return { kind: 'overloaded', status, requestId, message };
    if (status !== null && status >= 500) return { kind: 'server_error', status, requestId, message };
    if (err instanceof OpenAI.APIConnectionTimeoutError) return { kind: 'timeout', status, requestId, message };
    if (err instanceof OpenAI.APIConnectionError) return { kind: 'network', status, requestId, message };
    return { kind: 'unknown', status, requestId, message };
  }
  const message = err instanceof Error ? err.message : String(err);
  return { kind: /timeout|abort/i.test(message) ? 'timeout' : 'network', status: null, requestId: null, message };
}

export function createOpenAIAdapter(): ProviderAdapter {
  const model = AI_CONFIG.openai.model;

  return {
    name: 'openai',
    model,

    isConfigured() {
      return isConfiguredSecret(process.env.OPENAI_API_KEY);
    },

    async invoke(systemPrompt: string, messages: ChatMessage[]): Promise<ProviderResponse> {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      try {
        const completion = await client.chat.completions.create({
          model,
          max_tokens: AI_CONFIG.openai.maxOutputTokens,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system' as const, content: systemPrompt },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
          ],
        });

        const choice = completion.choices?.[0];
        return {
          text: choice?.message?.content ?? '',
          requestId: (completion as any)._request_id ?? null,
          promptTokens: completion.usage?.prompt_tokens ?? null,
          completionTokens: completion.usage?.completion_tokens ?? null,
          stopReason: choice?.finish_reason ?? null,
        };
      } catch (err) {
        const { kind, status, requestId, message } = classifyOpenAIError(err);
        throw new ProviderError({ provider: 'openai', kind, status, requestId, message, cause: err });
      }
    },
  };
}
