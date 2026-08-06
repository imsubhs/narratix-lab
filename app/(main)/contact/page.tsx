'use client';

import { useState } from 'react';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('support');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;
    setIsSubmitting(true);
    // Simulate API request
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setName('');
      setEmail('');
      setMessage('');
    }, 1200);
  };

  return (
    <div style={{ padding: '110px 24px 80px', maxWidth: '900px', margin: '0 auto' }}>
      <div className="sec-lbl" style={{ marginBottom: '14px' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a78bfa', display: 'block' }} />
        Support
      </div>
      <h1 style={{ fontSize: 'clamp(36px,4.5vw,54px)', fontWeight: 800, color: '#fff', letterSpacing: '-.04em', marginBottom: '16px' }}>
        Get in Touch
      </h1>
      <p style={{ fontSize: '16px', color: 'rgba(255,255,255,.42)', lineHeight: 1.85, maxWidth: '560px', marginBottom: '60px' }}>
        Have questions about the beta, feature requests, or bugs to report? Contact our team below.
      </p>

      <div className="contact-grid">
        {/* Contact Info Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="stg-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(124,58,237,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>✉️</div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', margin: 0 }}>Support Email</h3>
            </div>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,.5)', lineHeight: 1.6, margin: '0 0 12px 0' }}>
              Get help with your account, billing, or subscription limits.
            </p>
            <a href="mailto:support@narratixlab.co" style={{ fontSize: '14px', color: '#a78bfa', fontWeight: 700, textDecoration: 'none' }}>support@narratixlab.co</a>
          </div>

          <div className="stg-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(59,130,246,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>💡</div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', margin: 0 }}>Feature Requests</h3>
            </div>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,.5)', lineHeight: 1.6, margin: 0 }}>
              Suggest new analytics modules, platform integrations, or dashboard improvements.
            </p>
          </div>

          <div className="stg-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(239,68,68,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🐛</div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', margin: 0 }}>Bug Reporting</h3>
            </div>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,.5)', lineHeight: 1.6, margin: 0 }}>
              Report playback glitches, API connection errors, or visual bugs in the beta interface.
            </p>
          </div>
        </div>

        {/* Contact Form */}
        <div className="stg-card" style={{ padding: '32px' }}>
          {isSubmitted ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(52,211,153,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '24px', color: '#34d399' }}>✓</div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>Message Sent</h3>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,.45)', lineHeight: 1.6, marginBottom: '24px' }}>
                Thank you for contacting us! Our team will review your inquiry and get back to you shortly.
              </p>
              <button className="btn bg-btn sm" onClick={() => setIsSubmitted(false)}>Send Another Message</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label className="flbl">YOUR NAME *</label>
                <input className="finput" required type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
              </div>
              <div>
                <label className="flbl">EMAIL ADDRESS *</label>
                <input className="finput" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" />
              </div>
              <div>
                <label className="flbl">TOPIC *</label>
                <select className="finput" value={topic} onChange={(e) => setTopic(e.target.value)}>
                  <option value="support">General Inquiries / Support</option>
                  <option value="feature">Feature Requests</option>
                  <option value="bug">Bug Reporting</option>
                </select>
              </div>
              <div>
                <label className="flbl">MESSAGE *</label>
                <textarea className="finput" required rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="How can we help you?" style={{ resize: 'vertical', minHeight: '120px' }} />
              </div>
              <button className="btn bp md-btn" type="submit" disabled={isSubmitting} style={{ marginTop: '10px' }}>
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
