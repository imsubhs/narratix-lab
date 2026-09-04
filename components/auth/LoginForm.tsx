'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { createClient } from '@/lib/supabase-browser';
import { FEATURES } from '@/lib/features';
import GoogleIcon from './GoogleIcon';
import BrandMark from '@/components/brand/BrandMark';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshAccount } = useAuth();
  const requestedRedirect = searchParams.get('redirect');
  const redirectTo = requestedRedirect?.startsWith('/') && !requestedRedirect.startsWith('/login') && !requestedRedirect.startsWith('/signup') ? requestedRedirect : '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    console.log('[login] email/password login attempt', { email: email.trim().toLowerCase() });
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError) {
      console.error('[login] email/password login failed', authError.message);
      setError(authError.message);
      setLoading(false);
      return;
    }

    await refreshAccount();
    console.log('[login] login success, redirecting', { redirectTo });
    router.refresh();
    router.replace(redirectTo);
  };

  const handleGoogleLogin = async () => {
    const callbackUrl = `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(redirectTo)}`;
    console.log('[login] Google OAuth → callback:', callbackUrl);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) {
      console.error('[login] google oauth start failed', error.message);
      setError(error.message);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '100px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div className="grid-bg" />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '440px',
          animation: 'fadeUp .4s ease',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <BrandMark size={48} priority />
          </div>
          <h1
            style={{
              fontSize: '26px',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-.03em',
              marginBottom: '7px',
            }}
          >
            Welcome back
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Sign in to your Narratix Lab workspace.
          </p>
        </div>

        {/* Card */}
        <div className="auth-card">
          {/* Tab Bar */}
          <div className="tab-bar">
            <span className="tabv on">Sign In</span>
            <Link href="/signup" className="tabv off">
              Create Account
            </Link>
          </div>

          {/* Google SSO — gated by feature flag */}
          {FEATURES.GOOGLE_AUTH ? (
            <>
              <button className="sso-btn" onClick={handleGoogleLogin} type="button">
                <GoogleIcon />
                Continue with Google
              </button>
              <div className="divider-line">
                <div />
                <span>OR</span>
                <div />
              </div>
            </>
          ) : (
            <div style={{ padding: '10px 14px', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', borderRadius: '10px', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '16px' }}>
              🧪 Google Sign-In coming soon
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin}>
            <div className="fw">
              <label className="flbl" htmlFor="login-email">
                EMAIL
              </label>
              <input
                id="login-email"
                className="finput"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'login-error' : undefined}
              />
            </div>

            <div className="fw">
              <label className="flbl" htmlFor="login-password">
                PASSWORD
              </label>
              <input
                id="login-password"
                className="finput"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'login-error' : undefined}
                style={{ marginBottom: 0, paddingRight: '58px' }}
              />
              <button
                type="button"
                className="auth-pw-toggle"
                onClick={() => setShowPw(!showPw)}
                aria-pressed={showPw}
                aria-controls="login-password"
              >
                {showPw ? 'HIDE' : 'SHOW'}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div id="login-error" className="auth-error" role="alert">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="btn bp full"
              disabled={loading}
              style={{
                padding: '14px',
                fontSize: '15px',
                borderRadius: '100px',
                margin: '14px 0',
              }}
            >
              {loading ? 'Signing in...' : 'Sign In to Workspace →'}
            </button>
          </form>

          <p
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              textAlign: 'center',
            }}
          >
            No account?{' '}
            <Link
              href="/signup"
              style={{
                color: 'var(--accent)',
                cursor: 'pointer',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Create one free →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
