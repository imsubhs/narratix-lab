import type { ProviderName } from '../config';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ProviderResponse {
  text: string;
  requestId: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  stopReason: string | null;
}

/**
 * The single interface the engine talks to. Adding a provider means adding an
 * adapter that implements this — the orchestration never changes.
 */
export interface ProviderAdapter {
  readonly name: ProviderName;
  readonly model: string;
  isConfigured(): boolean;
  invoke(systemPrompt: string, messages: ChatMessage[]): Promise<ProviderResponse>;
}
