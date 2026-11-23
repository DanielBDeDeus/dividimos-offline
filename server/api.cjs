'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { openStore, validateState, summary } = require('./storage.cjs');

function createApi({ databasePath, staticDir, token = crypto.randomBytes(32).toString('hex'), log = console }) {
  const store = openStore(databasePath);
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
  const send = (res, status, obj) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
  const server = http.createServer(async (req, res) => {
    try {
      const host = `127.0.0.1:${server.address().port}`;
      if (req.headers.host !== host) return send(res, 403, { error: 'Host invalido' });
      if (req.headers.origin && req.headers.origin !== `http://${host}`) return send(res, 403, { error: 'Origem invalida' });
      const url = new URL(req.url, `http://${host}`);
      const pathname = decodeURIComponent(url.pathname);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'");
      if (pathname === '/health' && req.method === 'GET') return send(res, 200, { status: 'ok', database: 'sqlite', mode: 'offline' });
      if (pathname.startsWith('/api/')) {
        const authorization = req.headers.authorization || '';
        const supplied = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
        const a = Buffer.from(supplied), b = Buffer.from(token);
        if (!a.length || a.length !== b.length || !crypto.timingSafeEqual(a, b)) return send(res, 401, { error: 'Token necessario' });
        if (pathname === '/api/state' && req.method === 'GET') return send(res, 200, store.read());
        if (pathname === '/api/summary' && req.method === 'GET') return send(res, 200, summary(store.read()));
        if (pathname === '/api/state' && req.method === 'PUT') {
          const chunks = [];
          let bytes = 0;
          for await (const chunk of req) {
            bytes += chunk.length;
            if (bytes > 2 * 1024 * 1024) return send(res, 413, { error: 'Body muito grande' });
            chunks.push(chunk);
          }
          const body = Buffer.concat(chunks).toString('utf8');
          let state;
          try { state = validateState(JSON.parse(body)); } catch (e) { return send(res, 400, { error: e.message }); }
          store.write(state);
          log.info?.('[DividimOS] Estado salvo via API');
          return send(res, 200, { saved: true });
        }
        return send(res, 404, { error: 'Endpoint nao encontrado' });
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Metodo nao permitido' });
      if (!staticDir) return send(res, 404, { error: 'Frontend indisponivel' });
      const normalized = pathname === '/' ? '/index.html' : pathname;
      const candidate = path.resolve(staticDir, '.' + normalized);
      const root = path.resolve(staticDir);
      if (!candidate.startsWith(root + path.sep) && candidate !== root) return send(res, 403, { error: 'Caminho bloqueado' });
      let file = candidate;
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) file = path.join(root, 'index.html');
      if (!fs.existsSync(file)) return send(res, 404, { error: 'Frontend nao compilado' });
      res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(file).pipe(res);
    } catch (e) {
      log.error?.('[DividimOS] Erro na API:', e);
      if (!res.headersSent) send(res, 500, { error: 'Erro interno' }); else res.destroy();
    }
  });
  return {
    token,
    store,
    async start() { await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); }); return `http://127.0.0.1:${server.address().port}`; },
    async close() { await new Promise((resolve, reject) => server.close(e => e ? reject(e) : resolve())); store.close(); },
  };
}
module.exports = { createApi };
