/**
 * LOCAL-ONLY launcher for the Phase 0.5B visual review.
 *
 *   npm run review        →  http://localhost:3000/ui-review
 *
 * Starts three processes bound to 127.0.0.1:
 *   :54999  local auth/data stand-in   (local-review/mock-supabase.js)
 *   :3001   the real, unmodified Next.js dev server
 *   :3000   front door proxy           (local-review/review-server.js)
 *
 * The ONLY thing that differs from a normal `npm run dev` is the value of
 * NEXT_PUBLIC_SUPABASE_URL, which is pointed at the front door instead of the
 * live project. The application code is byte-identical and performs its normal
 * authentication. Refuses to run when NODE_ENV=production.
 */
const { spawn } = require('child_process');
const path = require('path');

if (process.env.NODE_ENV === 'production') {
  console.error('[review] refusing to start: this is a development-only tool.');
  process.exit(1);
}

const APP = path.join(__dirname, '..');
const ORIGIN = 'http://localhost:3000';

const env = {
  ...process.env,
  NODE_ENV: 'development',
  // Local front door — NOT the production project. Nothing here reaches Supabase.
  NEXT_PUBLIC_SUPABASE_URL: ORIGIN,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'local-review-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'local-review-service-key',
  NEXT_PUBLIC_APP_URL: ORIGIN,
  DEMO_MODE: 'true',
};

const children = [];
function run(label, cmd, args, cwd) {
  const child = spawn(cmd, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
  const tag = (line) => line && console.log(`[${label}] ${line}`);
  child.stdout.on('data', (d) => String(d).trimEnd().split('\n').forEach(tag));
  child.stderr.on('data', (d) => String(d).trimEnd().split('\n').forEach(tag));
  child.on('exit', (code) => {
    console.log(`[${label}] exited (${code})`);
    shutdown();
  });
  children.push(child);
  return child;
}

let closing = false;
function shutdown() {
  if (closing) return;
  closing = true;
  children.forEach((c) => { try { c.kill(); } catch { /* already gone */ } });
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

run('mock', process.execPath, [path.join(__dirname, 'mock-supabase.js')], APP);
run('next', process.execPath, [path.join(APP, 'node_modules', '.bin', 'next'), 'dev', '-p', '3001'], APP);
run('proxy', process.execPath, [path.join(__dirname, 'review-server.js')], APP);

console.log(`\n[review] open ${ORIGIN}/ui-review\n`);
