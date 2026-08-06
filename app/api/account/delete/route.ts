import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import {
  enforceSupabaseRateLimit,
  getAccountActionRateRules,
} from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // 1. Verify authenticated session
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

    const rate = await enforceSupabaseRateLimit({
      identityKey: `user:${user.id}`,
      action: 'account-delete',
      plan: 'free',
      rules: getAccountActionRateRules(),
    });

    if (!rate.allowed) {
      const retryAfter = (rate as { retry_after_seconds?: number }).retry_after_seconds;
      return NextResponse.json(
        { error: 'Too many requests. Please wait before trying again.' },
        {
          status: 429,
          headers: retryAfter ? { 'Retry-After': String(retryAfter) } : undefined,
        }
      );
    }

    const admin = createAdminClient();

    // 2. Delete user analyses
    const { error: analysesError } = await admin
      .from('analyses')
      .delete()
      .eq('user_id', user.id);

    if (analysesError) {
      console.error('[account/delete] Failed to delete analyses:', analysesError.message);
      // Continue — analyses table may not exist or may be empty
    }

    // 3. Delete user profile
    const { error: profileError } = await admin
      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (profileError) {
      console.error('[account/delete] Failed to delete profile:', profileError.message);
    }

    // 4. Delete user avatars from storage
    const { data: files, error: listError } = await admin.storage
      .from('avatars')
      .list(user.id);

    if (!listError && files && files.length > 0) {
      const filesToRemove = files.map((f) => `${user.id}/${f.name}`);
      const { error: storageError } = await admin.storage
        .from('avatars')
        .remove(filesToRemove);

      if (storageError) {
        console.error('[account/delete] Failed to delete avatar files:', storageError.message);
      }
    } else if (listError) {
      console.error('[account/delete] Failed to list avatar files:', listError.message);
    }

    // 5. Delete the auth user via admin client
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('[account/delete] Failed to delete auth user:', deleteError.message);
      return NextResponse.json(
        { error: 'Failed to delete account. Please contact support.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      '[account/delete] Unexpected error:',
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: 'Account deletion failed. Please contact support.' },
      { status: 500 }
    );
  }
}
