// سرور استاتیک فوق‌سبک و بهینه — بدون هیچ وابستگی خارجی
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PORT = process.env.PORT || 16660;
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

function cacheControl(ext) {
  if (ext === '.html' || ext === '.xml' || ext === '.txt') return 'public, max-age=300, must-revalidate';
  if (['.png', '.jpg', '.jpeg', '.webp', '.ico', '.svg', '.woff2'].includes(ext)) return 'public, max-age=31536000, immutable';
  if (['.js', '.css', '.json'].includes(ext)) return 'public, max-age=86400';
  return 'public, max-age=3600';
}

const SECURITY = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-XSS-Protection': '1; mode=block',
};

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent((urlPath || '/').split('?')[0]);
  const resolved = path.normalize(path.join(root, decoded));
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain', ...SECURITY });
    return res.end('ok');
  }

  let urlPath = req.url === '/' ? '/index.html' : req.url;
  let filePath = safeJoin(ROOT, urlPath);
  if (!filePath) {
    res.writeHead(400, { 'Content-Type': 'text/plain', ...SECURITY });
    return res.end('Bad request');
  }

  const trySend = (fp, ext) => {
    fs.readFile(fp, (err, data) => {
      if (err) {
        // try next
        if (ext !== '.html' && !path.extname(filePath)) {
          return trySend(filePath + '.html', '.html');
        }
        // 404
        return fs.readFile(path.join(ROOT, '404.html'), (e2, d2) => {
          res.writeHead(404, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store', ...SECURITY });
          res.end(e2 ? '۴۰۴ — صفحه پیدا نشد' : d2);
        });
      }

      const type = MIME[ext] || 'application/octet-stream';
      const headers = {
        'Content-Type': type,
        'Cache-Control': cacheControl(ext),
        ...SECURITY,
      };

      const accept = req.headers['accept-encoding'] || '';
      if (accept.includes('gzip') && ['.html', '.css', '.js', '.json', '.xml', '.txt', '.svg'].includes(ext) && data.length > 1024) {
        zlib.gzip(data, (zerr, compressed) => {
          if (zerr) {
            headers['Content-Length'] = data.length;
            res.writeHead(200, headers);
            return res.end(data);
          }
          headers['Content-Encoding'] = 'gzip';
          headers['Content-Length'] = compressed.length;
          headers['Vary'] = 'Accept-Encoding';
          res.writeHead(200, headers);
          res.end(compressed);
        });
        return;
      }

      headers['Content-Length'] = data.length;
      res.writeHead(200, headers);
      res.end(data);
    });
  };

  const ext = path.extname(filePath).toLowerCase() || '.html';
  trySend(filePath, ext === '' ? '.html' : ext);
}).listen(PORT, HOST, () => {
  console.log(`ابزاربوک آماده روی ${HOST}:${PORT}`);
});
