/**
 * Local review front door — Narratix Lab Phase 0.5B.
 *
 * Listens on :3000 and splits traffic:
 *   /auth/v1/*, /rest/v1/*, /storage/v1/*  ->  local stand-in auth service (:54999)
 *   everything else                        ->  the real Next.js dev server (:3001)
 *
 * Why a proxy rather than a code change: the application's own CSP allows
 * `connect-src 'self'` only. Serving the stand-in from the same origin means the
 * real, unmodified app authenticates normally — no bypass flag, no dev branch in
 * the middleware, no weakened check. Nothing in the repository knows this exists.
 *
 * Local only. Binds to 127.0.0.1. Never used in production.
 */
const http = require('http');

const PORT = Number(process.env.REVIEW_PORT || 3000);
const NEXT = { host: '127.0.0.1', port: Number(process.env.NEXT_PORT || 3001) };
const AUTH = { host: '127.0.0.1', port: 54999 };

const isAuthPath = (p) =>
  p.startsWith('/auth/v1') || p.startsWith('/rest/v1') || p.startsWith('/storage/v1') || p.startsWith('/realtime/v1');

const server = http.createServer((req, res) => {
  const target = isAuthPath(req.url) ? AUTH : NEXT;

  // A browser closing a tab mid-request resets the socket. Every stream here
  // needs its own error handler, or the reset becomes an unhandled 'error'
  // event and takes the whole proxy down.
  req.on('error', () => {});
  res.on('error', () => {});

  const proxied = http.request(
    { host: target.host, port: target.port, method: req.method, path: req.url, headers: req.headers },
    (up) => {
      up.on('error', () => { if (!res.writableEnded) res.end(); });
      if (!res.headersSent) res.writeHead(up.statusCode || 502, up.headers);
      up.pipe(res);
    }
  );

  proxied.on('error', (err) => {
    if (res.writableEnded) return;
    if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' });
    res.end(`Local review proxy: upstream ${target.port} unavailable — ${err.message}`);
  });

  req.pipe(proxied).on('error', () => {});
});

// Malformed or aborted requests must not be fatal either.
server.on('clientError', (err, socket) => {
  if (socket && !socket.destroyed) socket.destroy();
});

// Next.js dev uses a websocket for hot reload.
server.on('upgrade', (req, socket, head) => {
  socket.on('error', () => {});
  const up = http.request({
    host: NEXT.host,
    port: NEXT.port,
    method: req.method,
    path: req.url,
    headers: req.headers,
  });
  up.on('upgrade', (upRes, upSocket, upHead) => {
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\n` +
        Object.entries(upRes.headers).map(([k, v]) => `${k}: ${v}`).join('\r\n') +
        '\r\n\r\n'
    );
    if (upHead && upHead.length) upSocket.unshift(upHead);
    upSocket.on('error', () => socket.destroy());
    upSocket.pipe(socket).on('error', () => {});
    socket.pipe(upSocket).on('error', () => {});
  });
  up.on('error', () => socket.destroy());
  if (head && head.length) up.write(head);
  up.end();
});

// Last-resort guard: the review server must stay up for the whole session.
process.on('uncaughtException', (err) => {
  console.error('[review] recovered from:', err.code || err.message);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[review] http://localhost:${PORT}  →  Next :${NEXT.port} · auth stand-in :${AUTH.port}`);
  console.log(`[review] open http://localhost:${PORT}/ui-review`);
});
