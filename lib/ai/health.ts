import { AI_CONFIG, isConfiguredSecret, type ProviderName } from './config';
import { logAiEvent } from './telemetry';
import { sanitizeErrorMessage } from './errors';

/**
 * Provider health: cheap live probes (GET /v1/models — free, no tokens) plus a
 * lightweight circuit breaker so a provider with a dead key or retired model
 * isn't re-attempted on every analysis.
 *
 * Note: state is per serverless instance. That is acceptable — the breaker is
 * a latency optimization, not a correctness mechanism; correctness comes from
 * the engine's typed error handling.
 */

export interface ProviderHealth {
  provider: ProviderName;
  configured: boolean;
  reachable: boolean | null;
  authValid: boolean | null;
  status: number | null;
  model: string;
  checkedAt: string | null;
  error: string | null;
}

interface CircuitState {
  openedAt: number;
  reason: string;
}

const circuits = new Map<ProviderName, CircuitState>();

export function openCircuit(provider: ProviderName, reason: string): void {
  circuits.set(provider, { openedAt: Date.now(), reason });
}

export function closeCircuit(provider: ProviderName): void {
  circuits.delete(provider);
}

export function circuitOpen(provider: ProviderName): CircuitState | null {
  const state = circuits.get(provider);
  if (!state) return null;
  if (Date.now() - state.openedAt > AI_CONFIG.circuitCooldownMs) {
    circuits.delete(provider);
    return null;
  }
  return state;
}

async function probe(
  url: string,
  headers: Record<string, string>
): Promise<{ ok: boolean; status: number | null; error: string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_CONFIG.healthProbeTimeoutMs);
  try {
    const res = await fetch(url, { headers, signal: controller.signal, cache: 'no-store' });
    return { ok: res.ok, status: res.status, error: res.ok ? null : `HTTP ${res.status}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, status: null, error: sanitizeErrorMessage(message) };
  } finally {
    clearTimeout(timer);
  }
}

function keyFor(provider: ProviderName): string | undefined {
  switch (provider) {
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY;
    case 'openai':
      return process.env.OPENAI_API_KEY;
    case 'openrouter':
      return process.env.OPENROUTER_API_KEY;
  }
}

function modelFor(provider: ProviderName): string {
  switch (provider) {
    case 'anthropic':
      return AI_CONFIG.anthropic.model;
    case 'openai':
      return AI_CONFIG.openai.model;
    case 'openrouter':
      return AI_CONFIG.openrouter.model;
  }
}

export async function checkProviderHealth(provider: ProviderName): Promise<ProviderHealth> {
  const key = keyFor(provider);
  const model = modelFor(provider);

  const base: ProviderHealth = {
    provider,
    configured: isConfiguredSecret(key),
    reachable: null,
    authValid: null,
    status: null,
    model,
    checkedAt: null,
    error: null,
  };

  if (!base.configured) {
    base.error = 'API key not configured (missing or placeholder value)';
    return base;
  }

  const result =
    provider === 'anthropic'
      ? await probe('https://api.anthropic.com/v1/models', {
          'x-api-key': key as string,
          'anthropic-version': '2023-06-01',
        })
      : provider === 'openrouter'
        ? // GET /key validates the key itself (200 with quota info, 401 if dead) —
          // free and consumes no tokens, mirroring the /models probes above.
          await probe(`${AI_CONFIG.openrouter.baseUrl}/key`, {
            Authorization: `Bearer ${key}`,
          })
        : await probe('https://api.openai.com/v1/models', {
            Authorization: `Bearer ${key}`,
          });

  base.checkedAt = new Date().toISOString();
  base.reachable = result.status !== null;
  base.authValid = result.ok;
  base.status = result.status;
  base.error = result.error;

  logAiEvent({
    event: 'ai_health_check',
    provider,
    model,
    outcome: result.ok ? 'healthy' : 'unhealthy',
    errorStatus: result.status,
    errorMessage: result.error,
  });

  return base;
}

export async function checkAllProviders(): Promise<ProviderHealth[]> {
  return Promise.all(AI_CONFIG.providerOrder.map((p) => checkProviderHealth(p)));
}
