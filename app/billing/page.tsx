import { BillingAccountPage } from '@/components/account/AccountPages';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata = {
  title: 'Billing — Narratix Lab',
  description: 'Narratix Lab billing and plan details.',
};

export default function BillingPage() {
  return (
    <>
      <Navbar />
      <BillingAccountPage />
      <Footer />
    </>
  );
}
