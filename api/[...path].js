'use strict';
/**
 * Vercel Serverless Function — /api/[...path].js
 *
 * WHY this exists:
 *   Vercel's edge CDN cannot proxy to HTTP (non-HTTPS) destinations via
 *   vercel.json rewrites — it silently falls through to the SPA catch-all
 *   and returns index.html instead of JSON.  This function runs server-side
 *   in a Node.js environment that has no such restriction, so it can reach
 *   the HTTP-only AWS ELB directly and forward the response back.
 *
 * ROUTING:
 *   Every request to /api/* on the Vercel deployment is handled here.
 *   Vercel gives functions higher priority than afterFiles rewrites, so
 *   the SPA fallback (/(.*) → /index.html) never intercepts API paths.
 */

const http = require('http');

const BACKEND_HOST = 'aa98d1adfbfea4c8ca56c8d6dddb606c-1269872415.us-east-2.elb.amazonaws.com';
const BACKEND_PORT = 80;

module.exports = async function handler(req, res) {
  // Parse the incoming URL and strip the client-side cache-buster (?_t=…)
  // before forwarding — FastAPI ignores unknown query params, but keeping
  // it clean avoids any edge-case issues.
  const parsed = new URL(req.url, 'http://placeholder');
  parsed.searchParams.delete('_t');

  const upstreamPath =
    parsed.pathname +
    (parsed.searchParams.toString() ? '?' + parsed.searchParams.toString() : '');

  return new Promise((resolve) => {
    const reqOpts = {
      hostname: BACKEND_HOST,
      port:     BACKEND_PORT,
      path:     upstreamPath,
      method:   req.method,
      headers: {
        Accept:           'application/json',
        'Content-Type':   req.headers['content-type'] || 'application/json',
      },
    };

    const proxyReq = http.request(reqOpts, (proxyRes) => {
      let data = '';
      proxyRes.on('data',  (chunk) => { data += chunk; });
      proxyRes.on('end', () => {
        res.setHeader('Content-Type',  proxyRes.headers['content-type'] || 'application/json');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        res.setHeader('Pragma',        'no-cache');
        res.status(proxyRes.statusCode).send(data);
        resolve();
      });
    });

    proxyReq.on('error', (err) => {
      console.error('[proxy] Backend unreachable:', err.message);
      res.status(502).json({ error: 'Backend unreachable', detail: err.message });
      resolve();
    });

    // Forward request body for write operations
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      proxyReq.write(
        typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
      );
    }

    proxyReq.end();
  });
};
