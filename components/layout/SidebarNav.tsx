'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { getDisplayName, getInitials } from '@/lib/account';
import {
  AnalyzeIcon,
  BillingIcon,
  CollapseIcon,
  DashboardIcon,
  LogoutIcon,
  ReportsIcon,
  SettingsIcon,
} from './NavIcons';

/**
 * Application shell rail — desktop only (≥1024px, enforced in CSS).
 *
 * The navigation items and routes mirror `Navbar.authNavItems` exactly; this
 * component introduces no new destinations. Below 1024px the rail is hidden and
 * the existing Navbar (tablet links / mobile hamburger drawer) is unchanged.
 */

export const APP_SHELL_ROUTES = ['/dashboard', '/analyze', '/history', '/billing', '/settings'];

const COLLAPSE_KEY = 'narratix_rail_collapsed';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', Icon: DashboardIcon },
  { href: '/analyze', label: 'Analyze', Icon: AnalyzeIcon },
  { href: '/history', label: 'Reports', Icon: ReportsIcon },
  { href: '/billing', label: 'Billing', Icon: BillingIcon },
];

export default function SidebarNav() {
  const pathname = usePathname() || '';
  const { user, profile, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const displayName = getDisplayName(user, profile);
  const email = profile?.email || user?.email || '';
  const initials = getInitials(profile?.full_name || email || displayName);
  const [fallbackAvatar, setFallbackAvatar] = useState(false);

  useEffect(() => {
    setFallbackAvatar(false);
  }, [profile?.avatar_url]);

  // Restore the collapse preference after mount so the server and client
  // markup agree on first paint.
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
    } catch {
      /* storage unavailable — the rail simply starts expanded */
    }
  }, []);

  // The main column's left offset is driven from the root element so the rail
  // and the content stay in step without prop-drilling through every page.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.rail = collapsed ? 'collapsed' : 'expanded';
    return () => {
      delete root.dataset.rail;
    };
  }, [collapsed]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        /* preference is not persisted; the rail still collapses */
      }
      return next;
    });
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className={`shell-rail${collapsed ? ' is-collapsed' : ''}`} data-collapsed={collapsed}>
      <nav className="shell-rail-nav" aria-label="Primary">
        <p className="shell-rail-heading" aria-hidden={collapsed}>
          Workspace
        </p>
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`shell-rail-item${active ? ' active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="shell-rail-icon">
                <Icon />
              </span>
              <span className={collapsed ? 'sr-only' : 'shell-rail-label'}>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="shell-rail-foot">
        <Link
          href="/settings"
          className={`shell-rail-account${isActive('/settings') ? ' active' : ''}`}
          aria-current={isActive('/settings') ? 'page' : undefined}
        >
          <span className="shell-rail-avatar">
            {profile?.avatar_url && !fallbackAvatar ? (
              <Image
                src={profile.avatar_url}
                alt=""
                width={32}
                height={32}
                unoptimized
                onError={() => setFallbackAvatar(true)}
              />
            ) : (
              initials
            )}
          </span>
          <span className={collapsed ? 'sr-only' : 'shell-rail-identity'}>
            <strong>{displayName}</strong>
            {email && <small>{email}</small>}
          </span>
        </Link>

        <Link
          href="/settings"
          className={`shell-rail-item${isActive('/settings') ? ' active' : ''}`}
          aria-current={isActive('/settings') ? 'page' : undefined}
        >
          <span className="shell-rail-icon">
            <SettingsIcon />
          </span>
          <span className={collapsed ? 'sr-only' : 'shell-rail-label'}>Settings</span>
        </Link>

        <button type="button" className="shell-rail-item shell-rail-signout" onClick={signOut}>
          <span className="shell-rail-icon">
            <LogoutIcon />
          </span>
          <span className={collapsed ? 'sr-only' : 'shell-rail-label'}>Logout</span>
        </button>

        <button
          type="button"
          className="shell-rail-item shell-rail-collapse"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
        >
          <span className="shell-rail-icon">
            <CollapseIcon collapsed={collapsed} />
          </span>
          <span className={collapsed ? 'sr-only' : 'shell-rail-label'}>
            {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          </span>
        </button>
      </div>
    </aside>
  );
}
