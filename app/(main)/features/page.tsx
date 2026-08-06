import Link from 'next/link';

export const metadata = {
  title: 'Features — Narratix Lab',
  description: 'Six Creator Intelligence modules that diagnose every layer of your short-form content.',
};

const v1Modules = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
    ),
    title: 'Hook Intelligence',
    desc: 'Analyzes your opening moments and identifies why viewers stop or continue watching.',
    color: 'rgba(248,113,113,.08)',
    badge: 'Module 01',
    badgeColor: '#f87171',
    badgeBg: 'rgba(248,113,113,.12)',
    badgeBorder: 'rgba(248,113,113,.25)',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
    ),
    title: 'Retention Intelligence',
    desc: 'Detects retention weaknesses and identifies likely audience drop-off points.',
    color: 'rgba(251,191,36,.08)',
    badge: 'Module 02',
    badgeColor: '#fbbf24',
    badgeBg: 'rgba(251,191,36,.12)',
    badgeBorder: 'rgba(251,191,36,.25)',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
    ),
    title: 'Script Architecture Analysis',
    desc: 'Evaluates structure, pacing, clarity, and storytelling effectiveness.',
    color: 'rgba(167,139,250,.08)',
    badge: 'Module 03',
    badgeColor: '#a78bfa',
    badgeBg: 'rgba(167,139,250,.12)',
    badgeBorder: 'rgba(167,139,250,.25)',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
    ),
    title: 'Emotional Resonance Mapping',
    desc: 'Measures emotional engagement and audience connection throughout the content.',
    color: 'rgba(56,189,248,.08)',
    badge: 'Module 04',
    badgeColor: '#38bdf8',
    badgeBg: 'rgba(56,189,248,.12)',
    badgeBorder: 'rgba(56,189,248,.25)',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f472b6" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>
    ),
    title: 'Growth Intelligence',
    desc: 'Provides creator-focused growth insights and optimization opportunities.',
    color: 'rgba(244,114,182,.08)',
    badge: 'Module 05',
    badgeColor: '#f472b6',
    badgeBg: 'rgba(244,114,182,.12)',
    badgeBorder: 'rgba(244,114,182,.25)',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>
    ),
    title: 'Creator Recommendations',
    desc: 'Generates actionable recommendations to strengthen content performance.',
    color: 'rgba(52,211,153,.08)',
    badge: 'Module 06',
    badgeColor: '#34d399',
    badgeBg: 'rgba(52,211,153,.12)',
    badgeBorder: 'rgba(52,211,153,.25)',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
    ),
    title: 'Professional Export System',
    desc: 'Export every analysis as a polished, share-ready report across multiple professional formats.',
    color: 'rgba(34,211,238,.08)',
    badge: 'Included',
    badgeColor: '#22d3ee',
    badgeBg: 'rgba(34,211,238,.12)',
    badgeBorder: 'rgba(34,211,238,.25)',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round"><path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l4 2" /></svg>
    ),
    title: 'Report History',
    desc: 'Revisit, review, and re-export every analysis you have run from your personal report history.',
    color: 'rgba(192,132,252,.08)',
    badge: 'Included',
    badgeColor: '#c084fc',
    badgeBg: 'rgba(192,132,252,.12)',
    badgeBorder: 'rgba(192,132,252,.25)',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round"><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="15" x2="23" y2="15" /><line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="15" x2="4" y2="15" /></svg>
    ),
    title: 'Narratix Intelligence Engine',
    desc: 'The unified AI engine that powers every module and turns your script into a full creator intelligence report.',
    color: 'rgba(129,140,248,.08)',
    badge: 'Core Engine',
    badgeColor: '#818cf8',
    badgeBg: 'rgba(129,140,248,.12)',
    badgeBorder: 'rgba(129,140,248,.25)',
  },
];

const futureModules = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
    ),
    title: 'Video Analysis',
    desc: 'Direct video file upload analysis, automated pacing feedback, and visual indicators.',
    color: 'rgba(148,163,184,.04)',
    badge: 'COMING SOON',
    badgeColor: '#94a3b8',
    badgeBg: 'rgba(148,163,184,.12)',
    badgeBorder: 'rgba(148,163,184,.25)',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /></svg>
    ),
    title: 'Editing Intelligence',
    desc: 'automated visual pacing analyzer, pattern interrupts, and automated editing cuts diagnostics.',
    color: 'rgba(148,163,184,.04)',
    badge: 'COMING SOON',
    badgeColor: '#94a3b8',
    badgeBg: 'rgba(148,163,184,.12)',
    badgeBorder: 'rgba(148,163,184,.25)',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    ),
    title: 'Viewer Emotion Tracking',
    desc: 'Map structural hook synchronization with viewer facial expression signals.',
    color: 'rgba(148,163,184,.04)',
    badge: 'COMING SOON',
    badgeColor: '#94a3b8',
    badgeBg: 'rgba(148,163,184,.12)',
    badgeBorder: 'rgba(148,163,184,.25)',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 8V12L14 14" /></svg>
    ),
    title: 'Frame-Level Retention Mapping',
    desc: 'Pinpoint exact frame transitions, visual overlays, and pacing that cause drops.',
    color: 'rgba(148,163,184,.04)',
    badge: 'COMING SOON',
    badgeColor: '#94a3b8',
    badgeBg: 'rgba(148,163,184,.12)',
    badgeBorder: 'rgba(148,163,184,.25)',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
    ),
    title: 'Creator Rewrite Engine',
    desc: 'Auto-generate paragraph and voiceover alternatives to optimize pacing.',
    color: 'rgba(148,163,184,.04)',
    badge: 'COMING SOON',
    badgeColor: '#94a3b8',
    badgeBg: 'rgba(148,163,184,.12)',
    badgeBorder: 'rgba(148,163,184,.25)',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
    ),
    title: 'Caption Generator',
    desc: 'Generate platform-specific, optimized captions, titles, and text overlays.',
    color: 'rgba(148,163,184,.04)',
    badge: 'COMING SOON',
    badgeColor: '#94a3b8',
    badgeBg: 'rgba(148,163,184,.12)',
    badgeBorder: 'rgba(148,163,184,.25)',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
    ),
    title: 'Thumbnail Intelligence',
    desc: 'Score thumbnail concepts for click potential and generate high-performing visual direction.',
    color: 'rgba(148,163,184,.04)',
    badge: 'COMING SOON',
    badgeColor: '#94a3b8',
    badgeBg: 'rgba(148,163,184,.12)',
    badgeBorder: 'rgba(148,163,184,.25)',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
    ),
    title: 'Publishing Assistant',
    desc: 'Recommend optimal posting times, platform formatting, and cross-platform publishing strategies.',
    color: 'rgba(148,163,184,.04)',
    badge: 'COMING SOON',
    badgeColor: '#94a3b8',
    badgeBg: 'rgba(148,163,184,.12)',
    badgeBorder: 'rgba(148,163,184,.25)',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" /></svg>
    ),
    title: 'Brand Intelligence',
    desc: 'Maintain a consistent brand voice, tone, and messaging profile across every piece of content.',
    color: 'rgba(148,163,184,.04)',
    badge: 'COMING SOON',
    badgeColor: '#94a3b8',
    badgeBg: 'rgba(148,163,184,.12)',
    badgeBorder: 'rgba(148,163,184,.25)',
  },
];

export default function FeaturesPage() {
  return (
    <div style={{ padding: '110px 48px 80px' }}>
      <div className="wrap">
        <div className="sec-lbl" style={{ marginBottom: '14px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a78bfa', display: 'block' }} />
          All Features
        </div>
        <h1 style={{ fontSize: 'clamp(36px,4.5vw,56px)', fontWeight: 800, color: '#fff', letterSpacing: '-.04em', marginBottom: '14px' }}>
          Six Creator Intelligence Modules.<br /><span className="gb">Every Layer Covered.</span>
        </h1>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,.42)', lineHeight: 1.85, maxWidth: '520px', marginBottom: '48px' }}>
          Narratix Lab analyzes every critical layer of your content before you publish, helping creators improve hooks, retention, storytelling, emotional impact, and growth potential.
        </p>

        {/* Live V1 Section */}
        <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🧪</span> Available in Beta V1
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '20px', marginBottom: '64px' }}>
          {v1Modules.map((m, i) => (
            <div key={i} className="fc" style={{ padding: '32px' }}>
              <div className="fi" style={{ background: m.color }}>
                {m.icon}
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 800, background: m.badgeBg, color: m.badgeColor, border: `1px solid ${m.badgeBorder}`, marginBottom: '14px' }}>{m.badge}</span>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>{m.title}</h3>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,.48)', lineHeight: 1.8 }}>{m.desc}</p>
            </div>
          ))}
        </div>

        {/* Future V2 Section */}
        <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'rgba(255,255,255,0.7)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🚀</span> Coming in Future Versions
        </h2>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)', marginBottom: '28px', maxWidth: '600px' }}>
          Our roadmap for Narratix Lab. These modules are planned for upcoming versions and are actively in development.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '20px', opacity: 0.6 }}>
          {futureModules.map((m, i) => (
            <div key={i} className="fc" style={{ padding: '32px', border: '1px dashed rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.01)' }}>
              <div className="fi" style={{ background: m.color }}>
                {m.icon}
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 800, background: m.badgeBg, color: m.badgeColor, border: `1px solid ${m.badgeBorder}`, marginBottom: '14px' }}>{m.badge}</span>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'rgba(255,255,255,0.6)', marginBottom: '10px' }}>{m.title}</h3>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.8 }}>{m.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '64px', padding: '40px', background: 'rgba(124,58,237,.06)', border: '1px solid rgba(124,58,237,.2)', borderRadius: '18px' }}>
          <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>Try Creator Intelligence Free</h3>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,.4)', marginBottom: '22px' }}>3 free analyses/month. No credit card required during beta.</p>
          <Link href="/analyze" className="btn bp lg-btn">Analyze My Script →</Link>
        </div>
      </div>
    </div>
  );
}
