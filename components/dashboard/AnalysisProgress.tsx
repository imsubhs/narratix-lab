'use client';

interface StageInfo {
  stage: string;
  status: 'running' | 'done' | 'skipped' | 'error';
  message: string;
}

interface Props {
  stages: StageInfo[];
  currentStage: string;
}

const STAGE_MAP: Record<string, { icon: string; label: string; color: string }> = {
  checking_usage: { icon: '✓', label: 'Checking Usage', color: '#818cf8' },
  uploading: { icon: '📤', label: 'Uploading Content', color: '#818cf8' },
  processing: { icon: '⚙️', label: 'Preparing Content', color: '#a78bfa' },
  transcribing: { icon: '✎', label: 'Reading Text', color: '#38bdf8' },
  analyzing: { icon: '🧠', label: 'Creator Intelligence Analysis', color: '#c084fc' },
  complete: { icon: '✅', label: 'Analysis Complete', color: '#34d399' },
  error: { icon: '❌', label: 'Error', color: '#f87171' },
};

export default function AnalysisProgress({ stages, currentStage }: Props) {
  const doneCount = stages.filter(s => s.status === 'done').length;
  const progressPercent = Math.round((doneCount / Math.max(stages.length, 1)) * 100);

  return (
    <div style={{ animation: 'fadeUp .4s ease' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginBottom: '12px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a78bfa', display: 'block', animation: 'blink 2s infinite' }}></span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,.5)', letterSpacing: '.05em' }}>CREATOR INTELLIGENCE ANALYSIS</span>
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>Running Diagnostic Engine</h2>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,.35)', maxWidth: '440px', margin: '0 auto' }}>
          We are analyzing your script for hook strength, retention triggers, and growth opportunities.
        </p>
      </div>

      <div style={{ maxWidth: '540px', margin: '0 auto' }}>
        {/* Overall Progress Bar */}
        <div style={{
          background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)',
          borderRadius: '18px', padding: '22px', marginBottom: '28px', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255,255,255,.3)', fontWeight: 700, marginBottom: '8px' }}>
            <span>TOTAL PROGRESS</span>
            <span>{progressPercent}%</span>
          </div>
          <div style={{ height: '4px', background: 'rgba(255,255,255,.06)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, #7c3aed, #3b82f6)', transition: 'width 0.5s' }}></div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {stages.map((s, i) => {
            const meta = STAGE_MAP[s.stage] || { icon: '⚙️', label: s.stage, color: '#a78bfa' };
            const isActive = s.stage === currentStage && s.status === 'running';
            const isDone = s.status === 'done';

            return (
              <div
                key={i}
                className={`stage ${isActive ? 'running' : ''} ${isDone ? 'done' : ''}`}
              >
                {/* Status icon/spinner */}
                <div style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {isActive ? (
                    <div className="spinner"></div>
                  ) : isDone ? (
                    <span style={{ color: '#34d399', fontWeight: 800, fontSize: '14px' }}>✓</span>
                  ) : (
                    <span style={{ fontSize: '16px', opacity: 0.5 }}>{meta.icon}</span>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: '14px', fontWeight: 700,
                    color: isActive ? '#fff' : isDone ? 'rgba(255,255,255,.65)' : 'rgba(255,255,255,0.3)',
                  }}>
                    {meta.label}
                  </p>
                </div>

                {isActive && (
                  <span className="bdg bdg-p" style={{ fontSize: '10px', padding: '2px 8px' }}>Running</span>
                )}
                {isDone && (
                  <span className="bdg bdg-g" style={{ fontSize: '10px', padding: '2px 8px' }}>Done</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
