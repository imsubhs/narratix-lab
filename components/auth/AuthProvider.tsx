'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase-browser';
import {
  fallbackProfile,
  normalizeProfile,
  type Profile,
} from '@/lib/account';

type AccountState = 'loading' | 'guest' | 'authenticated';

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  analysesUsed: number;
  accountState: AccountState;
  isAuthenticated: boolean;
  refreshAccount: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: React.ReactNode;
  initialUser: User | null;
  initialProfile: Profile | null;
  initialAnalysesUsed: number;
};

export function AuthProvider({
  children,
  initialUser,
  initialProfile,
  initialAnalysesUsed,
}: AuthProviderProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(initialUser);
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [analysesUsed, setAnalysesUsed] = useState(initialAnalysesUsed);
  const [accountState, setAccountState] = useState<AccountState>(
    initialUser ? 'authenticated' : 'guest'
  );

  const loadProfile = useCallback(
    async (currentUser: User | null) => {
      console.log('[auth] loadProfile called', {
        user: currentUser?.email ?? 'NONE',
      });
      if (!currentUser) {
        setUser(null);
        setProfile(null);
        setAnalysesUsed(0);
        setAccountState('guest');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      let nextProfile = normalizeProfile(data, currentUser);

      if (!nextProfile && (!error || error.code === 'PGRST116')) {
        const fallback = fallbackProfile(currentUser);
        const { data: inserted } = await supabase
          .from('profiles')
          .upsert(fallback, { onConflict: 'id' })
          .select('*')
          .maybeSingle();

        nextProfile = normalizeProfile(inserted, currentUser) ?? fallback;
      }

      if (error && error.code !== 'PGRST116') {
        console.warn('[auth] Profile lookup failed:', error.message);
      }

      const resolvedProfile = nextProfile ?? fallbackProfile(currentUser);
      console.log('[auth] profile resolved', {
        email: resolvedProfile.email,
        plan: resolvedProfile.plan,
        usage: resolvedProfile.usage_count,
      });
      setUser(currentUser);
      setProfile(resolvedProfile);
      setAnalysesUsed(resolvedProfile.usage_count);
      setAccountState('authenticated');
    },
    [supabase]
  );

  const refreshAccount = useCallback(async () => {
    console.log('[auth] refreshAccount requested');
    setAccountState((state) => (state === 'guest' ? 'loading' : state));
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      await loadProfile(currentUser);
    } catch (err) {
      console.warn('[auth] refreshAccount getUser error:', err);
    }
  }, [loadProfile, supabase]);

  const signOut = useCallback(async () => {
    console.log('[auth] signOut requested');
    setUser(null);
    setProfile(null);
    setAnalysesUsed(0);
    setAccountState('guest');

    try {
      sessionStorage.removeItem('narratix_pending');
      localStorage.removeItem('narratix_pending');
    } catch {
      // sessionStorage is unavailable in a few privacy modes.
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[auth] Sign out failed:', error.message);
    }

    router.push('/');
    router.refresh();
  }, [router, supabase]);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getUser()
      .then(({ data: { user: currentUser } }) => {
        if (!mounted) return;
        void loadProfile(currentUser);
      })
      .catch((err) => {
        console.warn('[auth] getUser initial check caught error:', err?.message || err);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      console.log('[auth] onAuthStateChange', {
        event,
        user: session?.user?.email ?? 'NONE',
      });
      void loadProfile(session?.user ?? null);
      if (event !== 'INITIAL_SESSION') {
        router.refresh();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile, router, supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      analysesUsed,
      accountState,
      isAuthenticated: Boolean(user),
      refreshAccount,
      signOut,
    }),
    [accountState, analysesUsed, profile, refreshAccount, signOut, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
