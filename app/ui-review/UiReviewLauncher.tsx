'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Local review launcher. Everything here is navigation and note-taking —
 * it renders no production UI of its own, and the decision controls are
 * informational only: nothing on this page deploys, approves or changes
 * anything. Notes persist to this browser's localStorage so a review session
 * survives a refresh.
 */

const WIDTHS = [390, 768, 1024, 1440, 1920] as const;

const GROUPS: { label: string; routes: { href: string; label: string; note: string; star?: boolean }[] }[] = [
  {
    label: 'Auth',
    routes: [
      { href: '/login', label: 'Login', note: 'Component 1 — liquid-glass login card', star: true },
      { href: '/signup', label: 'Signup', note: 'Same card material as login' },
    ],
  },
  {
    label: 'Product',
    routes: [
      { href: '/dashboard', label: 'Dashboard', note: 'Component 3 — app shell rail', star: true },
      { href: '/analyze', label: 'Analyze', note: 'App shell rail' },
      { href: '/history', label: 'Reports', note: 'App shell rail' },
      { href: '/billing', label: 'Billing', note: 'App shell rail' },
      { href: '/settings?tab=notifications', label: 'Settings', note: 'Component 4 — tactile toggle', star: true },
      { href: '/settings?tab=mcp', label: 'Settings — MCP', note: 'Model Context Protocol surface — planned connections' },
    ],
  },
  {
    label: 'Commercial',
    routes: [{ href: '/pricing', label: 'Pricing', note: 'Component 2 — plan surfaces', star: true }],
  },
];

const COMPONENTS = [
  { id: 'login', n: 1, name: 'Login Card', route: '/login' },
  { id: 'pricing', n: 2, name: 'Pricing Table', route: '/pricing' },
  { id: 'sidebar', n: 3, name: 'Dashboard Sidebar', route: '/dashboard' },
  { id: 'toggle', n: 4, name: 'Tactile Toggle', route: '/settings?tab=notifications' },
];

const COMPARE = [
  { id: 'login', title: 'Login', img: 'before-login_default_d1440.jpg', mobile: 'before-login_default_m390.jpg', href: '/login' },
  { id: 'pricing', title: 'Pricing', img: 'before-pricing_default_d1440.jpg', mobile: 'before-pricing_default_m390.jpg', href: '/pricing' },
  { id: 'dashboard', title: 'Dashboard', img: 'before-dashboard_d1440.jpg', mobile: 'before-dashboard_m390.jpg', href: '/dashboard' },
  { id: 'settings', title: 'Settings — Notifications', img: 'before-toggle_section_d1440.jpg', mobile: null, href: '/settings?tab=notifications' },
];

const KNOWN_ISSUES = [
  {
    n: 1,
    title: '--nl-* tokens are never defined (UploadPanel)',
    body: 'UploadPanel.tsx uses Tailwind classes bg-nl-panel, border-nl-border, shadow-nl-card, from-nl-primary, to-nl-primaryDark and shadow-nl-glow. tailwind.config.js maps these to var(--nl-*), but no --nl-* property is defined anywhere. The panel renders with no background, border, shadow or button gradient.',
  },
  {
    n: 2,
    title: 'Settings Profile inputs are unlabelled',
    body: 'The "Full Name" and "Display Name" inputs have no id/htmlFor pairing, so their visible labels are not programmatically associated. Outside Component 4, which covered the Notifications toggle only.',
  },
  {
    n: 3,
    title: 'Hard-coded #fff breaks light theme',
    body: 'AccountPages.tsx, DashboardContent.tsx and Footer.tsx use literal white instead of theme tokens. In light theme the footer pre-footer is effectively invisible. Fixed on /pricing only, where Component 2 already rewrote the surface.',
  },
  {
    n: 4,
    title: 'Saved theme preference is stripped on load',
    body:
      'app/layout.tsx injects a boot script that reads narratix_prefs and sets data-theme on <html>. React then removes the attribute during hydration ("Extra attributes from the server: data-theme"), so data-theme is null on every page and the app falls back to the OS colour scheme. The Settings page still applies a theme at runtime, but the choice does not survive a reload or navigation. Found during this review; app/layout.tsx was not modified by this pass.',
  },
];

const STORE_KEY = 'narratix-0.5b-local-review';

type Notes = Record<string, string>;

export default function UiReviewLauncher() {
  const [width, setWidth] = useState<number | null>(null);
  const [notes, setNotes] = useState<Notes>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      setNotes(JSON.parse(localStorage.getItem(STORE_KEY) || '{}'));
    } catch {
      /* first run, or storage unavailable */
    }
  }, []);

  const set = useCallback((key: string, value: string) => {
    setNotes((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(next));
      } catch {
        /* not persisted; the session still works */
      }
      return next;
    });
  }, []);

  const open = useCallback(
    (href: string) => {
      if (width) {
        const h = Math.min(1000, Math.round(window.screen.availHeight * 0.9));
        window.open(href, `nx-${width}`, `width=${width},height=${h},noopener`);
      } else {
        window.open(href, '_blank', 'noopener');
      }
    },
    [width]
  );

  const copy = useCallback(() => {
    const lines = ['NARRATIX LAB — PHASE 0.5B — LOCAL VISUAL REVIEW NOTES', ''];
    COMPONENTS.forEach((c) => {
      lines.push(`${c.name}: ${notes[`d-${c.id}`] || '(no decision)'}`);
      if (notes[`n-${c.id}`]) lines.push(`  notes: ${notes[`n-${c.id}`]}`);
    });
    lines.push('', `OVERALL: ${notes['d-overall'] || '(no decision)'}`);
    if (notes['n-overall']) lines.push('', 'OWNER NOTES:', notes['n-overall']);
    const text = lines.join('\n');
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(done, done);
    } else {
      done();
    }
  }, [notes]);

  return (
    <div className="uir">
      <style>{CSS}</style>

      <header className="uir-hero">
        <span className="uir-eyebrow">Narratix Lab</span>
        <h1>Phase 0.5B — Local Visual Review</h1>
        <p className="uir-lede">
          Every link below opens the <strong>real</strong> application route running on this machine —
          the actual Next.js pages, React components and CSS that would be deployed. Nothing on this
          page is a mock-up or a recreation.
        </p>
        <div className="uir-flags">
          <span className="uir-flag uir-flag-red">DEPLOYMENT: NOT DEPLOYED</span>
          <span className="uir-flag uir-flag-red">BETA V2: NOT STARTED</span>
          <span className="uir-flag uir-flag-amber">LOCALHOST ONLY</span>
          <span className="uir-flag uir-flag-green">LIVE SUPABASE NOT CONTACTED</span>
        </div>
        <p className="uir-devonly">
          This route is development-only. It returns 404 whenever <code>NODE_ENV=production</code>,
          so it cannot be reached on a deployed build.
        </p>
      </header>

      <section className="uir-sec">
        <h2>Components under review</h2>
        <div className="uir-comps">
          {COMPONENTS.map((c) => (
            <button key={c.id} type="button" className="uir-comp" onClick={() => open(c.route)}>
              <span className="uir-check" aria-hidden="true">✓</span>
              <span>
                <b>
                  {c.n}. {c.name}
                </b>
                <small>{c.route}</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="uir-sec">
        <h2>Viewport</h2>
        <p className="uir-hint">
          Pick a width, then open any route — it launches in a window sized to that viewport. Choose{' '}
          <b>Full window</b> to open normally and use DevTools device mode instead. Some browsers clamp
          very small popup widths; if 390 looks wider than expected, use DevTools for that width.
        </p>
        <div className="uir-widths">
          <button
            type="button"
            className={`uir-w${width === null ? ' is-on' : ''}`}
            onClick={() => setWidth(null)}
          >
            Full window
          </button>
          {WIDTHS.map((w) => (
            <button
              key={w}
              type="button"
              className={`uir-w${width === w ? ' is-on' : ''}`}
              onClick={() => setWidth(w)}
            >
              {w}
            </button>
          ))}
        </div>
      </section>

      <section className="uir-sec">
        <h2>Routes</h2>
        {GROUPS.map((g) => (
          <div key={g.label} className="uir-group">
            <h3>{g.label}</h3>
            <div className="uir-routes">
              {g.routes.map((r) => (
                <button
                  key={r.href}
                  type="button"
                  className={`uir-route${r.star ? ' is-key' : ''}`}
                  onClick={() => open(r.href)}
                >
                  <b>
                    {r.label}
                    {r.star && <span className="uir-key" aria-label="Key review route"> ★</span>}
                  </b>
                  <code>{r.href}</code>
                  <small>{r.note}</small>
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="uir-sec">
        <h2>Current version, beside the live route</h2>
        <p className="uir-hint">
          The thumbnails are captures of the <b>current production code</b>. Open the live route beside
          one to compare. The full before/after archive, including every interactive state and all five
          widths, is at <code>Narratix Lab/Phase-0.5B-Visual-Demo/index.html</code>.
        </p>
        <div className="uir-compare">
          {COMPARE.map((c) => (
            <article key={c.id} className="uir-cmp">
              <h3>{c.title}</h3>
              <div className="uir-cmp-body">
                <figure>
                  <span className="uir-tag uir-tag-b">Current</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/ui-review/${c.img}`} alt={`${c.title} — current production`} />
                  <figcaption>1440px</figcaption>
                </figure>
                {c.mobile && (
                  <figure className="uir-cmp-m">
                    <span className="uir-tag uir-tag-b">Current</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/ui-review/${c.mobile}`} alt={`${c.title} — current production, mobile`} />
                    <figcaption>390px</figcaption>
                  </figure>
                )}
              </div>
              <button type="button" className="uir-open" onClick={() => open(c.href)}>
                Open live {c.title} →
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="uir-sec">
        <h2>Signing in locally</h2>
        <div className="uir-auth">
          <p>
            The authenticated routes are protected by the real middleware, so you need a session.
            Open <b>/login</b> and sign in with <b>any</b> email and password — for example{' '}
            <code>demo@narratixlab.test</code> / <code>demo</code>.
          </p>
          <p>
            This works because the local server is pointed at a stand-in auth service running on this
            machine, not at the live Supabase project. <b>No production code implements this.</b> There
            is no bypass flag, no dev branch in the middleware and no weakened check — the application
            performs its normal, unmodified authentication against a different address. Point it back at
            the real URL and production behaviour is exactly what it always was.
          </p>
          <p className="uir-auth-warn">
            Nothing you do here can reach the live project, write to the production database, charge
            Stripe, or send email.
          </p>
        </div>
      </section>

      <section className="uir-sec">
        <h2>Reviewing the themes</h2>
        <div className="uir-auth">
          <p>
            Narratix ships three themes: <b>dark</b> (the default intent), <b>light</b>, and{' '}
            <b>high contrast</b>. To review dark or light, switch your operating system&rsquo;s
            appearance and reload — the app currently follows the OS setting.
          </p>
          <p>
            <b>Why the OS setting, and not the app&rsquo;s own preference:</b> there is a pre-existing
            bug in <code>app/layout.tsx</code> (see known issue 4 below). The boot script writes{' '}
            <code>data-theme</code> onto <code>&lt;html&gt;</code>, then React removes it during
            hydration, so the saved preference does not survive a page load. This is unrelated to the
            four components and was not introduced or fixed by this pass.
          </p>
          <p>
            To force a theme for a single page without changing anything, open the browser console on
            that page and run{' '}
            <code>document.documentElement.setAttribute(&apos;data-theme&apos;,&apos;dark&apos;)</code>{' '}
            — swap in <code>light</code> or <code>high-contrast</code> as needed. That is exactly what
            the Settings page does at runtime.
          </p>
        </div>
      </section>

      <section className="uir-sec">
        <h2>Known issues — outside the four-component scope</h2>
        <div className="uir-issues">
          {KNOWN_ISSUES.map((i) => (
            <article key={i.n} className="uir-issue">
              <h3>
                <span>{i.n}</span>
                {i.title}
              </h3>
              <p>{i.body}</p>
              <span className="uir-tag uir-tag-w">Documented, not fixed</span>
            </article>
          ))}
        </div>
      </section>

      <section className="uir-sec">
        <h2>Owner decision</h2>
        <div className="uir-warn">
          <b>Informational only.</b> These controls record a note for you in this browser. They do not
          approve anything and they cannot deploy anything. Actual approval is given by you in the
          conversation.
        </div>
        <div className="uir-decisions">
          {COMPONENTS.map((c) => (
            <div key={c.id} className="uir-dec">
              <h3>
                {c.n}. {c.name}
              </h3>
              <div className="uir-choices">
                {['KEEP', 'ITERATE'].map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    className={`uir-choice${notes[`d-${c.id}`] === choice ? ' is-on' : ''}`}
                    onClick={() => set(`d-${c.id}`, notes[`d-${c.id}`] === choice ? '' : choice)}
                  >
                    {choice}
                  </button>
                ))}
              </div>
              <label className="uir-note">
                <span>Notes</span>
                <textarea
                  rows={3}
                  value={notes[`n-${c.id}`] || ''}
                  onChange={(e) => set(`n-${c.id}`, e.target.value)}
                  placeholder="What would you change?"
                />
              </label>
            </div>
          ))}
        </div>

        <div className="uir-dec uir-dec-overall">
          <h3>Overall</h3>
          <div className="uir-choices">
            {['APPROVE FOR DEPLOYMENT', 'REQUEST ITERATION'].map((choice) => (
              <button
                key={choice}
                type="button"
                className={`uir-choice uir-choice-lg${notes['d-overall'] === choice ? ' is-on' : ''}`}
                onClick={() => set('d-overall', notes['d-overall'] === choice ? '' : choice)}
              >
                {choice}
              </button>
            ))}
          </div>
          <label className="uir-note">
            <span>Owner notes</span>
            <textarea
              rows={6}
              value={notes['n-overall'] || ''}
              onChange={(e) => set('n-overall', e.target.value)}
              placeholder="Anything that should change before this ships."
            />
          </label>
          <div className="uir-actions">
            <button type="button" className="uir-copy" onClick={copy}>
              Copy notes to clipboard
            </button>
            {copied && <span className="uir-copied">Copied</span>}
          </div>
          <p className="uir-hint" style={{ marginTop: '14px' }}>
            Selecting <b>Approve for deployment</b> here changes nothing. Tell me in the conversation
            when you want it deployed.
          </p>
        </div>
      </section>

      <footer className="uir-foot">
        Local review environment · not deployed · Beta V2 not started · four components under review
      </footer>
    </div>
  );
}

const CSS = `
.uir{max-width:1180px;margin:0 auto;padding:48px 28px 120px;color:var(--text-primary)}
.uir-eyebrow{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-bottom:8px}
.uir h1{font-size:clamp(28px,3.6vw,40px);font-weight:800;letter-spacing:-.03em;line-height:1.12;margin-bottom:14px}
.uir-hero{border:1px solid var(--card-border);background:linear-gradient(160deg,var(--accent-light),transparent 60%),var(--card-bg);border-radius:var(--radius-2xl);padding:40px}
.uir-lede{color:var(--text-secondary);max-width:70ch;font-size:15px;margin-bottom:20px}
.uir-lede strong{color:var(--text-primary)}
.uir-flags{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
.uir-flag{font-size:11px;font-weight:800;letter-spacing:.07em;padding:8px 14px;border-radius:var(--radius-full)}
.uir-flag-red{background:var(--danger-bg);border:1px solid var(--danger-border);color:var(--danger-color)}
.uir-flag-amber{background:var(--warning-bg);border:1px solid var(--warning-border);color:var(--warning-color)}
.uir-flag-green{background:var(--success-bg);border:1px solid var(--success-border);color:var(--success-color)}
.uir-devonly{font-size:12.5px;color:var(--text-muted);margin:0}
.uir code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.86em;background:var(--bg-tertiary);padding:2px 6px;border-radius:5px;color:var(--accent)}
.uir-sec{margin-top:52px}
.uir-sec>h2{font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);padding-bottom:10px;border-bottom:1px solid var(--border-primary);margin-bottom:18px}
.uir-hint{color:var(--text-secondary);font-size:13.5px;max-width:95ch;margin-bottom:16px}
.uir-comps{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px}
.uir-comp{display:flex;align-items:center;gap:12px;text-align:left;background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius-lg);padding:16px;color:var(--text-primary);font-family:inherit;transition:all var(--duration-fast)}
.uir-comp:hover{border-color:var(--accent-border);background:var(--card-hover-bg)}
.uir-check{width:26px;height:26px;flex:none;border-radius:50%;background:var(--success-bg);border:1px solid var(--success-border);color:var(--success-color);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px}
.uir-comp b{display:block;font-size:14px;font-weight:700}
.uir-comp small{display:block;font-size:12px;color:var(--text-muted);margin-top:2px}
.uir-widths{display:flex;flex-wrap:wrap;gap:8px}
.uir-w{background:var(--bg-secondary);border:1px solid var(--border-primary);color:var(--text-secondary);font-family:inherit;font-size:13px;font-weight:700;padding:10px 18px;border-radius:var(--radius-full);transition:all var(--duration-fast)}
.uir-w:hover{color:var(--text-primary)}
.uir-w.is-on{background:var(--accent);border-color:var(--accent);color:#fff}
.uir-group{margin-bottom:24px}
.uir-group h3{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px}
.uir-routes{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}
.uir-route{text-align:left;background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius-lg);padding:15px;color:var(--text-primary);font-family:inherit;transition:all var(--duration-fast)}
.uir-route:hover{border-color:var(--accent-border);background:var(--card-hover-bg);transform:translateY(-2px)}
.uir-route.is-key{border-color:var(--accent-border);background:var(--accent-light)}
.uir-route b{display:block;font-size:15px;font-weight:700;margin-bottom:5px}
.uir-key{color:var(--accent)}
.uir-route code{display:inline-block;margin-bottom:6px;font-size:11.5px}
.uir-route small{display:block;font-size:12px;color:var(--text-muted);line-height:1.45}
.uir-compare{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px;align-items:start}
.uir-cmp{background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius-lg);padding:16px;display:flex;flex-direction:column}
.uir-cmp h3{font-size:15px;font-weight:700;margin-bottom:12px}
.uir-cmp-body{display:flex;gap:10px;align-items:flex-start;margin-bottom:14px}
.uir-cmp figure{margin:0;flex:1;min-width:0}
.uir-cmp-m{width:92px;flex:none!important}
/* Full-page captures are very tall; crop them to a consistent thumbnail so the
   cards keep an even height. Click through to the archive for the full image. */
.uir-cmp img{width:100%;display:block;border-radius:var(--radius-sm);border:1px solid var(--border-secondary);background:#000;object-fit:cover;object-position:top center}
.uir-cmp figure:not(.uir-cmp-m) img{aspect-ratio:16/10}
.uir-cmp-m img{aspect-ratio:9/16}
.uir-cmp .uir-open{margin-top:auto}
.uir-cmp figcaption{font-size:11px;color:var(--text-muted);text-align:center;margin-top:6px;font-weight:600}
.uir-tag{display:inline-block;margin-bottom:6px;font-size:9.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:3px 8px;border-radius:var(--radius-full);background:var(--bg-tertiary);color:var(--text-muted)}
.uir-tag-w{background:var(--warning-bg);border:1px solid var(--warning-border);color:var(--warning-color);margin:0}
.uir-open{width:100%;background:var(--accent);border:none;color:#fff;font-family:inherit;font-weight:700;font-size:13px;padding:11px;border-radius:var(--radius-md);transition:background var(--duration-fast)}
.uir-open:hover{background:var(--accent-hover)}
.uir-auth{background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius-lg);padding:22px}
.uir-auth p{color:var(--text-secondary);font-size:14px;margin-bottom:12px;max-width:95ch}
.uir-auth b{color:var(--text-primary)}
.uir-auth-warn{color:var(--success-color)!important;font-weight:600;margin-bottom:0!important}
.uir-issues{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px}
.uir-issue{background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius-lg);padding:18px}
.uir-issue h3{display:flex;align-items:center;gap:10px;font-size:14px;font-weight:700;margin-bottom:8px;line-height:1.35}
.uir-issue h3 span{width:22px;height:22px;flex:none;border-radius:50%;background:var(--warning-bg);border:1px solid var(--warning-border);color:var(--warning-color);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800}
.uir-issue p{font-size:13px;color:var(--text-secondary);margin-bottom:10px;line-height:1.55}
.uir-warn{background:var(--warning-bg);border:1px solid var(--warning-border);border-radius:var(--radius-lg);padding:16px 20px;font-size:13.5px;color:var(--text-secondary);margin-bottom:18px}
.uir-warn b{display:block;color:var(--warning-color);margin-bottom:4px}
.uir-decisions{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:14px;margin-bottom:16px}
.uir-dec{background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius-lg);padding:18px}
.uir-dec h3{font-size:14px;font-weight:700;margin-bottom:12px}
.uir-choices{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.uir-choice{flex:1;min-width:90px;background:var(--bg-secondary);border:1px solid var(--border-primary);color:var(--text-secondary);font-family:inherit;font-size:12px;font-weight:800;letter-spacing:.05em;padding:10px;border-radius:var(--radius-md);transition:all var(--duration-fast)}
.uir-choice:hover{color:var(--text-primary)}
.uir-choice.is-on{background:var(--accent);border-color:var(--accent);color:#fff}
.uir-choice-lg{padding:14px 20px;font-size:13px}
.uir-note{display:block}
.uir-note span{display:block;font-size:10.5px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px}
.uir-note textarea{width:100%;background:var(--input-bg);border:1px solid var(--input-border);border-radius:var(--radius-md);color:var(--text-primary);font-family:inherit;font-size:13.5px;padding:11px;resize:vertical}
.uir-note textarea:focus{outline:2px solid var(--accent);outline-offset:1px}
.uir-actions{display:flex;align-items:center;gap:12px;margin-top:14px;flex-wrap:wrap}
.uir-copy{background:var(--bg-secondary);border:1px solid var(--border-primary);color:var(--text-primary);font-family:inherit;font-weight:700;font-size:13px;padding:10px 18px;border-radius:var(--radius-md)}
.uir-copied{color:var(--success-color);font-size:12.5px;font-weight:700}
.uir-foot{margin-top:64px;padding-top:22px;border-top:1px solid var(--border-secondary);color:var(--text-muted);font-size:12.5px}
`;
