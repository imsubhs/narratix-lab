import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import SidebarNav from '@/components/layout/SidebarNav';

/**
 * Authenticated application shell.
 *
 * Composes the existing Navbar and Footer with the desktop rail, so the five
 * authenticated routes share one shell instead of each assembling their own.
 * The shell adds a *left* offset only — every page keeps the top padding it
 * already owned.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <SidebarNav />
      <div className="shell-main">
        {children}
        <Footer />
      </div>
    </>
  );
}
