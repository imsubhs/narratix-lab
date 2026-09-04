import AppShell from '@/components/layout/AppShell';
import { HistoryAccountPage } from '@/components/account/AccountPages';

export const metadata = {
  title: 'Analysis Report — Narratix Lab',
  description: 'Your Narratix Lab analysis reports.',
};

export default function HistoryPage() {
  return (
    <AppShell>
      <HistoryAccountPage />
    </AppShell>
  );
}
