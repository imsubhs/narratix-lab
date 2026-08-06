'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { getDisplayName, getInitials } from '@/lib/account';
import { BETA_BADGE } from '@/lib/features';

export default function Navbar() {
  const pathname = usePathname();
  const { user, profile, isAuthenticated, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [fallbackAvatar, setFallbackAvatar] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  const displayName = getDisplayName(user, profile);
  const email = profile?.email || user?.email || '';
  const initials = getInitials(profile?.full_name || email || displayName);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setFallbackAvatar(false);
  }, [profile?.avatar_url]);

  useEffect(() => {
    setMobileOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  /* ─── Context-aware nav links ─────────────────── */
  const guestNavItems = [
    { href: '/features', label: 'Features' },
    { href: '/how-it-works', label: 'How It Works' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/resources', label: 'Resources' },
    { href: '/about', label: 'About' },
  ];

  const authNavItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/analyze', label: 'Analyze' },
    { href: '/history', label: 'Reports' },
    { href: '/billing', label: 'Billing' },
  ];

  const navItems = isAuthenticated ? authNavItems : guestNavItems;

  /* ─── Avatar dropdown items ──────────────────── */
  const accountItems = [
    { href: '/settings', label: 'Settings' },
    { href: '/billing', label: 'Billing' },
  ];

  return (
    <>
      <nav
        className="nav"
        style={{
          boxShadow: scrolled ? 'var(--shadow-md)' : 'none',
          borderBottom: scrolled ? '1px solid var(--border-primary)' : '1px solid var(--border-secondary)',
        }}
      >
        <Link href={isAuthenticated ? '/dashboard' : '/'} className="logo">
          <div className="logo-box">
            <svg width="13" height="13" viewBox="0 0 20 20" style={{ marginLeft: '1px' }}>
              <polygon points="4,2 18,10 4,18" fill="#fff" />
            </svg>
          </div>
          <span>Narratix Lab</span>
          <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '100px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--accent)', marginLeft: '8px', letterSpacing: '.04em' }}>🧪 Beta</span>
        </Link>

        <div className="nav-links">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nl${pathname === item.href ? ' active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="nav-r nav-desktop-auth">
          {isAuthenticated ? (
            <>
              <div className="account-wrap" ref={accountRef}>
                <button
                  className="avatar-btn"
                  type="button"
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                  onClick={() => setAccountOpen((open) => !open)}
                >
                  <span className="avatar-dot">
                    {profile?.avatar_url && !fallbackAvatar ? (
                      <Image 
                        src={profile.avatar_url} 
                        alt="Avatar" 
                        width={40} 
                        height={40} 
                        className="avatar-img" 
                        unoptimized 
                        onError={() => setFallbackAvatar(true)} 
                      />
                    ) : (
                      initials
                    )}
                  </span>
                  <span className="avatar-name">{displayName.split(' ')[0]}</span>
                </button>
                {accountOpen && (
                  <div className="account-menu" role="menu">
                    <div className="account-menu-meta">
                      <span>{displayName}</span>
                      {email && <small>{email}</small>}
                    </div>
                    {accountItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`account-menu-link${pathname === item.href ? ' active' : ''}`}
                        role="menuitem"
                      >
                        {item.label}
                      </Link>
                    ))}
                    <button
                      className="account-menu-link danger"
                      type="button"
                      role="menuitem"
                      onClick={signOut}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="btn bg-btn sm">
                Log in
              </Link>
              <Link href="/signup" className="btn bp sm" style={{ gap: '4px' }}>
                Get Started →
              </Link>
            </>
          )}
        </div>

        <button
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          <span className={`hamburger ${mobileOpen ? 'open' : ''}`}>
            <span />
            <span />
            <span />
          </span>
        </button>
      </nav>

      <div className={`mobile-overlay ${mobileOpen ? 'show' : ''}`}>
        <div className="mobile-menu">
          <div className="mobile-menu-links">
            {navItems.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                className={`mobile-link ${pathname === item.href ? 'active' : ''}`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="mobile-menu-actions">
            {isAuthenticated ? (
              <>
                <div className="mobile-account">
                  <span className="avatar-dot">
                    {profile?.avatar_url && !fallbackAvatar ? (
                      <Image 
                        src={profile.avatar_url} 
                        alt="Avatar" 
                        width={40} 
                        height={40} 
                        className="avatar-img" 
                        unoptimized 
                        onError={() => setFallbackAvatar(true)} 
                      />
                    ) : (
                      initials
                    )}
                  </span>
                  <div>
                    <strong>{displayName}</strong>
                    {email && <small>{email}</small>}
                  </div>
                </div>
                <Link href="/settings" className="btn bg-btn full md-btn">
                  Settings
                </Link>
                <Link href="/billing" className="btn bg-btn full md-btn">
                  Billing
                </Link>
                <button className="btn bg-btn full md-btn" onClick={signOut}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn bg-btn full md-btn">
                  Login
                </Link>
                <Link href="/signup" className="btn bp full md-btn">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
