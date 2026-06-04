'use strict';
/**
 * Vercel Serverless Function — /api/[...path].js
 *
 * Proxies every /api/* request from the Vercel frontend to the Railway
 * FastAPI backend over HTTPS, eliminating CORS and mixed-content issues.
 *
 * Previously pointed at an AWS ELB (HTTP).  Now targets Railway (HTTPS).
 */

const https = require('https');

const BACKEND_HOST = 'predictive-maintenance-dashboard-production.up.railway.app';
const BACKEND_PORT = 443;

// Reuse TLS sessions across requests within the same warm instance.
const keepAliveAgent = new https.Agent({
  keepAlive:      true,
  keepAliveMsecs: 10_000,
  maxSockets:     50,
  maxFreeSockets: 10,
  timeout:        30_000,
});

module.exports = async function handler(req, res) {
  // Strip client-side cache-busters before forwarding
  const parsed = new URL(req.url, 'https://placeholder');
  parsed.searchParams.delete('_t');

  const upstreamPath =
    parsed.pathname +
    (parsed.searchParams.toString() ? '?' + parsed.searchParams.toString() : '');

  const isGet = req.method === 'GET';

  return new Promise((resolve) => {
    const reqOpts = {
      hostname: BACKEND_HOST,
      port:     BACKEND_PORT,
      path:     upstreamPath,
      method:   req.method,
      agent:    keepAliveAgent,
      headers: {
        Accept:         'application/json',
        'Content-Type': req.headers['content-type'] || 'application/json',
        Connection:     'keep-alive',
      },
    };

    const proxyReq = https.request(reqOpts, (proxyRes) => {
      let data = '';
      proxyRes.on('data',  (chunk) => { data += chunk; });
      proxyRes.on('end', () => {
        res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'application/json');

        if (isGet) {
          res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
        } else {
          res.setHeader('Cache-Control', 'no-store');
          res.setHeader('Pragma',        'no-cache');
        }

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
