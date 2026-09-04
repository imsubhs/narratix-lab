/**
 * LOCAL-ONLY stand-in for Supabase — Narratix Lab Phase 0.5B visual review.
 *
 * Nothing in the application imports, references or is aware of this file. It is
 * a separate process, outside `app/`, that `next build` never compiles. It is
 * reached only because the local dev server is started with
 * NEXT_PUBLIC_SUPABASE_URL pointed at the local front door instead of the real
 * project — see local-review/start.js. There is no bypass flag, no dev branch in
 * the middleware and no weakened check anywhere in the repository.
 *
 * It writes nothing anywhere and never contacts the live Supabase project.
 * Binds to 127.0.0.1 only.
 */
const http = require('http');
const path = require('path');

const PORT = Number(process.env.MOCK_PORT || 54999);

const USER_ID = '2f1c9a44-7b30-4d1e-9f22-6a8c0e3d5b71';
const EMAIL = 'demo@narratixlab.test';
const REPORT_ID = '9c4f1e28-3d57-4a6b-8e10-52b7cf0a91d3';

const USER = {
  id: USER_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: EMAIL,
  email_confirmed_at: '2026-01-04T10:00:00Z',
  phone: '',
  confirmed_at: '2026-01-04T10:00:00Z',
  last_sign_in_at: '2026-09-03T12:00:00Z',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { full_name: 'Subham Saha' },
  identities: [],
  created_at: '2026-01-04T10:00:00Z',
  updated_at: '2026-09-03T12:00:00Z',
  is_anonymous: false,
};

const PROFILE = {
  id: USER_ID,
  email: EMAIL,
  full_name: 'Subham Saha',
  display_name: 'Subham',
  avatar_url: null,
  plan: 'free',
  usage_count: 2,
  created_at: '2026-01-04T10:00:00Z',
  updated_at: '2026-09-03T12:00:00Z',
};

/**
 * The report row reuses the application's own curated demo profile
 * (lib/ai/demo-profiles/*.json — the existing DEMO_MODE data), so the report
 * surfaces render real content. No production data is read or written.
 */
function demoResults() {
  try {
    return require(path.join(__dirname, '..', 'lib', 'ai', 'demo-profiles', 'tutorial.json'));
  } catch {
    return null;
  }
}

const ANALYSES = [
  {
    id: REPORT_ID,
    user_id: USER_ID,
    video_url: null,
    video_name: 'Local review sample script',
    niche: 'education',
    platform: 'tiktok',
    video_length: 60,
    goal: 'growth',
    concern: 'retention',
    overall_score: 78,
    overall_verdict: 'Strong',
    results: demoResults(),
    transcript:
      'Most people waste their entire twenties being broke for no reason. ' +
      'I made every money mistake you can think of by the time I was 25. ' +
      'Here is the one system that finally fixed it.',
    created_at: '2026-09-01T09:30:00Z',
  },
];

const TABLES = { profiles: [PROFILE], analyses: ANALYSES };

function session() {
  return {
    access_token: 'mock-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'mock-refresh-token',
    user: USER,
  };
}

/** Minimal PostgREST filter support: `col=eq.value` / `col=in.(a,b)`. */
function applyFilters(rows, url) {
  const reserved = new Set(['select', 'order', 'limit', 'offset', 'apikey']);
  let out = rows;
  for (const [key, raw] of url.searchParams.entries()) {
    if (reserved.has(key)) continue;
    const [op, ...rest] = raw.split('.');
    const value = rest.join('.');
    if (op === 'eq') out = out.filter((r) => String(r[key]) === value);
    else if (op === 'in') {
      const set = new Set(value.replace(/^\(|\)$/g, '').split(',').map((v) => v.replace(/^"|"$/g, '')));
      out = out.filter((r) => set.has(String(r[key])));
    }
  }
  return out;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const p = url.pathname;

  const send = (code, body, extraHeaders) => {
    const payload = body === undefined ? '' : JSON.stringify(body);
    res.writeHead(code, {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': '*',
      'access-control-expose-headers': '*',
      ...(extraHeaders || {}),
    });
    res.end(payload);
  };

  const redirect = (location) => {
    res.writeHead(302, { location, 'access-control-allow-origin': '*' });
    res.end();
  };

  if (req.method === 'OPTIONS') return send(200, {});

  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    console.log(`[mock] ${req.method} ${req.url}`);

    // ─── Auth ────────────────────────────────────────────────────────────
    // Every grant type (password, pkce, refresh_token) yields the same local
    // session. This is what makes demo@narratixlab.test / demo work, and what
    // makes the OAuth button resolve locally instead of dead-ending on `{}`.
    if (p === '/auth/v1/token') return send(200, session());
    if (p === '/auth/v1/user') return send(200, USER);
    if (p === '/auth/v1/settings') return send(200, { external: { google: true }, disable_signup: false });
    if (p === '/auth/v1/logout') return send(204);

    // OAuth start. The real service redirects the browser to the provider and
    // eventually back to redirect_to with a code. The stand-in short-circuits
    // straight to that final hop so the local review never leaves this machine.
    if (p === '/auth/v1/authorize') {
      const target = url.searchParams.get('redirect_to');
      if (!target || !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(target)) {
        return send(400, { error: 'local stand-in: redirect_to must be a localhost URL' });
      }
      const dest = new URL(target);
      dest.searchParams.set('code', 'mock-auth-code');
      return redirect(dest.toString());
    }

    if (p.startsWith('/auth/v1/')) return send(200, {});

    // ─── PostgREST ───────────────────────────────────────────────────────
    if (p.startsWith('/rest/v1/')) {
      const table = p.slice('/rest/v1/'.length);
      const rows = TABLES[table] || [];
      if (req.method === 'DELETE' || req.method === 'PATCH' || req.method === 'POST') {
        // Read-only stand-in: acknowledge without mutating anything.
        return send(200, []);
      }
      const filtered = applyFilters(rows, url);
      const wantsSingle = String(req.headers.accept || '').includes('vnd.pgrst.object');
      if (wantsSingle) {
        if (filtered.length === 0) return send(406, null);
        return send(200, filtered[0]);
      }
      return send(200, filtered);
    }

    return send(200, {});
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[mock] local auth/data stand-in on 127.0.0.1:${PORT}`);
  console.log(`[mock] demo report id: ${REPORT_ID}`);
});
