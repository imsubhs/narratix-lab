import SettingsPage from '@/components/settings/SettingsPage';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata = {
  title: 'Settings — Narratix Lab',
  description: 'Manage your Narratix Lab account settings, security, billing, and preferences.',
};

export default function SettingsRoute() {
  return (
    <>
      <Navbar />
      <SettingsPage />
      <Footer />
    </>
  );
}
