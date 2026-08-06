'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname() || '';

  // Determine if we should show the conversion pre-footer.
  // We hide it on functional dashboard / login / analyze screens to prevent distraction.
  const isDashboardOrAuth = ['/dashboard', '/history', '/settings', '/billing', '/analyze', '/login', '/signup'].some(
    (p) => pathname.startsWith(p)
  );

  return (
    <footer className="footer" style={{ padding: '80px 24px 48px', borderTop: '1px solid var(--border-secondary)', position: 'relative' }}>
      <div className="wrap" style={{ maxWidth: '1100px', margin: '0 auto' }}>
        
        {/* ========================================== */}
        {/* SECTION 1 & 2 & 3: UPPER PRE-FOOTER        */}
        {/* ========================================== */}
        {!isDashboardOrAuth && (
          <div style={{ marginBottom: '80px' }}>
            {/* Conversion Glass Card */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.015)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '24px',
                padding: '64px 32px',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '24px'
              }}
            >
              {/* Radial Purple Glow Accent */}
              <div
                style={{
                  position: 'absolute',
                  top: '-100px',
                  right: '-100px',
                  width: '300px',
                  height: '300px',
                  background: 'radial-gradient(circle at center, rgba(124, 58, 237, 0.08) 0%, transparent 70%)',
                  pointerEvents: 'none',
                  filter: 'blur(30px)'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '-100px',
                  left: '-100px',
                  width: '300px',
                  height: '300px',
                  background: 'radial-gradient(circle at center, rgba(67, 56, 202, 0.06) 0%, transparent 70%)',
                  pointerEvents: 'none',
                  filter: 'blur(30px)'
                }}
              />

              <div style={{ position: 'relative', zIndex: 1, maxWidth: '640px' }}>
                <h2
                  style={{
                    fontSize: '36px',
                    fontWeight: 800,
                    color: '#fff',
                    letterSpacing: '-.03em',
                    lineHeight: 1.15,
                    marginBottom: '14px'
                  }}
                >
                  Ready to Improve Your Content?
                </h2>
                <p
                  style={{
                    fontSize: '16px',
                    color: 'rgba(255, 255, 255, 0.44)',
                    lineHeight: 1.6,
                    fontWeight: 400
                  }}
                >
                  Get actionable Creator Intelligence feedback on hooks, retention, storytelling and engagement before you publish.
                </p>
              </div>

              <div style={{ position: 'relative', zIndex: 1, marginTop: '8px' }}>
                <Link
                  href="/analyze"
                  className="btn bp"
                  style={{
                    padding: '14px 28px',
                    fontSize: '14px',
                    fontWeight: 700,
                    borderRadius: '100px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 8px 24px -6px rgba(124, 58, 237, 0.35)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Start Free Analysis →
                </Link>
              </div>
            </div>

            {/* Navigation Hub Underneath Card */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '32px',
                marginTop: '40px',
                paddingBottom: '24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
              }}
            >
              <Link href="/features" className="nl" style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.45)' }}>Features</Link>
              <Link href="/how-it-works" className="nl" style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.45)' }}>How It Works</Link>
              <Link href="/pricing" className="nl" style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.45)' }}>Pricing</Link>
              <Link href="/resources" className="nl" style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.45)' }}>Resources</Link>
              <Link href="/about" className="nl" style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.45)' }}>About</Link>
            </div>

            {/* Lightweight Trust Row */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '24px',
                marginTop: '24px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
                <span>🛡️</span> Secure Authentication
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
                <span>🔒</span> Privacy First
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
                <span>🧠</span> Creator Intelligence Platform
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
                <span>🧪</span> Early Access Beta
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* MAIN FOOTER (SEPARATE BELOW)                */}
        {/* ========================================== */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '40px',
            marginBottom: '64px',
            marginTop: isDashboardOrAuth ? '0' : '40px'
          }}
        >
          {/* Brand Identity */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', gridColumn: 'span 2' }}>
            <Link href="/" className="logo">
              <div className="logo-box">
                <svg width="13" height="13" viewBox="0 0 20 20" style={{ marginLeft: '1px' }}>
                  <polygon points="4,2 18,10 4,18" fill="#fff" />
                </svg>
              </div>
              <span
                style={{
                  fontSize: '15px',
                  fontWeight: 800,
                  color: '#fff',
                  letterSpacing: '-.02em'
                }}
              >
                Narratix Lab
              </span>
            </Link>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, maxWidth: '240px' }}>
              Actionable short-form creator intelligence for high-performing content creators.
            </p>
          </div>

          {/* Product Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)' }}>Product</span>
            <Link href="/features" className="nl" style={{ padding: 0, fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>Features</Link>
            <Link href="/pricing" className="nl" style={{ padding: 0, fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>Pricing</Link>
            <Link href="/how-it-works" className="nl" style={{ padding: 0, fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>How It Works</Link>
            <Link href="/resources" className="nl" style={{ padding: 0, fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>Resources</Link>
            <Link href="/about" className="nl" style={{ padding: 0, fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>About</Link>
          </div>

          {/* Resources Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)' }}>Resources</span>
            <Link href="/resources" className="nl" style={{ padding: 0, fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>Blog</Link>
            <Link href="/resources" className="nl" style={{ padding: 0, fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>Guides</Link>
            <Link href="/contact" className="nl" style={{ padding: 0, fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>Support</Link>
          </div>

          {/* Company Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)' }}>Company</span>
            <Link href="/about" className="nl" style={{ padding: 0, fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>About Us</Link>
            <Link href="/about" className="nl" style={{ padding: 0, fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>Careers</Link>
            <Link href="/contact" className="nl" style={{ padding: 0, fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>Contact</Link>
          </div>

          {/* Legal Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)' }}>Legal</span>
            <Link href="/privacy" className="nl" style={{ padding: 0, fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>Privacy Policy</Link>
            <Link href="/terms" className="nl" style={{ padding: 0, fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>Terms of Service</Link>
            <Link href="/privacy" className="nl" style={{ padding: 0, fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>Cookie Policy</Link>
          </div>

          {/* Social Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)' }}>Social</span>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="nl" style={{ padding: 0, fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>Twitter</a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="nl" style={{ padding: 0, fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>YouTube</a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="nl" style={{ padding: 0, fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>LinkedIn</a>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingTop: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>
            © {new Date().getFullYear()} Narratix Lab. All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
            <Link href="/privacy" style={{ color: 'rgba(255,255,255,0.25)' }}>Privacy Policy</Link>
            <Link href="/terms" style={{ color: 'rgba(255,255,255,0.25)' }}>Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
