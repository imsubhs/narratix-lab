'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { BETA_BADGE } from '@/lib/features';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  }),
};

export default function HomePageClient() {
  const [heroUrl, setHeroUrl] = useState('');
  const router = useRouter();

  const handleHeroAnalyze = () => {
    const q = heroUrl.trim() ? `?script=${encodeURIComponent(heroUrl.trim())}` : '';
    router.push(`/analyze${q}`);
  };

  return (
    <>
      <Navbar />

      {/* ═══ HERO ═══ */}
      <section
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          padding: '130px 48px 80px',
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--bg-primary)',
        }}
      >
        <div className="wrap hero-grid">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
          >
            <div className="tag" style={{ marginBottom: '24px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', display: 'block', animation: 'pulse-soft 2s infinite' }} />
              {BETA_BADGE}
            </div>
            <h1 className="h1" style={{ marginBottom: '20px', color: 'var(--text-primary)' }}>
              Understand Why Your<br />Content <span className="gp">Doesn&apos;t Retain</span> Viewers
            </h1>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.75, maxWidth: '480px', marginBottom: '32px' }}>
              Paste your script or upload a document. Narratix Lab analyzes hook, pacing, structure, and emotional resonance — giving you exact feedback before you publish.
            </p>
            <div className="ibar" style={{ marginBottom: '20px' }}>
              <input placeholder="Paste your script or content description..." value={heroUrl} onChange={(e) => setHeroUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleHeroAnalyze(); }} />
              <div style={{ display: 'flex', gap: '12px', padding: '0 12px', color: 'var(--text-muted)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ cursor: 'pointer' }}>
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ cursor: 'pointer' }} onClick={() => router.push('/analyze')}>
                  <polyline points="16 16 12 12 8 16" />
                  <line x1="12" y1="12" x2="12" y2="21" />
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                </svg>
              </div>
              <button className="btn bp md-btn" style={{ borderRadius: '100px', padding: '10px 20px', fontSize: '13px', border: 'none', cursor: 'pointer' }} onClick={handleHeroAnalyze}>
                Analyze →
              </button>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' as const }}>
              <Link href="/analyze" className="btn bg-btn sm">Upload Document</Link>
              <Link href="/pricing" className="btn bo sm">View Pricing</Link>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Modern analytics</span> for early-stage creators.
              </p>
            </div>
            <div className="plats" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
              <span>YouTube</span>
              <span>Instagram</span>
              <span>TikTok</span>
              <span>Substack</span>
              <span>LinkedIn</span>
            </div>
          </motion.div>

          {/* Right side — premium browser dashboard mockup */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={2}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <div style={{ width: '100%', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--card-bg)', boxShadow: 'var(--shadow-lg)' }}>
              {/* Browser control header bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px var(--space-4)', borderBottom: '1px solid var(--border-secondary)', background: 'var(--bg-secondary)' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(var(--text-muted), 0.2)', backgroundColor: 'var(--text-muted)', opacity: 0.3 }} />
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(var(--text-muted), 0.2)', backgroundColor: 'var(--text-muted)', opacity: 0.3 }} />
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(var(--text-muted), 0.2)', backgroundColor: 'var(--text-muted)', opacity: 0.3 }} />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>narratixlab.com/report/18f3a</div>
                <div style={{ width: '28px' }} />
              </div>
              
              {/* Browser page mock content */}
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '4px' }}>Short-Form Audit</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>3 Keys to High-Ticket Clients</div>
                  </div>
                  <div style={{ padding: '4px 10px', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', borderRadius: '100px', fontSize: '11px', color: 'var(--accent)', fontWeight: 700 }}>
                    Overall 8.4/10
                  </div>
                </div>

                {/* Simulated Chart */}
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Retention Prediction</span>
                    <span style={{ fontSize: '11px', color: 'var(--success-color)', fontWeight: 600 }}>Strong Opening</span>
                  </div>
                  <div style={{ height: '70px', position: 'relative', display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
                    {[80, 85, 78, 62, 58, 55, 59, 72, 70, 68, 65, 62, 60, 58, 52, 48].map((h, i) => (
                      <div key={i} style={{ flex: 1, height: `${h}%`, background: i < 3 ? 'var(--accent)' : 'var(--text-muted)', opacity: i < 3 ? 0.95 : 0.25, borderRadius: '2px 2px 0 0', transition: 'all 0.3s' }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px' }}>
                    <span>0:00 (Hook)</span>
                    <span>0:15 (Body)</span>
                    <span>0:30 (CTA)</span>
                  </div>
                </div>

                {/* Sub-Metrics Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ border: '1px solid var(--border-secondary)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Hook Engagement</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>9.2 / 10</div>
                  </div>
                  <div style={{ border: '1px solid var(--border-secondary)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Message Clarity</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>High</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ PROBLEM ═══ */}
      <section className="sec-alt" style={{ padding: '80px 48px' }}>
        <div className="wrap">
          <motion.h2
            className="h2"
            style={{ marginBottom: '48px' }}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
          >
            Why short-form content gets scrolled past
          </motion.h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: '16px' }}>
            {[
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger-color)" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                ),
                title: 'Weak Hook Structure',
                desc: 'Over 50% of viewers scroll away in the first 3 seconds due to lack of immediate value or intrigue.',
              },
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--warning-color)" strokeWidth="2" strokeLinecap="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                ),
                title: 'Pacing Drops',
                desc: 'Unnecessary pauses, slow transitions, and repetitive language trigger a drop-off in user retention.',
              },
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                ),
                title: 'Tension Decline',
                desc: 'Scripts without structural tension or emotional arcs fail to keep viewers locked until the call to action.',
              },
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success-color)" strokeWidth="2" strokeLinecap="round">
                    <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                ),
                title: 'Unclear Improvement Path',
                desc: 'Scripts often need specific next-step recommendations before the creator can improve the next draft.',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                className="card"
                style={{ padding: '24px' }}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                <div style={{ marginBottom: '16px', width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.icon}
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>{item.title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS TEASER ═══ */}
      <section className="sec" style={{ background: 'var(--bg-primary)' }}>
        <div className="wmd">
          <div className="sec-lbl" style={{ justifyContent: 'center' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', display: 'block' }} />Process
          </div>
          <motion.h2
            className="h2"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            How it works
          </motion.h2>
          <p className="sub" style={{ marginBottom: '48px' }}>From concept script to deep diagnostics in 3 simple steps.</p>
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>
            {[
              { n: '1', title: 'Paste Script or Upload Document', desc: 'Paste your script outline or upload a PDF, DOCX, or TXT file directly.' },
              { n: '2', title: 'Provide Context', desc: 'Add platform, niche, goal, and length so the analysis matches the creator situation.' },
              { n: '3', title: 'Review Creator Intelligence Report', desc: 'Get feedback from Hook, Retention, Script, Emotion, Growth, and Recommendation modules.' },
            ].map((step, i) => (
              <motion.div
                key={i}
                className="step-pill"
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
              >
                <div className="snum">{step.n}</div>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{step.title}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <Link href="/analyze" className="btn bp md-btn">Start Analysis Free →</Link>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES GRID ═══ */}
      <section className="sec-alt">
        <div className="wrap">
          <div className="sec-lbl" style={{ justifyContent: 'center' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', display: 'block' }} />Diagnostics
          </div>
          <motion.h2
            className="h2"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            6 Beta V1 Creator Intelligence modules
          </motion.h2>
          <p className="sub">Every analysis runs across the official Beta V1 engine for script and content diagnostics.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(310px,1fr))', gap: '16px' }}>
            {[
              { title: 'Hook Intelligence', desc: 'Analyzes opening effectiveness, curiosity, clarity, and scroll-stopping potential.', color: 'var(--danger-color)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger-color)" strokeWidth="2" strokeLinecap="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 6v6l4 2"/></svg> },
              { title: 'Retention Intelligence', desc: 'Identifies retention weaknesses and likely audience drop-off causes.', color: 'var(--warning-color)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--warning-color)" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
              { title: 'Script Architecture Analysis', desc: 'Evaluates structure, pacing, clarity, flow, and storytelling.', color: 'var(--accent)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
              { title: 'Emotional Resonance Mapping', desc: 'Maps emotional engagement throughout the content draft.', color: '#f472b6', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f472b6" strokeWidth="2" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
              { title: 'Growth Intelligence', desc: 'Provides creator growth recommendations based on platform, niche, and goal.', color: 'var(--success-color)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success-color)" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg> },
              { title: 'Creator Recommendations', desc: 'Turns the analysis into actionable improvements and optimization suggestions.', color: '#38bdf8', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg> },
            ].map((f, i) => (
              <motion.div
                key={i}
                className="fc"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
              >
                <div className="fi" style={{ background: 'var(--bg-secondary)', width: '38px', height: '38px', borderRadius: 'var(--radius-sm)' }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>{f.title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section style={{ padding: '80px 48px', background: 'var(--bg-primary)', borderTop: '1px solid var(--border-secondary)' }}>
        <div className="wrap">
          <div className="stats-grid">
            {[
              { value: 'Active', label: 'Beta Release', cls: 'gb' },
              { value: '60s', label: 'Average Audit Time', cls: 'gp' },
              { value: '100%', label: 'Theme Compatibility', cls: 'gg' },
              { value: 'Free', label: '3 Audits / Mo', cls: '' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                className="stat-box"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                <p style={{ fontSize: '32px', fontWeight: 800, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  <span className={stat.cls} style={!stat.cls ? { color: 'var(--accent)' } : undefined}>{stat.value}</span>
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-primary)', padding: '90px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div className="wsm" style={{ position: 'relative' }}>
          <div className="sec-lbl" style={{ justifyContent: 'center' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', display: 'block' }} />Get Started
          </div>
          <motion.h2
            className="h2"
            style={{ fontSize: 'clamp(28px,4vw,44px)', marginBottom: '16px' }}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Refine your short-form narrative
          </motion.h2>
          <p className="sub" style={{ marginBottom: '32px' }}>Analyze your first script or document free in under 60 seconds.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' as const, marginBottom: '20px' }}>
            <Link href="/analyze" className="btn bp xl-btn">Start Auditing Free →</Link>
            <Link href="/login" className="btn bg-btn xl-btn">Sign In</Link>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No credit card required · 3 free analyses/month</p>
        </div>
      </section>

      <Footer />
    </>
  );
}
