import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { normalizeProfile, type Profile } from '@/lib/account';
import { createClient } from '@/lib/supabase-server';
import './globals.css';

export const dynamic = 'force-dynamic';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Narratix Lab — Creator Intelligence Platform',
  description:
    'Creator Intelligence Platform for Script & Content Analysis.',
};

async function getInitialAccount() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { user: null, profile: null, analysesUsed: 0 };
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    const profile = normalizeProfile(data as Profile | null, user);

    return {
      user,
      profile,
      analysesUsed: profile?.usage_count ?? 0,
    };
  } catch (error) {
    console.warn('[layout] Initial account hydration failed:', error);
    return { user: null, profile: null, analysesUsed: 0 };
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialAccount = await getInitialAccount();

  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('narratix_prefs');
                  var theme = 'dark';
                  if (saved) {
                    var prefs = JSON.parse(saved);
                    if (prefs.theme) {
                      theme = prefs.theme;
                    }
                  }
                  if (theme === 'system') {
                    var isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    theme = isDark ? 'dark' : 'light';
                  }
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {}
              })()
            `,
          }}
        />
      </head>
      <body className={plusJakarta.className}>
        <AuthProvider
          initialUser={initialAccount.user}
          initialProfile={initialAccount.profile}
          initialAnalysesUsed={initialAccount.analysesUsed}
        >
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
