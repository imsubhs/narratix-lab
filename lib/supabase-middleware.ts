import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseConfig } from './supabase-config';

type CookieEntry = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

/**
 * Middleware session handler — follows official @supabase/ssr docs exactly.
 *
 * Responsibilities:
 * 1. Refresh the auth token on every request (keeps session alive)
 * 2. Protect authenticated app routes (redirect to /login if unauthenticated)
 * 3. Bounce authenticated users away from /login and /signup
 *
 * Everything else (/analyze, /, /features, /pricing, etc.) is PUBLIC.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { url, anonKey } = getSupabaseConfig();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieEntry[]) {
        // 1. Update the request cookies (for downstream server components)
        cookiesToSet.forEach(({ name, value }: CookieEntry) =>
          request.cookies.set(name, value)
        );
        // 2. Recreate the response so it carries the updated request
        supabaseResponse = NextResponse.next({ request });
        // 3. Set cookies on the response (sent back to browser)
        cookiesToSet.forEach(({ name, value, options }: CookieEntry) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // CRITICAL: This call refreshes the auth token and triggers setAll
  // to persist the refreshed cookies. Do NOT remove this.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Debug log (remove after auth is verified working)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[middleware] ${pathname} | user: ${user?.email ?? 'NONE'}`);
  }

  // ─── Protected routes ─────────────────────────────────
  const protectedPaths = ['/dashboard', '/history', '/settings', '/billing', '/reports'];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !user) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[middleware] BLOCKED: ${pathname} → /login`);
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ─── Auth pages: bounce logged-in users ───────────────
  const authPaths = ['/login', '/signup'];
  const isAuthPage = authPaths.some((p) => pathname.startsWith(p));

  if (isAuthPage && user) {
    const redirectParam = request.nextUrl.searchParams.get('redirect');
    let destination = redirectParam || '/dashboard';
    if (destination.startsWith('/login') || destination.startsWith('/signup') || !destination.startsWith('/')) {
      destination = '/dashboard';
    }
    if (process.env.NODE_ENV === 'development') {
      console.log(`[middleware] BOUNCE: ${pathname} → ${destination} (already logged in)`);
    }
    const destUrl = request.nextUrl.clone();
    destUrl.pathname = destination;
    destUrl.search = '';
    return NextResponse.redirect(destUrl);
  }

  return supabaseResponse;
}
