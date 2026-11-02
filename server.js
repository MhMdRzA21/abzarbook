// ابزاربوک: استاتیک + API تبدیل (در صورت وجود وابستگی‌ها)
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PORT = process.env.PORT || 16660;
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = __dirname;

let expressApp = null;
try {
  const express = require('express');
  const helmet = require('helmet');
  const rateLimit = require('express-rate-limit');
  expressApp = express();
  expressApp.set('trust proxy', 1);
  for (const d of ['server/uploads', 'server/converted', 'uploads', 'converted']) {
    const p = path.join(ROOT, d);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  }
  expressApp.use(helmet({ contentSecurityPolicy: false }));
  expressApp.use(express.json({ limit: '2mb' }));
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, message: { error: 'Too many requests' } });
  try {
    expressApp.use('/api/convert', limiter, require('./server/routes/convert'));
    expressApp.use('/api/compress', limiter, require('./server/routes/compress'));
    expressApp.use('/api/pdf', limiter, require('./server/routes/pdftools'));
    console.log('Convert API routes loaded');
  } catch (e) {
    console.warn('Convert routes partial:', e.message);
    expressApp.use('/api', (req, res) => res.status(503).json({ error: 'موتور تبدیل آماده نیست' }));
  }
} catch (e) {
  console.warn('Express not installed — static only:', e.message);
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff',
};

function cacheControl(ext) {
  if (ext === '.html' || ext === '.xml' || ext === '.txt') return 'public, max-age=300, must-revalidate';
  if (['.png', '.jpg', '.jpeg', '.webp', '.ico', '.svg', '.woff2', '.woff'].includes(ext)) return 'public, max-age=31536000, immutable';
  if (['.js', '.css', '.json'].includes(ext)) return 'public, max-age=86400';
  return 'public, max-age=3600';
}

const SECURITY = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https:; connect-src 'self' https://cdn.jsdelivr.net https://raw.githubusercontent.com; object-src 'none'; base-uri 'self'; frame-ancestors 'self'",
};

function makeETag(stat) {
  return `"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
}
function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent((urlPath || '/').split('?')[0]);
  const resolved = path.normalize(path.join(root, decoded));
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

function serveStatic(req, res) {
  if (req.url === '/health' || req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', ...SECURITY });
    return res.end(JSON.stringify({
      ok: true,
      convert: fs.existsSync(path.join(ROOT, 'convert', 'index.html')),
      api: Boolean(expressApp),
    }));
  }

  let urlPath = (req.url || '/').split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';
  if (urlPath === '/convert' || urlPath === '/convert/') urlPath = '/convert/index.html';
  if (urlPath === '/convert/guides' || urlPath === '/convert/guides/') urlPath = '/convert/guides/index.html';
  if (urlPath.endsWith('/') && urlPath !== '/') urlPath = urlPath + 'index.html';

  const filePath = safeJoin(ROOT, urlPath);
  if (!filePath) {
    res.writeHead(400, { 'Content-Type': 'text/plain', ...SECURITY });
    return res.end('Bad request');
  }

  const trySend = (fp, ext) => {
    fs.stat(fp, (err, stat) => {
      if (err || !stat.isFile()) {
        if (!path.extname(fp)) return trySend(fp + '.html', '.html');
        const p404 = path.join(ROOT, '404.html');
        return fs.readFile(p404, (e2, data) => {
          res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...SECURITY });
          res.end(e2 ? '404' : data);
        });
      }
      const etag = makeETag(stat);
      if (req.headers['if-none-match'] === etag) {
        res.writeHead(304, { ETag: etag, ...SECURITY });
        return res.end();
      }
      fs.readFile(fp, (err2, data) => {
        if (err2) {
          res.writeHead(500, { 'Content-Type': 'text/plain', ...SECURITY });
          return res.end('Error');
        }
        const headers = {
          'Content-Type': MIME[ext] || 'application/octet-stream',
          'Cache-Control': cacheControl(ext),
          ETag: etag,
          ...SECURITY,
        };
        const compressible = ['.html', '.css', '.js', '.json', '.xml', '.txt', '.svg'].includes(ext) && data.length > 1024;
        const accept = req.headers['accept-encoding'] || '';
        if (compressible && accept.includes('gzip')) {
          return zlib.gzip(data, (zerr, compressed) => {
            if (!zerr) {
              headers['Content-Encoding'] = 'gzip';
              headers['Content-Length'] = compressed.length;
              headers['Vary'] = 'Accept-Encoding';
              res.writeHead(200, headers);
              return res.end(compressed);
            }
            headers['Content-Length'] = data.length;
            res.writeHead(200, headers);
            res.end(data);
          });
        }
        headers['Content-Length'] = data.length;
        res.writeHead(200, headers);
        res.end(data);
      });
    });
  };

  const ext = path.extname(filePath).toLowerCase() || '.html';
  trySend(filePath, ext === '' ? '.html' : ext);
}

const server = http.createServer((req, res) => {
  if (expressApp && (req.url || '').startsWith('/api/')) {
    return expressApp(req, res);
  }
  return serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`ابزاربوک روی ${HOST}:${PORT} | api=${Boolean(expressApp)}`);
});
