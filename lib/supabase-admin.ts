import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './supabase-config';

export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
  }

  const { url } = getSupabaseConfig();

  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
