import { notFound } from 'next/navigation';
import UiReviewLauncher from './UiReviewLauncher';

/**
 * DEVELOPMENT-ONLY visual review launcher — Phase 0.5B.
 *
 * This route exists so the owner can inspect the real application locally
 * before any deployment decision. It links to the actual production routes; it
 * does not reimplement or replace any of them.
 *
 * It is impossible to reach in production: the guard below returns a 404
 * whenever NODE_ENV is 'production', which is what `next build`/`next start`
 * and Vercel always set. The check runs on the server, so the page is never
 * rendered or sent.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Local UI Review — Narratix Lab',
  robots: { index: false, follow: false },
};

export default function UiReviewPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  return <UiReviewLauncher />;
}
