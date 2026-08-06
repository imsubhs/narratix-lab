'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function ReportRedirectPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };

  useEffect(() => {
    if (id) {
      router.replace(`/reports/${id}`);
    }
  }, [id, router]);

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
      Redirecting to report...
    </div>
  );
}
