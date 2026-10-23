// سرور استاتیک ساده، بدون هیچ وابستگی خارجی — برای دیپلوی روی Railway
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 16660; // پورت پیش‌فرض Wispbyte؛ روی Railway متغیر PORT خودش ست می‌شود
const HOST = process.env.HOST || '0.0.0.0'; // روی همه اینترفیس‌ها گوش بده (لازم برای Wispbyte و هاست‌های ابری)
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
};

function send(res, status, body, type) {
  res.writeHead(status, { 'Content-Type': type || 'text/plain; charset=utf-8' });
  res.end(body);
}

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const resolved = path.normalize(path.join(root, decoded));
  if (!resolved.startsWith(root)) return null; // path traversal guard
  return resolved;
}

http.createServer((req, res) => {
  let urlPath = req.url === '/' ? '/index.html' : req.url;
  let filePath = safeJoin(ROOT, urlPath);

  if (!filePath) return send(res, 400, 'Bad request');

  fs.readFile(filePath, (err, data) => {
    if (!err) {
      const ext = path.extname(filePath);
      return send(res, 200, data, MIME[ext] || 'application/octet-stream');
    }
    // اگر فایل بدون پسوند خواسته شده بود، اول .html را امتحان کن
    fs.readFile(filePath + '.html', (err2, data2) => {
      if (!err2) return send(res, 200, data2, MIME['.html']);
      fs.readFile(path.join(ROOT, '404.html'), (err3, data3) => {
        if (!err3) return send(res, 404, data3, MIME['.html']);
        send(res, 404, '404 — صفحه پیدا نشد');
      });
    });
  });
}).listen(PORT, HOST, () => {
  console.log(`abzarbook running on ${HOST}:${PORT}`);
});
