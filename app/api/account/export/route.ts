import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import {
  enforceSupabaseRateLimit,
  getAccountActionRateRules,
} from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 }
      );
    }

    // Full-account data dumps are cheap to request and expensive to serve.
    const rate = await enforceSupabaseRateLimit({
      identityKey: `user:${user.id}`,
      action: 'account-export',
      plan: 'free',
      rules: getAccountActionRateRules(),
    });

    if (!rate.allowed) {
      const retryAfter = (rate as { retry_after_seconds?: number }).retry_after_seconds;
      return NextResponse.json(
        { error: 'Too many export requests. Please wait before trying again.' },
        {
          status: 429,
          headers: retryAfter ? { 'Retry-After': String(retryAfter) } : undefined,
        }
      );
    }

    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    // Fetch analyses
    const { data: analyses } = await supabase
      .from('analyses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const exportData = {
      exported_at: new Date().toISOString(),
      account: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        provider: user.app_metadata?.provider || 'email',
      },
      profile: profile || null,
      analyses: analyses || [],
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="narratix-export-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    console.error(
      '[api/account/export] failed:',
      error instanceof Error ? error.message : error
    );
    return NextResponse.json({ error: 'Export failed.' }, { status: 500 });
  }
}
