import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getSupabaseConfig } from '@/lib/supabase-config';
import {
  assertAllowedRequestHost,
  getTrustedAppUrl,
  sanitizeRedirectPath,
} from '@/lib/security';

type CookieEntry = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

/**
 * OAuth Callback Route Handler
 *
 * This handles the redirect from Supabase/Google OAuth.
 * It exchanges the auth code for a session and persists cookies.
 *
 * Flow: Google → Supabase → /api/auth/callback?code=XXX&next=/analyze
 *
 * IMPORTANT: This route is EXCLUDED from middleware to prevent
 * PKCE code_verifier cookie loss. Do NOT re-add it to the middleware matcher.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = sanitizeRedirectPath(searchParams.get('next'), '/dashboard');
  const appUrl = getTrustedAppUrl();

  // Supabase may redirect with error params if upstream auth fails
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  console.log(`[auth/callback] code: ${code ? 'present' : 'MISSING'}, next: ${next}, error: ${errorParam ?? 'none'}`);

  try {
    assertAllowedRequestHost(request);
  } catch {
    return NextResponse.json({ error: 'Unknown callback host.' }, { status: 400 });
  }

  if (errorParam) {
    console.error(`[auth/callback] Supabase upstream error: ${errorParam} — ${errorDescription}`);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription || errorParam)}`, appUrl)
    );
  }

  if (code) {
    try {
      const cookieStore = await cookies();
      const { url, anonKey } = getSupabaseConfig();

      // Log all cookies for debugging (names only, not values for security)
      const allCookies = cookieStore.getAll();
      console.log(`[auth/callback] cookies present: ${allCookies.map(c => c.name).join(', ')}`);

      const hasCodeVerifier = allCookies.some(c => c.name.includes('code-verifier') || c.name.includes('code_verifier'));
      console.log(`[auth/callback] PKCE code_verifier cookie: ${hasCodeVerifier ? 'FOUND' : 'MISSING'}`);

      const supabase = createServerClient(url, anonKey, {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: CookieEntry[]) {
            cookiesToSet.forEach(({ name, value, options }: CookieEntry) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      });

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        console.log(`[auth/callback] SUCCESS → redirecting to ${next}`);
        return NextResponse.redirect(new URL(next, appUrl));
      }

      console.error('[auth/callback] exchangeCodeForSession FAILED:', error.message, error.status);
    } catch (err) {
      console.error('[auth/callback] Unhandled exception:', err);
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_callback_failed', appUrl));
}
