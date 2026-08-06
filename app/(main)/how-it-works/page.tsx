import Link from 'next/link';

export const metadata = {
  title: 'How it Works — Narratix Lab',
  description: 'A simple Beta V1 workflow for Creator Intelligence script and content analysis.',
};

export default function HowItWorksPage() {
  return (
    <div style={{ padding: '110px 48px 80px' }}>
      <div className="wrap">
        <div className="sec-lbl" style={{ marginBottom: '14px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a78bfa', display: 'block' }} />
          Process
        </div>
        <h1 style={{ fontSize: 'clamp(36px,4.5vw,54px)', fontWeight: 800, color: '#fff', letterSpacing: '-.04em', marginBottom: '16px' }}>
          How Narratix Lab <span className="gb">Analyzes</span> Your Content
        </h1>
        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,.42)', lineHeight: 1.85, maxWidth: '560px', marginBottom: '70px' }}>
          Get Beta V1 Creator Intelligence reports. Paste text or upload documents, provide context, and receive script and content diagnostics.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxWidth: '700px' }}>
          {[
            { 
              num: '1', 
              title: 'Paste Script or Upload Document', 
              desc: 'Enter your script directly, or upload document files (PDF, DOCX, TXT, MD) up to 10MB.', 
              color: '#7c3aed,#4338ca', 
              shadow: 'rgba(124,58,237,.5)' 
            },
            { 
              num: '2', 
              title: 'Provide Context', 
              desc: 'Specify Platform, Niche, Goal, and Length so the analysis reflects the creator situation.', 
              color: '#4338ca,#3b82f6', 
              shadow: 'rgba(59,130,246,.4)' 
            },
            { 
              num: '3', 
              title: 'Narratix Lab Runs 6 Creator Intelligence Modules', 
              desc: 'Hook Intelligence, Retention Intelligence, Script Architecture Analysis, Emotional Resonance Mapping, Growth Intelligence, and Creator Recommendations run together.', 
              color: '#10b981,#059669', 
              shadow: 'rgba(16,185,129,.4)' 
            },
          ].map((step, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: `linear-gradient(135deg,${step.color})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800, color: '#fff', boxShadow: `0 0 24px ${step.shadow}` }}>
                  {step.num}
                </div>
                {i < 2 && <div style={{ flex: 1, width: '2px', background: `linear-gradient(180deg,${step.shadow},transparent)`, margin: '8px 0', minHeight: '120px' }} />}
              </div>
              <div style={{ padding: i < 2 ? '0 0 60px 24px' : '0 0 0 24px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>{step.title}</h2>
                <p style={{ fontSize: '15px', color: 'rgba(255,255,255,.48)', lineHeight: 1.85 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '64px' }}>
          <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>
            Ready to see your script&apos;s <span className="gb">real problems?</span>
          </h3>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,.42)', marginBottom: '26px' }}>
            3 free analyses. No credit card. Under 60 seconds.
          </p>
          <Link href="/analyze" className="btn bp xl-btn">Analyze My Script Free →</Link>
        </div>
      </div>
    </div>
  );
}
