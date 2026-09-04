import { Suspense } from 'react';
import AnalyzerClient from '@/components/analyzer/AnalyzerClient';
import AppShell from '@/components/layout/AppShell';

export const metadata = {
  title: 'Creator Intelligence — Narratix Lab',
  description: 'Paste your script, content concept, or outline. Narratix Lab analyzes structure, retention potential, hooks, pacing, and content strategy in real time.',
};

export default function AnalyzePage() {
  return (
    <AppShell>
      <div style={{ minHeight: '100vh', paddingTop: '90px', paddingBottom: '80px' }}>
        <Suspense>
          <AnalyzerClient />
        </Suspense>
      </div>
    </AppShell>
  );
}
