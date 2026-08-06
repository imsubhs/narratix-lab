import type { User } from '@supabase/supabase-js';

export type Plan = 'free' | 'pro' | 'team';

export type Profile = {
  id: string;
  full_name: string | null;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  plan: Plan;
  usage_count: number;
  usage_reset_at: string | null;
  updated_at: string | null;
};

type ProfileRow = Partial<Profile> | null | undefined;

export function fallbackProfile(user: User): Profile {
  return {
    id: user.id,
    full_name:
      typeof user.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name
        : null,
    display_name:
      typeof user.user_metadata?.name === 'string'
        ? user.user_metadata.name
        : typeof user.user_metadata?.full_name === 'string'
          ? user.user_metadata.full_name
          : null,
    email: user.email ?? null,
    avatar_url:
      typeof user.user_metadata?.avatar_url === 'string'
        ? user.user_metadata.avatar_url
        : null,
    plan: 'free',
    usage_count: 0,
    usage_reset_at: null,
    updated_at: null,
  };
}

export function normalizeProfile(row: ProfileRow, user?: User | null): Profile | null {
  if (!row && !user) return null;

  const fallback = user ? fallbackProfile(user) : null;
  const id = row?.id ?? fallback?.id;

  if (!id) return null;

  const plan = row?.plan === 'pro' ? 'pro' : (row?.plan === 'team' ? 'team' : 'free');

  return {
    id,
    full_name: row?.full_name ?? fallback?.full_name ?? null,
    display_name: row?.display_name ?? fallback?.display_name ?? row?.full_name ?? fallback?.full_name ?? null,
    email: row?.email ?? fallback?.email ?? null,
    avatar_url: (row as Record<string, unknown>)?.avatar_url as string | null ?? fallback?.avatar_url ?? null,
    plan,
    usage_count: Number(row?.usage_count ?? fallback?.usage_count ?? 0),
    usage_reset_at: row?.usage_reset_at ?? null,
    updated_at: row?.updated_at ?? null,
  };
}

export function getDisplayName(user: User | null, profile: Profile | null) {
  return (
    profile?.display_name ||
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Creator'
  );
}

export function getInitials(nameOrEmail: string) {
  const clean = nameOrEmail.trim();
  if (!clean) return 'C';

  const parts = clean.includes('@')
    ? [clean.split('@')[0]]
    : clean.split(/\s+/).filter(Boolean);

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'C';
}
