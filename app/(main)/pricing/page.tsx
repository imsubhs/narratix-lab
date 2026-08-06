import Link from 'next/link';

export const metadata = {
  title: 'Pricing — Narratix Lab',
  description: 'Simple, honest pricing. Start free during our early beta launch.',
};

export default function PricingPage() {
  return (
    <div style={{ padding: '110px 48px 80px' }}>
      <div className="wsm" style={{ maxWidth: '1150px', margin: '0 auto' }}>
        
        {/* Section Header */}
        <div className="sec-lbl" style={{ justifyContent: 'center', marginBottom: '14px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a78bfa', display: 'block' }} />
          Pricing Plans
        </div>
        <h1 className="h2" style={{ fontSize: 'clamp(36px,4.5vw,52px)', marginBottom: '12px', textAlign: 'center' }}>Scale Your Content Engine</h1>
        <p className="sub" style={{ marginBottom: '40px', textAlign: 'center' }}>Choose the intelligence layer that matches your creator goals.</p>

        {/* Beta Offer Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(79, 70, 229, 0.1))',
          border: '1px solid rgba(124, 58, 237, 0.25)',
          borderRadius: '16px',
          padding: '16px 24px',
          marginBottom: '48px',
          textAlign: 'center',
        }}>
          <span style={{
            background: 'var(--accent)',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: '100px',
            marginRight: '12px',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            display: 'inline-block',
            verticalAlign: 'middle'
          }}>
            Narratix Lab Beta V1
          </span>
          <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.85)', display: 'inline-block', verticalAlign: 'middle', fontWeight: 500 }}>
            Early Access Beta: All script and document analysis modules are free to use.
          </span>
        </div>

        {/* Pricing Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'stretch' }}>
          
          {/* Free */}
          <div className="pc pc-free" style={{ display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ marginBottom: 'auto' }}>
              <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', textAlign: 'center', marginBottom: '5px' }}>Free</h3>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.32)', textAlign: 'center', marginBottom: '22px' }}>Perfect for creators getting started</p>
              <p style={{ fontSize: '42px', fontWeight: 800, color: '#fff', textAlign: 'center', marginBottom: '4px' }}>$0<span style={{ fontSize: '15px', color: 'rgba(255,255,255,.26)', fontWeight: 400 }}>/mo</span></p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.28)', textAlign: 'center', marginBottom: '26px' }}>Forever free during Beta</p>
              
              <div style={{ borderTop: '1px solid rgba(255,255,255,.07)', paddingTop: '20px', marginBottom: '26px' }}>
                {[
                  '3 analyses per month',
                  'PDF uploads',
                  'DOCX uploads',
                  'TXT uploads',
                  '6 Creator Intelligence Modules',
                  'Report History',
                  'Demo AI Analysis',
                  'Professional Report Export',
                  'Interactive Dashboard',
                  'Community Support'
                ].map((f, i) => (
                  <div key={i} className="pck"><span style={{ color: '#a78bfa' }}>✓</span>{f}</div>
                ))}
              </div>
            </div>
            <Link href="/analyze" className="btn bo full" style={{ padding: '14px', textAlign: 'center' }}>Start Free</Link>
          </div>

          {/* Pro */}
          <div className="pc pc-pro" style={{ display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid rgba(255, 255, 255, 0.05)', opacity: 0.8 }}>
            <div style={{ textAlign: 'center', marginBottom: '16px', paddingTop: '6px' }}>
              <span style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '100px', padding: '4px 14px', fontSize: '11px', fontWeight: 800, letterSpacing: '.06em' }}>COMING SOON</span>
            </div>
            <div style={{ marginBottom: 'auto' }}>
              <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: '5px' }}>Pro</h3>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.24)', textAlign: 'center', marginBottom: '22px' }}>For serious creators</p>
              <p style={{ fontSize: '42px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: '4px' }}>$10<span style={{ fontSize: '15px', color: 'rgba(255,255,255,.15)', fontWeight: 400 }}>/mo</span></p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginBottom: '26px' }}>Available after Beta launch</p>

              <div style={{ borderTop: '1px solid rgba(255,255,255,.07)', paddingTop: '20px', marginBottom: '26px' }}>
                <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: '12px' }}>Everything in Free, plus</p>
                {[
                  'Unlimited analyses',
                  'Live AI Analysis',
                  'Priority AI Queue',
                  'Faster processing',
                  'Higher AI limits',
                  'Advanced recommendations',
                  'Report comparison',
                  'Early access features',
                  'Custom branding'
                ].map((f, i) => (
                  <div key={i} className="pck" style={{ opacity: 0.6 }}><span style={{ color: 'rgba(255,255,255,0.3)' }}>✓</span>{f}</div>
                ))}
              </div>
            </div>
            <button disabled className="btn bo full" style={{ padding: '14px', width: '100%', opacity: 0.5, cursor: 'not-allowed' }}>
              Coming Soon
            </button>
            <p style={{ fontSize: '11.5px', color: 'rgba(255,255,255,.25)', textAlign: 'center', marginTop: '8px', marginBottom: 0 }}>Available After Beta Launch</p>
          </div>

          {/* Team */}
          <div className="pc pc-free" style={{ display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid rgba(255,255,255,0.05)', opacity: 0.7 }}>
            <div style={{ textAlign: 'center', marginBottom: '16px', paddingTop: '6px' }}>
              <span style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '100px', padding: '4px 14px', fontSize: '11px', fontWeight: 800, letterSpacing: '.06em' }}>COMING SOON</span>
            </div>
            <div style={{ marginBottom: 'auto' }}>
              <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: '5px' }}>Team</h3>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.24)', textAlign: 'center', marginBottom: '22px' }}>For agencies and creator teams</p>
              <p style={{ fontSize: '42px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: '4px' }}>$15<span style={{ fontSize: '15px', color: 'rgba(255,255,255,.15)', fontWeight: 400 }}>/mo</span></p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginBottom: '26px' }}>Available after Beta launch</p>

              <div style={{ borderTop: '1px solid rgba(255,255,255,.07)', paddingTop: '20px', marginBottom: '26px' }}>
                <p style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: '12px' }}>Everything in Pro, plus</p>
                {[
                  'Multi-user workspace',
                  'Shared reports',
                  'Team analytics',
                  'Client folders',
                  'Role permissions',
                  'Collaboration comments',
                  'Organization dashboard',
                  'Team billing'
                ].map((f, i) => (
                  <div key={i} className="pck" style={{ opacity: 0.4 }}><span style={{ color: 'rgba(255,255,255,0.2)' }}>✓</span>{f}</div>
                ))}
              </div>
            </div>
            <button disabled className="btn bo full" style={{ padding: '14px', width: '100%', opacity: 0.5, cursor: 'not-allowed' }}>
              Coming Soon
            </button>
            <p style={{ fontSize: '11.5px', color: 'rgba(255,255,255,.25)', textAlign: 'center', marginTop: '8px', marginBottom: 0 }}>Available After Beta Launch</p>
          </div>
        </div>

        <div style={{ marginTop: '48px', background: 'rgba(255,255,255,.034)', border: '1px solid rgba(255,255,255,.07)', borderRadius: '18px', padding: '32px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>🎁 Early Access Beta Phase</h3>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,.48)', marginBottom: '22px', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>All public Creator Intelligence features are completely free during our Beta V1 stage.</p>
          <Link href="/analyze" className="btn bp lg-btn">Start Free Analysis →</Link>
        </div>
      </div>
    </div>
  );
}
