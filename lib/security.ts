import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from './supabase-admin';

/**
 * Hostnames that are always trusted (local development).
 */
const BASE_ALLOWED_HOSTS = ['localhost', '127.0.0.1'] as const;

/**
 * Production hostnames trusted by default, independent of environment config.
 */
const DEFAULT_PRODUCTION_HOSTS = ['narratixlab.com', 'www.narratixlab.com'] as const;

/**
 * Resolve the trusted hostname allowlist.
 *
 * Deny-by-default is preserved: only local hosts, the canonical production
 * domains, the configured app URL, an explicit ALLOWED_HOSTS list, and the
 * hostnames Vercel injects for the current deployment are accepted. Without
 * this derivation, every host check hard-failed on Vercel (whose runtime host
 * is <project>.vercel.app), breaking /api/analyze, /api/auth/callback and
 * Stripe checkout in production.
 */
function resolveAllowedHosts(): Set<string> {
  const hosts = new Set<string>([...BASE_ALLOWED_HOSTS, ...DEFAULT_PRODUCTION_HOSTS]);

  const add = (raw: string | undefined) => {
    const value = raw?.trim();
    if (!value) return;
    // Accept either a bare hostname or a full URL.
    try {
      const hostname = value.includes('://')
        ? new URL(value).hostname
        : new URL(`https://${value}`).hostname;
      if (hostname) hosts.add(hostname.toLowerCase());
    } catch {
      // Ignore malformed entries rather than widening the allowlist.
    }
  };

  add(process.env.NEXT_PUBLIC_APP_URL);
  for (const entry of (process.env.ALLOWED_HOSTS || '').split(',')) add(entry);

  // Vercel deployment hostnames (production, branch and per-deployment URLs).
  add(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  add(process.env.VERCEL_BRANCH_URL);
  add(process.env.VERCEL_URL);

  return hosts;
}

let cachedAllowedHosts: Set<string> | null = null;

export function getAllowedHosts(): Set<string> {
  if (!cachedAllowedHosts) {
    cachedAllowedHosts = resolveAllowedHosts();
  }
  return cachedAllowedHosts;
}

const DEFAULT_APP_URL = 'http://localhost:3000';

type RateLimitResult = {
  allowed: boolean;
  message?: string;
  retry_after_seconds?: number;
};

type RateLimitRule = {
  scope: 'minute' | 'hour' | 'day';
  max: number;
  windowSeconds: number;
  cooldownSeconds: number;
};

export type Plan = 'free' | 'pro' | 'team';

const fallbackRateBuckets = new Map<string, { windowStart: number; count: number; blockedUntil: number; violations: number }>();

export function hasConfiguredSecret(value: string | undefined): value is string {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return !normalized.includes('placeholder') && !normalized.startsWith('your_');
}

export function parseTrustedUrl(value: string | undefined) {
  const url = new URL(value || DEFAULT_APP_URL);
  assertAllowedHostname(url.hostname);
  return url;
}

export function assertAllowedHostname(hostname: string) {
  const normalized = hostname.toLowerCase();
  if (!getAllowedHosts().has(normalized)) {
    throw new Error(`Host is not allowed: ${hostname}`);
  }
}

export function getTrustedAppUrl() {
  return parseTrustedUrl(process.env.NEXT_PUBLIC_APP_URL).origin;
}

export function assertAllowedRequestHost(request: Request) {
  const requestUrl = new URL(request.url);
  assertAllowedHostname(requestUrl.hostname);
}

export function sanitizeRedirectPath(value: string | null | undefined, fallback = '/dashboard') {
  if (!value) return fallback;

  try {
    const decoded = decodeURIComponent(value);
    if (!decoded.startsWith('/') || decoded.startsWith('//')) return fallback;
    if (decoded.includes('\\')) return fallback;
    if (/[\u0000-\u001F\u007F]/.test(decoded)) return fallback;
    if (/^\/(?:api|_next)(?:\/|$)/.test(decoded)) return fallback;
    return decoded;
  } catch {
    return fallback;
  }
}

export function redirectToSafePath(path: string, status?: number) {
  const appUrl = getTrustedAppUrl();
  return NextResponse.redirect(new URL(sanitizeRedirectPath(path), appUrl), status);
}

export function getAllowedRequestOrigin(request: NextRequest) {
  const originHeader = request.headers.get('origin');
  if (!originHeader) {
    return getTrustedAppUrl();
  }

  const origin = new URL(originHeader);
  assertAllowedHostname(origin.hostname);

  const isLocalOrigin =
    origin.hostname === 'localhost' || origin.hostname === '127.0.0.1';

  if (isLocalOrigin) {
    if (!['http:', 'https:'].includes(origin.protocol)) {
      throw new Error('Local origin protocol is not allowed.');
    }
  } else if (origin.protocol !== 'https:') {
    // Every non-local trusted host (production domain, Vercel deployment) must
    // be HTTPS — previously only narratixlab.com was checked.
    throw new Error('Production origin must use HTTPS.');
  }

  return origin.origin;
}

export function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  const firstForwarded = forwarded?.split(',')[0]?.trim();
  return firstForwarded || request.headers.get('x-real-ip') || 'unknown';
}

export function detectSuspiciousClient(request: NextRequest) {
  const ua = request.headers.get('user-agent') || '';
  const normalized = ua.toLowerCase();
  const knownAutomation = [
    'curl',
    'wget',
    'python-requests',
    'scrapy',
    'spider',
    'crawler',
    'masscan',
    'nikto',
    'sqlmap',
  ];

  if (!ua.trim()) {
    return 'Missing user-agent.';
  }

  if (knownAutomation.some((needle) => normalized.includes(needle))) {
    return 'Automated client is not allowed for analysis requests.';
  }

  return null;
}

export function getAnalyzeRateRules(plan: Plan): RateLimitRule[] {
  if (plan === 'pro' || plan === 'team') {
    return [
      { scope: 'minute', max: 8, windowSeconds: 60, cooldownSeconds: 60 },
      { scope: 'hour', max: 80, windowSeconds: 60 * 60, cooldownSeconds: 5 * 60 },
      { scope: 'day', max: 500, windowSeconds: 24 * 60 * 60, cooldownSeconds: 15 * 60 },
    ];
  }

  return [
    { scope: 'minute', max: 3, windowSeconds: 60, cooldownSeconds: 60 },
    { scope: 'hour', max: 10, windowSeconds: 60 * 60, cooldownSeconds: 5 * 60 },
    { scope: 'day', max: 20, windowSeconds: 24 * 60 * 60, cooldownSeconds: 15 * 60 },
  ];
}

/**
 * Rate-limit rules for authenticated account/billing actions (data export,
 * account deletion, checkout session creation). These endpoints are cheap to
 * call but expensive to serve, so they are capped independently of analysis.
 */
export function getAccountActionRateRules(): RateLimitRule[] {
  return [
    { scope: 'minute', max: 5, windowSeconds: 60, cooldownSeconds: 60 },
    { scope: 'hour', max: 20, windowSeconds: 60 * 60, cooldownSeconds: 5 * 60 },
  ];
}

function consumeFallbackRateLimit(
  key: string,
  max: number,
  windowSeconds: number,
  cooldownSeconds: number
): RateLimitResult {
  const now = Date.now();
  const existing = fallbackRateBuckets.get(key);

  if (existing?.blockedUntil && existing.blockedUntil > now) {
    return {
      allowed: false,
      message: 'Too many requests. Please wait before trying again.',
      retry_after_seconds: Math.ceil((existing.blockedUntil - now) / 1000),
    };
  }

  if (!existing || existing.windowStart <= now - windowSeconds * 1000) {
    fallbackRateBuckets.set(key, {
      windowStart: now,
      count: 1,
      blockedUntil: 0,
      violations: existing?.violations || 0,
    });
    return { allowed: true };
  }

  existing.count += 1;

  if (existing.count > max) {
    existing.violations += 1;
    existing.blockedUntil = now + cooldownSeconds * Math.min(existing.violations, 5) * 1000;
    fallbackRateBuckets.set(key, existing);
    return {
      allowed: false,
      message: 'Rate limit exceeded. Please wait before trying again.',
      retry_after_seconds: Math.ceil((existing.blockedUntil - now) / 1000),
    };
  }

  fallbackRateBuckets.set(key, existing);
  return { allowed: true };
}

export async function enforceSupabaseRateLimit(params: {
  identityKey: string;
  action: string;
  plan: Plan;
  /** Override the default analyze rules (e.g. account/billing actions). */
  rules?: RateLimitRule[];
}) {
  const admin = createAdminClient();
  const rules = params.rules ?? getAnalyzeRateRules(params.plan);

  for (const rule of rules) {
    const key = `${params.identityKey}:${params.action}:${rule.scope}`;
    const { data, error } = await admin.rpc('check_and_consume_rate_limit', {
      p_identity_key: params.identityKey,
      p_action: `${params.action}:${rule.scope}`,
      p_max_requests: rule.max,
      p_window_seconds: rule.windowSeconds,
      p_cooldown_seconds: rule.cooldownSeconds,
    });

    const result = error
      ? consumeFallbackRateLimit(key, rule.max, rule.windowSeconds, rule.cooldownSeconds)
      : (data as RateLimitResult);

    if (!result.allowed) {
      return {
        ...result,
        scope: rule.scope,
      };
    }
  }

  return { allowed: true };
}

/**
 * An error whose message is written for the end user and is safe to return in
 * an HTTP response (quota messages, validation feedback). Anything that is NOT
 * a UserFacingError is treated as internal and replaced with a generic message
 * by toPublicErrorMessage, so provider errors, Postgres errors, stack-derived
 * text and file paths never reach the client.
 */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserFacingError';
  }
}

/**
 * Resolve the message that may be sent to the client. Internal detail stays
 * server-side (callers log the raw error).
 */
export function toPublicErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof UserFacingError) return error.message;
  return fallback;
}

export function sanitizeTextForAi(input: string, maxLength = 30000) {
  return input
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .slice(0, maxLength)
    .trim();
}
