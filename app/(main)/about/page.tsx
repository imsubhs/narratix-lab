import Link from 'next/link';

export const metadata = {
  title: 'About — Narratix Lab',
  description: 'Built by creators, for creators. Honest diagnostics, privacy first.',
};

const values = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    title: 'Honest Diagnostics',
    desc: "We tell you what's actually broken — not what you want to hear.",
    bg: 'rgba(124,58,237,.1)',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    title: 'Privacy First',
    desc: 'Your scripts and files are never stored beyond analysis. Your data is never sold.',
    bg: 'rgba(52,211,153,.08)',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    title: 'Under 60 Seconds',
    desc: 'Full diagnostic report streamed live. No waiting, no loading screen.',
    bg: 'rgba(251,191,36,.08)',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      </svg>
    ),
    title: 'No Virality Promises',
    desc: 'We improve probability, not guarantee outcomes. Honest feedback only.',
    bg: 'rgba(239,68,68,.08)',
  },
];

export default function AboutPage() {
  return (
    <div style={{ padding: '110px 48px 80px' }}>
      <div className="wrap">
        <div className="sec-lbl" style={{ marginBottom: '14px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a78bfa', display: 'block' }} />
          About
        </div>
        <h1 style={{ fontSize: 'clamp(36px,4.5vw,56px)', fontWeight: 800, color: '#fff', letterSpacing: '-.04em', marginBottom: '18px' }}>
          Built by Creators.<br /><span className="gp">For Creators.</span>
        </h1>
        <p style={{ fontSize: '17px', color: 'rgba(255,255,255,.48)', lineHeight: 1.9, maxWidth: '600px', marginBottom: '56px' }}>
          We built Narratix Lab because we were frustrated by vague advice, useless analytics, and endless guesswork that wastes creator time.
        </p>

        <div className="about-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '60px', alignItems: 'start' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginBottom: '16px' }}>Our Mission</h2>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,.5)', lineHeight: 1.9, marginBottom: '16px' }}>
              Creators don&apos;t fail because they lack talent. They fail because they lack structured feedback. Most analytics tools tell you <em>what</em> happened — but none tell you <em>why</em> or <em>how to fix it</em>.
            </p>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,.5)', lineHeight: 1.9 }}>
              Narratix Lab brings Creator Intelligence diagnostics to every creator. We analyze what&apos;s broken before you post.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {values.map((v, i) => (
              <div key={i} className="card" style={{ padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '13px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: v.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {v.icon}
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>{v.title}</p>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.4)', lineHeight: 1.65 }}>{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: '52px', background: 'rgba(124,58,237,.06)', border: '1px solid rgba(124,58,237,.2)', borderRadius: '22px' }}>
          <h3 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>Ready to fix your scripts?</h3>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,.42)', marginBottom: '24px' }}>3 free analyses. No credit card. Results in 60 seconds.</p>
          <Link href="/analyze" className="btn bp xl-btn">Analyze My Script →</Link>
        </div>
      </div>
    </div>
  );
}
