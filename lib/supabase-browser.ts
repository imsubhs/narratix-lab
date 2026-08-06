import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseConfig } from './supabase-config';

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  const { url, anonKey } = getSupabaseConfig();
  if (typeof window === 'undefined') {
    return createBrowserClient(url, anonKey);
  }
  if (!browserClient) {
    browserClient = createBrowserClient(url, anonKey, {
      isSingleton: true,
    });
  }
  return browserClient;
}

