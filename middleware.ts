import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase-middleware';

/**
 * Next.js Middleware — single responsibility: delegate to updateSession.
 * ALL auth logic lives in lib/supabase-middleware.ts.
 * Do NOT add auth checks here — that causes duplicate/conflicting redirects.
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all routes EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - Static assets (.svg, .png, .jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
