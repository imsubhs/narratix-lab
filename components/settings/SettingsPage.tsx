'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useAuth } from '@/components/auth/AuthProvider';
import { getDisplayName, getInitials } from '@/lib/account';
import { createClient } from '@/lib/supabase-browser';

/* ─────────────────────────────────────────────────────
   Section definitions
   ───────────────────────────────────────────────────── */
const SECTIONS = [
  { id: 'profile',       label: 'Profile',         icon: '👤' },
  { id: 'account',       label: 'Account',         icon: '🏠' },
  { id: 'security',      label: 'Security',        icon: '🔒' },
  { id: 'notifications', label: 'Notifications',   icon: '🔔' },
  { id: 'billing',       label: 'Billing',         icon: '💳' },
  { id: 'usage',         label: 'Usage & Limits',  icon: '📊' },
  { id: 'mcp',           label: 'MCP',             icon: '🔗' },
  { id: 'preferences',   label: 'Preferences',     icon: '⚙️' },
  { id: 'danger',        label: 'Danger Zone',     icon: '⚠️' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

/* Planned MCP connections. Order is intentional and matches the product roadmap.
   Logos are the official supplied brand assets in /public/brand. */
const MCP_CONNECTIONS = [
  { name: 'YouTube',   logo: '/brand/youtube.png' },
  { name: 'Instagram', logo: '/brand/instagram.png' },
  { name: 'Discord',   logo: '/brand/discord.png' },
  { name: 'LinkedIn',  logo: '/brand/linkedin.png' },
] as const;

/* ─────────────────────────────────────────────────────
   Toast Component
   ───────────────────────────────────────────────────── */
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`stg-toast ${type}`}>
      <span>{type === 'success' ? '✓' : '✕'}</span>
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss" style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}>×</button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   Toggle Switch
   ───────────────────────────────────────────────────── */
function Toggle({
  checked,
  onChange,
  id,
  labelledBy,
  describedBy,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
  labelledBy?: string;
  describedBy?: string;
}) {
  return (
    <span className="stg-toggle-control">
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        className={`stg-toggle ${checked ? 'on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="stg-toggle-track">
          <span className="stg-toggle-thumb" />
        </span>
      </button>
      {/* State is also carried as text, so it never depends on colour, shadow
          or thumb position alone. */}
      <span className="stg-toggle-state" aria-hidden="true">
        {checked ? 'ON' : 'OFF'}
      </span>
    </span>
  );
}

/* ─────────────────────────────────────────────────────
   Section Header
   ───────────────────────────────────────────────────── */
function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="stg-section-header">
      <span className="stg-section-icon">{icon}</span>
      <div>
        <h2 className="stg-section-title">{title}</h2>
        <p className="stg-section-subtitle">{subtitle}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   Main Settings Page
   ───────────────────────────────────────────────────── */
export default function SettingsPage() {
  const { user, profile, analysesUsed, accountState, signOut, refreshAccount } = useAuth();
  const supabase = createClient();

  const displayName = getDisplayName(user, profile);
  const email = profile?.email || user?.email || '';
  const initials = getInitials(profile?.full_name || email || displayName);
  const plan = profile?.plan === 'pro' ? 'Pro' : (profile?.plan === 'team' ? 'Team' : 'Free');
  const isPremium = plan === 'Pro' || plan === 'Team';
  const isPro = plan === 'Pro' || plan === 'Team';
  const freeLimit = 3;

  const [activeSection, setActiveSection] = useState<SectionId>('profile');
  const contentRef = useRef<HTMLDivElement>(null);

  // ─── Toast state ─────────
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  // ─── Profile state ──────────
  const [fullName, setFullName] = useState(profile?.display_name || profile?.full_name || '');
  const [displayNameInput, setDisplayNameInput] = useState(displayName);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // ─── Security state ─────────
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  // ─── Notification state ─────
  const [notifAnalysis, setNotifAnalysis] = useState(true);
  const [notifWeekly, setNotifWeekly] = useState(true);
  const [notifMarketing, setNotifMarketing] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);

  // ─── Preferences state ──────
  const [theme, setTheme] = useState<'dark' | 'light' | 'high-contrast' | 'system'>('dark');
  const [language, setLanguage] = useState('en');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [prefsSaving, setPrefsSaving] = useState(false);

  const handleThemeChange = (t: 'dark' | 'light' | 'high-contrast' | 'system') => {
    setTheme(t);
    let resolvedTheme = t;
    if (t === 'system') {
      resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    try {
      const saved = localStorage.getItem('narratix_prefs');
      const currentPrefs = saved ? JSON.parse(saved) : {};
      localStorage.setItem('narratix_prefs', JSON.stringify({
        ...currentPrefs,
        theme: t
      }));
    } catch { /* ignore */ }
  };

  // ─── Danger state ───────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Sync profile state when profile changes
  useEffect(() => {
    if (profile) {
      setFullName(profile.display_name || profile.full_name || '');
      setDisplayNameInput(profile.display_name || profile.full_name || displayName);
      if (profile.avatar_url && !avatarFile) {
        setAvatarPreview(profile.avatar_url);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('narratix_prefs');
      if (saved) {
        const prefs = JSON.parse(saved);
        if (prefs.theme) setTheme(prefs.theme);
        if (prefs.language) setLanguage(prefs.language);
        if (prefs.timezone) setTimezone(prefs.timezone);
        if (typeof prefs.notifAnalysis === 'boolean') setNotifAnalysis(prefs.notifAnalysis);
        if (typeof prefs.notifWeekly === 'boolean') setNotifWeekly(prefs.notifWeekly);
        if (typeof prefs.notifMarketing === 'boolean') setNotifMarketing(prefs.notifMarketing);
      }
    } catch { /* localStorage unavailable */ }
  }, []);

  // Scroll content to top on section change
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeSection]);

  // Set active section from query param ?tab=XXX on load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      // `integrations` was the previous id for this section; keep old links working.
      const tab = params.get('tab') === 'integrations' ? 'mcp' : params.get('tab');
      if (tab && SECTIONS.some((s) => s.id === tab)) {
        setActiveSection(tab as SectionId);
      }
    }
  }, []);

  // ─── Handlers ─────────────────

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = new Set(['jpg', 'jpeg', 'png', 'webp']);

    if (!ext || !allowedExtensions.has(ext) || !allowedTypes.has(file.type)) {
      showToast('Avatar must be JPG, PNG, or WebP.', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('Image must be under 2MB.', 'error');
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setProfileSaving(true);

    try {
      let avatarUrl = profile?.avatar_url || null;

      // Upload avatar if a new file was selected
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const filePath = `${user.id}/avatar.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true });

        if (uploadError) {
          console.error('[settings] Avatar upload failed:', uploadError.message);
          showToast('Avatar upload failed. Profile name saved without avatar.', 'error');
        } else {
          const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

          avatarUrl = urlData.publicUrl + `?t=${Date.now()}`;
        }
      }

      // Update profile in database
      const updatePayload: Record<string, unknown> = {
        display_name: displayNameInput.trim() || fullName.trim() || null,
      };

      if (avatarUrl !== profile?.avatar_url) {
        updatePayload.avatar_url = avatarUrl;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', user.id);

      if (error) {
        showToast('Failed to save profile: ' + error.message, 'error');
      } else {
        setAvatarFile(null);
        showToast('Profile saved successfully.', 'success');
        // Refresh auth context so Navbar updates immediately
        await refreshAccount();
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save profile.', 'error');
    }

    setProfileSaving(false);
  };

  const handleChangePassword = async () => {
    setPwError('');
    setPwSuccess('');

    if (!newPw || newPw.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError('Passwords do not match.');
      return;
    }

    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwLoading(false);

    if (error) {
      setPwError(error.message);
    } else {
      setPwSuccess('Password updated successfully.');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      showToast('Password updated successfully.', 'success');
      setTimeout(() => setPwSuccess(''), 4000);
    }
  };

  const handleLogoutAll = async () => {
    await supabase.auth.signOut({ scope: 'global' });
    signOut();
  };

  const handleSaveNotifications = () => {
    setNotifSaving(true);
    try {
      localStorage.setItem('narratix_prefs', JSON.stringify({
        theme, language, timezone, notifAnalysis, notifWeekly, notifMarketing,
      }));
      showToast('Notification preferences saved.', 'success');
    } catch {
      showToast('Failed to save preferences.', 'error');
    }
    setNotifSaving(false);
  };

  const handleSavePreferences = () => {
    setPrefsSaving(true);
    try {
      localStorage.setItem('narratix_prefs', JSON.stringify({
        theme, language, timezone, notifAnalysis, notifWeekly, notifMarketing,
      }));
      showToast('Preferences saved.', 'success');
    } catch {
      showToast('Failed to save preferences.', 'error');
    }
    setPrefsSaving(false);
  };

  const handleExportData = async () => {
    setExportLoading(true);
    try {
      const response = await fetch('/api/account/export');
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Export failed.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `narratix-export-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('Data exported successfully.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Export failed.', 'error');
    }
    setExportLoading(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== 'DELETE') return;
    setDeleteLoading(true);

    try {
      const response = await fetch('/api/account/delete', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Account deletion failed.');
      }

      // Sign out and redirect
      await signOut();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Account deletion failed.', 'error');
      setDeleteLoading(false);
    }
  };

  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  const googleProvider = user?.app_metadata?.provider === 'google' || user?.app_metadata?.providers?.includes('google');
  const loginProvider = googleProvider ? 'Google OAuth' : 'Email / Password';

  const resetDate = profile?.usage_reset_at
    ? new Date(profile.usage_reset_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Not scheduled';

  const usagePercent = isPro ? 100 : Math.min((analysesUsed / freeLimit) * 100, 100);
  const remaining = isPro ? '∞' : Math.max(freeLimit - analysesUsed, 0);

  /* ═══════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════ */
  return (
    <main className="stg-page">
      {/* ─── Toast ─── */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ─── Sidebar ─── */}
      <aside className="stg-sidebar">
        <div className="stg-sidebar-header">
          <div className="stg-sidebar-avatar">
            {avatarPreview ? (
              <Image src={avatarPreview} alt="Avatar" width={48} height={48} unoptimized />
            ) : (
              initials
            )}
          </div>
          <div>
            <p className="stg-sidebar-name">{displayName}</p>
            <p className="stg-sidebar-email">{email}</p>
          </div>
        </div>
        <nav className="stg-sidebar-nav">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`stg-nav-item ${activeSection === s.id ? 'active' : ''} ${s.id === 'danger' ? 'danger' : ''}`}
              onClick={() => setActiveSection(s.id)}
            >
              <span className="stg-nav-icon">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* ─── Content ─── */}
      <div className="stg-content" ref={contentRef}>

        {/* ═══ PROFILE ═══ */}
        {activeSection === 'profile' && (
          <div className="stg-section" key="profile">
            <SectionHeader icon="👤" title="Profile" subtitle="Manage your public profile information" />

            <div className="stg-card">
              <div className="stg-avatar-upload" onClick={() => avatarInputRef.current?.click()}>
                {avatarPreview ? (
                  <Image src={avatarPreview} alt="Avatar preview" className="stg-avatar-img" width={96} height={96} unoptimized />
                ) : (
                  <span className="stg-avatar-initials">{initials}</span>
                )}
                <div className="stg-avatar-overlay">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  <span>Upload</span>
                </div>
                <input ref={avatarInputRef} id="settings-avatar-input" aria-label="Upload avatar image" type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px' }}>Max 2MB · JPG, PNG, or WebP</p>

              <div className="stg-form-grid">
                <div className="stg-field">
                  <label htmlFor="settings-fullname" className="stg-label">Full Name</label>
                  <input id="settings-fullname" className="finput" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
                </div>
                <div className="stg-field">
                  <label htmlFor="settings-displayname" className="stg-label">Display Name</label>
                  <input id="settings-displayname" className="finput" value={displayNameInput} onChange={(e) => setDisplayNameInput(e.target.value)} placeholder="Display name" />
                </div>
              </div>

              <div className="stg-actions">
                <button className="btn bp md-btn" onClick={handleSaveProfile} disabled={profileSaving}>
                  {profileSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ ACCOUNT ═══ */}
        {activeSection === 'account' && (
          <div className="stg-section" key="account">
            <SectionHeader icon="🏠" title="Account" subtitle="Your account information and details" />

            <div className="stg-card">
              <div className="stg-info-grid">
                <div className="stg-info-row">
                  <span className="stg-info-label">Email</span>
                  <span className="stg-info-value">{email}</span>
                </div>
                <div className="stg-info-row">
                  <span className="stg-info-label">Login Provider</span>
                  <span className="stg-info-value">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '14px' }}>{googleProvider ? '🔵' : '📧'}</span>
                      {loginProvider}
                    </span>
                  </span>
                </div>
                <div className="stg-info-row">
                  <span className="stg-info-label">Current Plan</span>
                  <span className="stg-info-value">
                    <span className={`stg-plan-badge ${isPremium ? (plan === 'Team' ? 'team' : 'pro') : 'free'}`}>{plan}</span>
                  </span>
                </div>
                <div className="stg-info-row">
                  <span className="stg-info-label">Account Created</span>
                  <span className="stg-info-value">{createdAt}</span>
                </div>
                <div className="stg-info-row">
                  <span className="stg-info-label">Account ID</span>
                  <span className="stg-info-value stg-mono">{user?.id?.slice(0, 8)}...{user?.id?.slice(-4)}</span>
                </div>
                <div className="stg-info-row">
                  <span className="stg-info-label">Account Status</span>
                  <span className="stg-info-value">
                    <span className="account-status" style={{ color: 'var(--success-color)', background: 'var(--success-bg)', border: '1px solid var(--success-border)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, textTransform: 'capitalize' }}>
                      {accountState || 'Active'}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ SECURITY ═══ */}
        {activeSection === 'security' && (
          <div className="stg-section" key="security">
            <SectionHeader icon="🔒" title="Security" subtitle="Manage your password and security settings" />

            {/* Change Password */}
            <div className="stg-card">
              <h3 className="stg-card-title">Change Password</h3>
              <p className="stg-card-desc">Update your password to keep your account secure.</p>
              <div className="stg-form-stack">
                <div className="stg-field">
                  <label htmlFor="settings-current-pw" className="stg-label">Current Password</label>
                  <input id="settings-current-pw" className="finput" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="••••••••" />
                </div>
                <div className="stg-field">
                  <label htmlFor="settings-new-pw" className="stg-label">New Password</label>
                  <input id="settings-new-pw" className="finput" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Minimum 8 characters" />
                </div>
                <div className="stg-field">
                  <label htmlFor="settings-confirm-pw" className="stg-label">Confirm New Password</label>
                  <input id="settings-confirm-pw" className="finput" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="••••••••" />
                </div>
              </div>
              {pwError && <div className="stg-error">{pwError}</div>}
              {pwSuccess && <div className="stg-success">{pwSuccess}</div>}
              <div className="stg-actions">
                <button className="btn bp md-btn" onClick={handleChangePassword} disabled={pwLoading}>
                  {pwLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>

            {/* Connected Accounts */}
            <div className="stg-card">
              <h3 className="stg-card-title">Connected Accounts</h3>
              <div className="stg-info-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>🔵</span>
                  <div>
                    <span className="stg-info-label" style={{ display: 'block', marginBottom: '2px' }}>Google</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {googleProvider ? email : 'Not connected'}
                    </span>
                  </div>
                </div>
                <span className={`stg-status-dot ${googleProvider ? 'connected' : 'disconnected'}`}>
                  {googleProvider ? 'Connected' : 'Not linked'}
                </span>
              </div>
            </div>

            {/* Session Actions */}
            <div className="stg-card">
              <h3 className="stg-card-title">Sessions</h3>
              <p className="stg-card-desc">Manage your active sessions across devices.</p>
              <div className="stg-info-row" style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '16px' }}>💻</span>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Current Session</span>
                    <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>This device · Active now</span>
                  </div>
                </div>
                <span className="stg-status-dot connected">Active</span>
              </div>
              <div className="stg-actions" style={{ marginTop: '20px' }}>
                <button className="btn bg-btn md-btn" style={{ color: 'var(--danger-color)', borderColor: 'var(--danger-border)' }} onClick={handleLogoutAll}>
                  Logout All Devices
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ NOTIFICATIONS ═══ */}
        {activeSection === 'notifications' && (
          <div className="stg-section" key="notifications">
            <SectionHeader icon="🔔" title="Notifications" subtitle="Choose what notifications you want to receive" />

            <div className="stg-card">
              <div className="stg-toggle-row">
                <div>
                  <span className="stg-toggle-label" id="notif-analysis-label">Analysis Complete</span>
                  <span className="stg-toggle-desc" id="notif-analysis-desc">Get notified when your analysis is ready</span>
                </div>
                <Toggle
                  checked={notifAnalysis}
                  onChange={setNotifAnalysis}
                  id="notif-analysis"
                  labelledBy="notif-analysis-label"
                  describedBy="notif-analysis-desc"
                />
              </div>
              <div className="stg-divider" />
              <div className="stg-toggle-row">
                <div>
                  <span className="stg-toggle-label" id="notif-weekly-label">Weekly Summary</span>
                  <span className="stg-toggle-desc" id="notif-weekly-desc">Receive a weekly digest of your content performance</span>
                </div>
                <Toggle
                  checked={notifWeekly}
                  onChange={setNotifWeekly}
                  id="notif-weekly"
                  labelledBy="notif-weekly-label"
                  describedBy="notif-weekly-desc"
                />
              </div>
              <div className="stg-divider" />
              <div className="stg-toggle-row">
                <div>
                  <span className="stg-toggle-label" id="notif-marketing-label">Marketing Emails</span>
                  <span className="stg-toggle-desc" id="notif-marketing-desc">Tips, product updates, and feature announcements</span>
                </div>
                <Toggle
                  checked={notifMarketing}
                  onChange={setNotifMarketing}
                  id="notif-marketing"
                  labelledBy="notif-marketing-label"
                  describedBy="notif-marketing-desc"
                />
              </div>

              <div className="stg-actions" style={{ marginTop: '20px' }}>
                <button className="btn bp md-btn" onClick={handleSaveNotifications} disabled={notifSaving}>
                  {notifSaving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ BILLING ═══ */}
        {activeSection === 'billing' && (
          <div className="stg-section" key="billing">
            <SectionHeader icon="💳" title="Billing" subtitle="Review your Beta V1 plan and upcoming paid tiers" />

            <div className="stg-card stg-plan-card">
              <div className="stg-plan-header">
                <div>
                  <span className={`stg-plan-badge lg ${isPremium ? (plan === 'Team' ? 'team' : 'pro') : 'free'}`}>{plan}</span>
                  <h3 className="stg-card-title" style={{ marginTop: '12px' }}>
                    {plan === 'Team' ? 'Narratix Team' : (plan === 'Pro' ? 'Narratix Pro' : 'Narratix Free')}
                  </h3>
                  <p className="stg-card-desc">
                    {isPremium ? `${plan} plan state is preserved for future access. Beta V1 public features remain script and content analysis.` : 'Up to 3 analyses per month with standard processing.'}
                  </p>
                </div>
                {!isPremium && (
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button className="btn bo md-btn" style={{ opacity: 0.6, cursor: 'not-allowed' }} disabled>Pro Coming Soon</button>
                    <button className="btn bo md-btn" style={{ opacity: 0.6, cursor: 'not-allowed' }} disabled>Team Coming Soon</button>
                  </div>
                )}
                {plan === 'Pro' && (
                  <button className="btn bo md-btn" style={{ opacity: 0.6, cursor: 'not-allowed' }} disabled>Team Coming Soon</button>
                )}
              </div>
            </div>

            <div className="stg-card">
              <h3 className="stg-card-title">Billing History</h3>
              <div className="stg-empty-state">
                <span style={{ fontSize: '32px', marginBottom: '12px', display: 'block' }}>📋</span>
                <p>No billing history yet.</p>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Invoices will appear here after billing is enabled.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ═══ USAGE & LIMITS ═══ */}
        {activeSection === 'usage' && (
          <div className="stg-section" key="usage">
            <SectionHeader icon="📊" title="Usage & Limits" subtitle="Monitor your analysis usage and plan limits" />

            <div className="stg-card">
              <div className="stg-usage-header">
                <div>
                  <h3 className="stg-card-title">Monthly Usage</h3>
                  <p className="stg-card-desc">{isPremium ? `Unlimited analyses with ${plan} plan` : `${analysesUsed} of ${freeLimit} analyses used this month`}</p>
                </div>
                <span className="stg-usage-count">{analysesUsed}{!isPremium && `/${freeLimit}`}</span>
              </div>

              <div className="stg-usage-bar-wrap">
                <div className="stg-usage-bar">
                  <div
                    className="stg-usage-fill"
                    style={{
                      width: `${isPremium ? 100 : usagePercent}%`,
                      background: isPremium
                        ? 'var(--accent)'
                        : analysesUsed >= freeLimit
                          ? '#ef4444'
                          : 'var(--accent)',
                    }}
                  />
                </div>
              </div>

              <div className="stg-info-grid" style={{ marginTop: '24px' }}>
                <div className="stg-info-row">
                  <span className="stg-info-label">Remaining Analyses</span>
                  <span className="stg-info-value">{isPremium ? '∞' : Math.max(freeLimit - analysesUsed, 0)}</span>
                </div>
                <div className="stg-info-row">
                  <span className="stg-info-label">Reset Date</span>
                  <span className="stg-info-value">{resetDate}</span>
                </div>
                <div className="stg-info-row">
                  <span className="stg-info-label">Current Plan</span>
                  <span className="stg-info-value">
                    <span className={`stg-plan-badge ${isPremium ? (plan === 'Team' ? 'team' : 'pro') : 'free'}`}>{plan}</span>
                  </span>
                </div>
              </div>
            </div>

            {!isPremium && (
              <div className="stg-card stg-upgrade-card" style={{ opacity: 0.8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h3 className="stg-card-title">Need more analyses?</h3>
                    <p className="stg-card-desc">Pro and Team upgrades are Coming Soon after the Beta V1 launch.</p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn bo md-btn" style={{ opacity: 0.6, cursor: 'not-allowed' }} disabled>Pro Coming Soon</button>
                    <button className="btn bo md-btn" style={{ opacity: 0.6, cursor: 'not-allowed' }} disabled>Team Coming Soon</button>
                  </div>
                </div>
              </div>
            )}

            {plan === 'Pro' && (
              <div className="stg-card stg-upgrade-card" style={{ opacity: 0.8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h3 className="stg-card-title">Team Workspace</h3>
                    <p className="stg-card-desc">Team Workspace, Shared Reports, and client project folders are Coming Soon after Beta V1.</p>
                  </div>
                  <button className="btn bo md-btn" style={{ opacity: 0.6, cursor: 'not-allowed' }} disabled>Team Coming Soon</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ MCP ═══ */}
        {activeSection === 'mcp' && (
          <div className="stg-section" key="mcp">
            <SectionHeader icon="🔗" title="MCP" subtitle="Model Context Protocol" />

            <div className="stg-card stg-mcp-intro">
              <div className="stg-mcp-intro-head">
                <h3 className="stg-card-title" style={{ marginBottom: 0 }}>Model Context Protocol</h3>
                <span className="stg-status-pill">Coming Soon</span>
              </div>
              <p className="stg-card-desc" style={{ marginBottom: 0 }}>
                Connect Narratix intelligence with the AI tools and workflows you already use.
              </p>
            </div>

            <h3 className="stg-mcp-group-title" id="mcp-upcoming">Upcoming connections</h3>

            <div className="stg-integrations-grid" role="list" aria-labelledby="mcp-upcoming">
              {MCP_CONNECTIONS.map((connection) => (
                <div key={connection.name} className="stg-integration-card" role="listitem">
                  <div className="stg-integration-logo">
                    <Image
                      src={connection.logo}
                      alt=""
                      aria-hidden="true"
                      width={64}
                      height={64}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  </div>
                  <h4 className="stg-integration-name">{connection.name}</h4>
                  <span className="stg-coming-soon">Coming Soon</span>
                </div>
              ))}
            </div>

            <p className="stg-mcp-note">
              These connections are planned, not active. Nothing is linked to your account yet, and no
              data leaves Narratix Lab.
            </p>
          </div>
        )}

        {/* ═══ PREFERENCES ═══ */}
        {activeSection === 'preferences' && (
          <div className="stg-section" key="preferences">
            <SectionHeader icon="⚙️" title="Preferences" subtitle="Customize your app experience" />

            <div className="stg-card">
              <h3 className="stg-card-title">Theme</h3>
              <p className="stg-card-desc">Choose your preferred color scheme.</p>
              <div className="stg-theme-grid">
                {(['dark', 'light', 'high-contrast', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`stg-theme-btn ${theme === t ? 'active' : ''}`}
                    onClick={() => handleThemeChange(t)}
                  >
                    <span className="stg-theme-icon">
                      {t === 'dark' ? '🌙' : t === 'light' ? '☀️' : t === 'high-contrast' ? '👁️' : '💻'}
                    </span>
                    <span className="stg-theme-label">
                      {t === 'high-contrast' ? 'High Contrast' : t.charAt(0).toUpperCase() + t.slice(1)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="stg-card">
              <div className="stg-form-grid">
                <div className="stg-field">
                  <label htmlFor="settings-language" className="stg-label">Language</label>
                  <select id="settings-language" className="finput" value={language} onChange={(e) => setLanguage(e.target.value)}>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="ja">日本語</option>
                    <option value="hi">हिन्दी</option>
                  </select>
                </div>
                <div className="stg-field">
                  <label htmlFor="settings-timezone" className="stg-label">Timezone</label>
                  <select id="settings-timezone" className="finput" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                    <option value="America/New_York">Eastern (ET)</option>
                    <option value="America/Chicago">Central (CT)</option>
                    <option value="America/Denver">Mountain (MT)</option>
                    <option value="America/Los_Angeles">Pacific (PT)</option>
                    <option value="Europe/London">London (GMT)</option>
                    <option value="Europe/Berlin">Berlin (CET)</option>
                    <option value="Asia/Tokyo">Tokyo (JST)</option>
                    <option value="Asia/Kolkata">India (IST)</option>
                    <option value="Australia/Sydney">Sydney (AEST)</option>
                  </select>
                </div>
              </div>

              <div className="stg-actions" style={{ marginTop: '20px' }}>
                <button className="btn bp md-btn" onClick={handleSavePreferences} disabled={prefsSaving}>
                  {prefsSaving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ DANGER ZONE ═══ */}
        {activeSection === 'danger' && (
          <div className="stg-section" key="danger">
            <SectionHeader icon="⚠️" title="Danger Zone" subtitle="Irreversible and destructive actions" />

            <div className="stg-card stg-danger-card">
              <div className="stg-danger-row">
                <div>
                  <h4 className="stg-danger-title">Export Data</h4>
                  <p className="stg-danger-desc">Download a copy of all your analyses and account data.</p>
                </div>
                <button className="btn bg-btn md-btn" onClick={handleExportData} disabled={exportLoading}>
                  {exportLoading ? 'Exporting...' : 'Export Data'}
                </button>
              </div>
              <div className="stg-divider danger" />
              <div className="stg-danger-row">
                <div>
                  <h4 className="stg-danger-title">Logout</h4>
                  <p className="stg-danger-desc">Sign out of your current session on this device.</p>
                </div>
                <button className="btn bg-btn md-btn" onClick={signOut}>Logout</button>
              </div>
              <div className="stg-divider danger" />
              <div className="stg-danger-row">
                <div>
                  <h4 className="stg-danger-title" style={{ color: 'var(--danger-color)' }}>Delete Account</h4>
                  <p className="stg-danger-desc">Permanently delete your account and all associated data. This action cannot be undone.</p>
                </div>
                <button
                  className="btn md-btn"
                  style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-color)' }}
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete Account
                </button>
              </div>
            </div>

            {/* Delete confirmation modal */}
            {showDeleteConfirm && (
              <div className="stg-modal-overlay" onClick={() => { if (!deleteLoading) { setShowDeleteConfirm(false); } }}>
                <div className="stg-modal" onClick={(e) => e.stopPropagation()}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--danger-color)', marginBottom: '8px' }}>Delete Account</h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.7 }}>
                    This will permanently delete your account and all data including analyses, profile, and settings. Type <strong style={{ color: 'var(--text-primary)' }}>DELETE</strong> to confirm.
                  </p>
                  <input
                    id="settings-delete-confirm-input"
                    aria-label="Type DELETE to confirm account deletion"
                    className="finput"
                    placeholder="Type DELETE to confirm"
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    style={{ marginBottom: '16px' }}
                    disabled={deleteLoading}
                  />
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button className="btn bg-btn md-btn" onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }} disabled={deleteLoading}>Cancel</button>
                    <button
                      className="btn md-btn"
                      style={{
                        background: deleteInput === 'DELETE' ? 'var(--danger-color)' : 'var(--danger-bg)',
                        color: '#fff',
                        border: `1px solid ${deleteInput === 'DELETE' ? 'transparent' : 'var(--danger-border)'}`
                      }}
                      disabled={deleteInput !== 'DELETE' || deleteLoading}
                      onClick={handleDeleteAccount}
                    >
                      {deleteLoading ? 'Deleting...' : 'Permanently Delete'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
