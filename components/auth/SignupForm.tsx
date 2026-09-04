'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { createClient } from '@/lib/supabase-browser';
import { FEATURES } from '@/lib/features';
import GoogleIcon from './GoogleIcon';
import BrandMark from '@/components/brand/BrandMark';

export default function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshAccount } = useAuth();
  const requestedRedirect = searchParams.get('redirect');
  const redirectTo = requestedRedirect?.startsWith('/') && !requestedRedirect.startsWith('/login') && !requestedRedirect.startsWith('/signup') ? requestedRedirect : '/dashboard';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  // Password strength
  const getStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { pct: 20, color: 'var(--danger-color)', label: 'Weak' };
    if (score <= 3) return { pct: 55, color: 'var(--warning-color)', label: 'Fair' };
    return { pct: 100, color: 'var(--success-color)', label: 'Strong' };
  };

  const strength = getStrength(password);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPw) {
      setError('Passwords do not match.');
      return;
    }
    if (!agreed) {
      setError('Please accept the Terms of Service.');
      return;
    }

    setLoading(true);
    console.log('[signup] email/password signup attempt', { email: email.trim().toLowerCase() });

    const { error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: name.trim(),
          plan: 'free',
        },
        emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    });

    if (authError) {
      console.error('[signup] email/password signup failed', authError.message);
      setError(authError.message);
      setLoading(false);
      return;
    }

    await refreshAccount();
    console.log('[signup] signup success, redirecting', { redirectTo });
    router.refresh();
    router.replace(redirectTo);
  };

  const handleGoogleSignup = async () => {
    const callbackUrl = `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(redirectTo)}`;
    console.log('[signup] Google OAuth → callback:', callbackUrl);
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
      console.error('[signup] google oauth start failed', error.message);
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
            Join Narratix Lab
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Start building smarter content — free.
          </p>
        </div>

        {/* Card */}
        <div className="auth-card">
          {/* Tab Bar */}
          <div className="tab-bar">
            <Link href="/login" className="tabv off">
              Sign In
            </Link>
            <span className="tabv on">Create Account</span>
          </div>

          {/* Google SSO — gated by feature flag */}
          {FEATURES.GOOGLE_AUTH ? (
            <>
              <button className="sso-btn" onClick={handleGoogleSignup} type="button">
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
              🧪 Google Sign-Up coming soon
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSignup}>
            <div className="fw">
              <label className="flbl" htmlFor="signup-name">
                FULL NAME
              </label>
              <input
                id="signup-name"
                className="finput"
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>

            <div className="fw">
              <label className="flbl" htmlFor="signup-email">
                EMAIL
              </label>
              <input
                id="signup-email"
                className="finput"
                type="email"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'signup-error' : undefined}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="fw">
              <label className="flbl" htmlFor="signup-password">
                PASSWORD
              </label>
              <input
                id="signup-password"
                className="finput"
                type={showPw ? 'text' : 'password'}
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                aria-describedby="signup-password-strength"
                style={{ marginBottom: 0, paddingRight: '58px' }}
              />
              <button
                type="button"
                className="auth-pw-toggle"
                onClick={() => setShowPw(!showPw)}
                aria-pressed={showPw}
                aria-controls="signup-password"
              >
                {showPw ? 'HIDE' : 'SHOW'}
              </button>
              {/* Strength bar */}
              <div
                style={{
                  height: '3px',
                  borderRadius: '3px',
                  background: 'var(--border-secondary)',
                  marginTop: '7px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: password ? `${strength.pct}%` : '0%',
                    background: strength.color,
                    borderRadius: '3px',
                    transition: 'all .3s',
                  }}
                />
              </div>
              <p
                id="signup-password-strength"
                aria-live="polite"
                style={{
                  fontSize: '11px',
                  color: password ? strength.color : 'var(--text-muted)',
                  marginTop: '4px',
                  minHeight: '16px',
                }}
              >
                {password ? strength.label : ''}
              </p>
            </div>

            <div className="fw">
              <label className="flbl" htmlFor="signup-confirm">
                CONFIRM PASSWORD
              </label>
              <input
                id="signup-confirm"
                className="finput"
                type="password"
                placeholder="••••••••"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            {/* Terms */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                marginBottom: '16px',
              }}
            >
              <button
                type="button"
                onClick={() => setAgreed(!agreed)}
                style={{
                  width: '17px',
                  height: '17px',
                  minWidth: '17px',
                  borderRadius: '4px',
                  border: `1px solid ${agreed ? 'var(--accent)' : 'var(--input-border)'}`,
                  background: agreed
                    ? 'var(--accent-light)'
                    : 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: '2px',
                  transition: 'all .18s',
                  flexShrink: 0,
                }}
              >
                {agreed && (
                  <span
                    style={{
                      color: 'var(--accent)',
                      fontSize: '10px',
                      fontWeight: 800,
                    }}
                  >
                    ✓
                  </span>
                )}
              </button>
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.65,
                }}
              >
                I agree to the{' '}
                <span style={{ color: 'var(--accent)', cursor: 'pointer' }}>
                  Terms of Service
                </span>{' '}
                and{' '}
                <span style={{ color: 'var(--accent)', cursor: 'pointer' }}>
                  Privacy Policy
                </span>
              </p>
            </div>

            {/* Error */}
            {error && (
              <div id="signup-error" className="auth-error" role="alert">
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
                marginBottom: '14px',
              }}
            >
              {loading ? 'Creating account...' : 'Create Free Account →'}
            </button>
          </form>

          <p
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              textAlign: 'center',
            }}
          >
            Already have an account?{' '}
            <Link
              href="/login"
              style={{
                color: 'var(--accent)',
                cursor: 'pointer',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Sign in →
            </Link>
          </p>
        </div>

        {/* Bottom info */}
        <div
          style={{
            marginTop: '16px',
            padding: '13px 18px',
            background: 'var(--success-bg)',
            border: '1px solid var(--success-border)',
            borderRadius: '13px',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: '13px',
              color: 'var(--success-color)',
              lineHeight: 1.7,
            }}
          >
            ✓ Free: 3 analyses/month &nbsp;·&nbsp; ✓ No credit card
            &nbsp;·&nbsp; ✓ 30-day Pro trial
          </p>
        </div>
      </div>
    </div>
  );
}
