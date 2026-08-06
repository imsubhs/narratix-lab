export const metadata = {
  title: 'Terms of Service — Narratix Lab',
  description: 'Understand the acceptable use, disclaimer, and terms governing Narratix Lab Beta.',
};

export default function TermsPage() {
  return (
    <div style={{ padding: '110px 24px 80px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="sec-lbl" style={{ marginBottom: '14px' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a78bfa', display: 'block' }} />
        Legal
      </div>
      <h1 style={{ fontSize: 'clamp(32px,4vw,46px)', fontWeight: 800, color: '#fff', letterSpacing: '-.04em', marginBottom: '24px' }}>
        Terms of Service
      </h1>
      <p style={{ fontSize: '14px', color: 'rgba(255,255,255,.4)', marginBottom: '40px' }}>
        Last updated: May 30, 2026
      </p>

      <div className="stg-card" style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <section>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>1. Terms Acceptance</h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,.7)', lineHeight: '1.75' }}>
            By registering for an account or using the NAX Creator Intelligence services on Narratix Lab Beta, you agree to comply with and be bound by these Terms of Service. If you do not agree, please do not use our services.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>2. Creator Intelligence Analysis & Diagnostics Disclaimer</h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,.7)', lineHeight: '1.75' }}>
            Narratix Lab provides script diagnostics and retention forecasts using advanced Creator Intelligence reasoning modules.
          </p>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,.7)', lineHeight: '1.75', marginTop: '12px' }}>
            <strong>DISCLAIMER:</strong> Creator Intelligence evaluations, hook score assessments, and drop-point predictions are analytical estimations only. We make no guarantees regarding actual content performance, algorithms, view counts, or virality. These suggestions should be implemented at your own discretion.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>3. Acceptable Use</h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,.7)', lineHeight: '1.75' }}>
            You agree not to use the service to generate abusive, illegal, violent, harassing, or spam content. We reserve the right to audit inputs and suspend accounts violating acceptable use policies.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>4. Intellectual Property</h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,.7)', lineHeight: '1.75' }}>
            You retain 100% ownership and copyright of the scripts and concepts you paste into the analyzer. Narratix Lab does not claim any rights to your content. Our analyzer interface, scoring algorithms, design, and software constitute Narratix Lab intellectual property.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>5. Service Availability & Account Suspension</h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,.7)', lineHeight: '1.75' }}>
            Narratix Lab Beta is an experimental release. We reserve the right to limit access, restrict API keys, modify features, or suspend accounts for usage abuse, billing issues, or security concerns without prior notice.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>6. Future Subscription Terms</h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,.7)', lineHeight: '1.75' }}>
            Accounts under the Free beta tier receive limited credits. Narratix Lab Pro is a paid subscription plan. We reserve the right to modify subscription prices, pricing plans, and limits. Continued use after pricing changes indicates acceptance of new rates.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>7. Limitation of Liability</h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,.7)', lineHeight: '1.75' }}>
            Narratix Lab, its team, and its providers shall not be held liable for any direct, indirect, special, incidental, or consequential damages resulting from your use of Creator Intelligence analysis reports, content posting decisions, or service interruptions.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>8. Governing Law</h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,.7)', lineHeight: '1.75' }}>
            These terms are governed by and construed in accordance with the laws applicable to modern online service providers, without regard to conflict of law principles.
          </p>
        </section>
      </div>
    </div>
  );
}
