import Link from 'next/link';

export const metadata = {
  title: 'Pricing — Narratix Lab',
  description: 'Simple, honest pricing. Start free during our early beta launch.',
};

/**
 * Plan data — names, prices and feature strings are unchanged from Beta V1.
 * `available` drives presentation only; it introduces no billing behaviour.
 */
const PLANS = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Perfect for creators getting started',
    price: '$0',
    period: '/mo',
    note: 'Forever free during Beta',
    available: true,
    badge: 'Available now',
    featuresLabel: null,
    features: [
      '3 analyses per month',
      'PDF uploads',
      'DOCX uploads',
      'TXT uploads',
      '6 Creator Intelligence Modules',
      'Report History',
      'Demo AI Analysis',
      'Professional Report Export',
      'Interactive Dashboard',
      'Community Support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For serious creators',
    price: '$10',
    period: '/mo',
    note: 'Available after Beta launch',
    available: false,
    badge: 'Coming soon',
    featuresLabel: 'Everything in Free, plus',
    features: [
      'Unlimited analyses',
      'Live AI Analysis',
      'Priority AI Queue',
      'Faster processing',
      'Higher AI limits',
      'Advanced recommendations',
      'Report comparison',
      'Early access features',
      'Custom branding',
    ],
  },
  {
    id: 'team',
    name: 'Team',
    tagline: 'For agencies and creator teams',
    price: '$15',
    period: '/mo',
    note: 'Available after Beta launch',
    available: false,
    badge: 'Coming soon',
    featuresLabel: 'Everything in Pro, plus',
    features: [
      'Multi-user workspace',
      'Shared reports',
      'Team analytics',
      'Client folders',
      'Role permissions',
      'Collaboration comments',
      'Organization dashboard',
      'Team billing',
    ],
  },
] as const;

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
          border: '1px solid var(--accent-border)',
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
            verticalAlign: 'middle',
          }}>
            Narratix Lab Beta V1
          </span>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'inline-block', verticalAlign: 'middle', fontWeight: 500 }}>
            Early Access Beta: All script and document analysis modules are free to use.
          </span>
        </div>

        {/* Pricing Cards Grid */}
        <div className="pricing-grid">
          {PLANS.map((plan) => (
            <article
              key={plan.id}
              className={`pc ${plan.available ? 'pc-lead' : 'pc-upcoming'}`}
              aria-labelledby={`plan-${plan.id}-name`}
            >
              <span className={`plan-badge${plan.available ? ' plan-badge-lead' : ''}`}>{plan.badge}</span>

              <div className="plan-head">
                <h2 className="plan-name" id={`plan-${plan.id}-name`}>{plan.name}</h2>
                <p className="plan-tagline">{plan.tagline}</p>
                <p className="plan-price">
                  <strong>{plan.price}</strong>
                  <span>{plan.period}</span>
                </p>
                <p className="plan-note">{plan.note}</p>
              </div>

              {plan.featuresLabel && <p className="plan-feats-label">{plan.featuresLabel}</p>}
              <ul className="plan-feats" aria-label={`${plan.name} plan features`}>
                {plan.features.map((feature) => (
                  <li key={feature} className="pck">
                    <span className="pck-mark" aria-hidden="true">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.available ? (
                <Link href="/analyze" className="btn bp plan-cta">
                  Start Free
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    aria-describedby={`plan-${plan.id}-cta-note`}
                    className="btn bo plan-cta"
                  >
                    Coming Soon
                  </button>
                  <p className="plan-cta-note" id={`plan-${plan.id}-cta-note`}>Available After Beta Launch</p>
                </>
              )}
            </article>
          ))}
        </div>

        <div style={{
          marginTop: '48px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--card-border)',
          borderRadius: '18px',
          padding: '32px',
          textAlign: 'center',
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '10px' }}>🎁 Early Access Beta Phase</h2>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '22px', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>All public Creator Intelligence features are completely free during our Beta V1 stage.</p>
          <Link href="/analyze" className="btn bg-btn lg-btn">Start Free Analysis →</Link>
        </div>
      </div>
    </div>
  );
}
