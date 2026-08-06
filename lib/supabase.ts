// LEGACY FILE — re-exports the SSR-aware browser client.
// DO NOT use createClient from @supabase/supabase-js directly.
// That bypasses cookie-based session persistence in Next.js.
export { createClient } from './supabase-browser';
