import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import DashboardContent from '@/components/dashboard/DashboardContent';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata = {
  title: 'Dashboard — Narratix Lab',
  description: 'Your Narratix Lab Creator Intelligence workspace.',
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <>
      <Navbar />
      <Suspense fallback={
        <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0c20' }}>
          <div className="pulse-ring" style={{ width: '40px', height: '40px', border: '2px solid rgba(124,58,237,.3)', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      }>
        <DashboardContent />
      </Suspense>
      <Footer />
    </>
  );
}

