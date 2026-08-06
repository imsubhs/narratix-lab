export const metadata = {
  title: 'Privacy Policy — Narratix Lab',
  description: 'Learn how Narratix Lab Beta collects, uses, and secures your personal information.',
};

export default function PrivacyPage() {
  return (
    <div style={{ padding: '110px 24px 80px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="sec-lbl" style={{ marginBottom: '14px' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a78bfa', display: 'block' }} />
        Legal
      </div>
      <h1 style={{ fontSize: 'clamp(32px,4vw,46px)', fontWeight: 800, color: '#fff', letterSpacing: '-.04em', marginBottom: '24px' }}>
        Privacy Policy
      </h1>
      <p style={{ fontSize: '14px', color: 'rgba(255,255,255,.4)', marginBottom: '40px' }}>
        Last updated: May 30, 2026
      </p>

      <div className="stg-card" style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <section>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>1. Information We Collect</h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,.7)', lineHeight: '1.75' }}>
            We collect information you provide directly to us when creating an account, running content analyses, or contacting support.
          </p>
          <ul style={{ fontSize: '15px', color: 'rgba(255,255,255,.7)', lineHeight: '1.75', marginTop: '12px', paddingLeft: '20px', listStyleType: 'disc' }}>
            <li style={{ marginBottom: '8px' }}><strong>Account Data:</strong> Email addresses and passwords created during email/password registration.</li>
            <li style={{ marginBottom: '8px' }}><strong>OAuth Data:</strong> Display name, profile image URL, and email address retrieved from Google OAuth.</li>
            <li style={{ marginBottom: '8px' }}><strong>User Content:</strong> Text scripts, content descriptions, outlines, and content context parameters (niche, platform, goals) submitted to our analyzer.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>2. Data Storage & Hosting</h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,.7)', lineHeight: '1.75' }}>
            Our user database, authentication records, and analysis history are securely managed and stored on Supabase, built on top of secure Amazon Web Services (AWS) infrastructure. Your credentials are fully encrypted at rest and in transit.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>3. How We Use Data</h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,.7)', lineHeight: '1.75' }}>
            We process your information to provide the NAX Creator Intelligence modules in real-time, generate diagnostic reports, manage your subscription limits, and authenticate your sessions. We do not sell your personal data.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>4. Analytics & Cookies</h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,.7)', lineHeight: '1.75' }}>
            We use functional cookies to handle active login sessions, verify CSRF tokens, and secure token exchange callbacks. We may use anonymized analytics tools to monitor system uptime and loading speed.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>5. Security Measures</h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,.7)', lineHeight: '1.75' }}>
            We implement industry-standard security protocols, including Row-Level Security (RLS) policies on database tables to guarantee that only you can view your analysis history, and secure HTTPS protocol for all client-server communications.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>6. User Rights & Data Deletion</h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,.7)', lineHeight: '1.75' }}>
            You have the right to request deletion of all your personal data, including your user profile, billing records, and analysis history. You can execute account deletion instantly inside the settings panel under the &quot;Danger Zone&quot; section, or request manual data removal by contacting us.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>7. Contact Us</h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,.7)', lineHeight: '1.75' }}>
            For privacy inquiries or compliance questions, please contact us at: <a href="mailto:support@narratixlab.co" style={{ color: '#a78bfa', textDecoration: 'none' }}>support@narratixlab.co</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
