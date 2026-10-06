export const metadata = {
  title: 'Resources — Narratix Lab',
  description: 'Coming Soon creator resources for Narratix Lab Beta V1 users.',
};

const resources = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
    type: 'GUIDE',
    typeColor: '#c4b5fd',
    typeBg: 'rgba(124,58,237,.12)',
    typeBorder: 'rgba(124,58,237,.25)',
    title: 'Hook Writing Playbook',
    desc: '15 proven hook formulas that stop the scroll in under 1 second.',
    linkColor: '#a78bfa',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round">
        <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
    type: 'VIDEO',
    typeColor: '#38bdf8',
    typeBg: 'rgba(56,189,248,.1)',
    typeBorder: 'rgba(56,189,248,.22)',
    title: 'Retention Masterclass',
    desc: '45-minute video course on viewer psychology and pacing techniques.',
    linkColor: '#38bdf8',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f472b6" strokeWidth="2" strokeLinecap="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    type: 'TEMPLATE',
    typeColor: '#f472b6',
    typeBg: 'rgba(244,114,182,.1)',
    typeBorder: 'rgba(244,114,182,.22)',
    title: 'Script Template Pack',
    desc: '12 fill-in-the-blank script structures optimized for high retention.',
    linkColor: '#f472b6',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
      </svg>
    ),
    type: 'NEWSLETTER',
    typeColor: '#fbbf24',
    typeBg: 'rgba(251,191,36,.1)',
    typeBorder: 'rgba(251,191,36,.22)',
    title: 'Weekly Creator Intel',
    desc: 'Algorithm updates, trending hook patterns, and Creator Intelligence insights.',
    linkColor: '#fbbf24',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    type: 'COMMUNITY',
    typeColor: '#c084fc',
    typeBg: 'rgba(192,132,252,.1)',
    typeBorder: 'rgba(192,132,252,.22)',
    title: 'Creator Discord',
    desc: 'Private space for sharing script breakdowns and collaborating with other creators.',
    linkColor: '#c084fc',
  },
];

export default function ResourcesPage() {
  return (
    <div style={{ padding: '110px 48px 80px' }}>
      <div className="wrap">
        <div className="sec-lbl" style={{ marginBottom: '14px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a78bfa', display: 'block' }} />
          Resources
        </div>
        <h1 style={{ fontSize: 'clamp(36px,4.5vw,54px)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-.04em', marginBottom: '16px' }}>
          Learn to Build<br /><span className="gb">Scripts That Perform</span>
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.85, maxWidth: '520px', marginBottom: '56px' }}>
          Creator guides, masterclasses, templates, and community access are planned resources. No downloads or external links are active during Beta V1.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(290px,1fr))', gap: '18px' }}>
          {resources.map((r, i) => (
            <div key={i} className="fc" style={{ padding: '28px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ marginBottom: '14px' }}>{r.icon}</div>
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 800, background: r.typeBg, color: r.typeColor, border: `1px solid ${r.typeBorder}`, marginBottom: '12px' }}>{r.type}</span>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>{r.title}</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: '16px' }}>{r.desc}</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', background: 'rgba(124,58,237,0.1)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.15)' }}>COMING SOON</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
