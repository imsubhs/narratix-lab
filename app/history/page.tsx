import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { HistoryAccountPage } from '@/components/account/AccountPages';

export const metadata = {
  title: 'Analysis Report — Narratix Lab',
  description: 'Your Narratix Lab analysis reports.',
};

export default function HistoryPage() {
  return (
    <>
      <Navbar />
      <HistoryAccountPage />
      <Footer />
    </>
  );
}
