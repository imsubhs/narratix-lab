import SettingsPage from '@/components/settings/SettingsPage';
import AppShell from '@/components/layout/AppShell';

export const metadata = {
  title: 'Settings — Narratix Lab',
  description: 'Manage your Narratix Lab account settings, security, billing, and preferences.',
};

export default function SettingsRoute() {
  return (
    <AppShell>
      <SettingsPage />
    </AppShell>
  );
}
