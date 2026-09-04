import { BillingAccountPage } from '@/components/account/AccountPages';
import AppShell from '@/components/layout/AppShell';

export const metadata = {
  title: 'Billing — Narratix Lab',
  description: 'Narratix Lab billing and plan details.',
};

export default function BillingPage() {
  return (
    <AppShell>
      <BillingAccountPage />
    </AppShell>
  );
}
