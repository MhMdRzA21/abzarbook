const express = require('express');
const compression = require('compression'); // فشرده سازی Gzip برای سرعت و سئو
const path = require('path');
const app = express();

// اعمال فشرده‌سازی در سطح سرور
app.use(compression());

// تنظیم کش مرورگر (Cache-Control) برای فایل‌های استاتیک جهت افزایش امتیاز Core Web Vitals
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '30d' // کش 30 روزه
}));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// مسیر پیش‌فرض برای اجرای فایل‌های ابزار
app.get('/:page', (req, res) => {
    res.sendFile(path.join(__dirname, req.params.page));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on https://abzarbook.ir`);
});
