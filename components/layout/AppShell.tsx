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
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-[var(--accent)] focus:px-4 focus:py-2 focus:text-white focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>
      <Navbar />
      <SidebarNav />
      <main id="main-content" className="shell-main" tabIndex={-1}>
        {children}
        <Footer />
      </main>
    </>
  );
}
