import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { checkAllProviders } from '@/lib/ai/health';
import { AI_CONFIG } from '@/lib/ai/config';
import { PROMPT_VERSION } from '@/lib/ai/prompts';

export const dynamic = 'force-dynamic';

/**
 * AI provider health endpoint (authenticated).
 * Live-probes each configured provider's models endpoint (free, no tokens)
 * and reports whether the pipeline can currently produce real reports.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
  }

  const providers = await checkAllProviders();
  const healthy = providers.some((p) => p.configured && p.authValid === true);

  return NextResponse.json(
    {
      healthy,
      promptVersion: PROMPT_VERSION,
      providerOrder: AI_CONFIG.providerOrder,
      providers,
      checkedAt: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}
