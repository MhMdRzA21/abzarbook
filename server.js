const express = require('express');
const compression = require('compression'); // پشتیبانی از فشرده‌سازی برای سرعت بسیار بالا
const path = require('path');
const app = express();

// استفاده از فیلتر قدرتمند فشرده‌سازی (بهینه‌شده برای Brotli/Gzip)
app.use(compression({
    level: 9, // بالاترین سطح فشرده‌سازی
    threshold: 0, // فشرده‌سازی تمام فایل‌ها
    filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
    }
}));

// تنظیم Cache-Control شدید برای منابع استاتیک جهت کسب امتیاز 100 در PageSpeed Insights
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '365d', // کش یک ساله برای فایل‌های ثابت
  immutable: true
}));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// هدایت درخواست‌ها به صفحات HTML ابزارها
app.get('/:page', (req, res) => {
    const filePath = path.join(__dirname, req.params.page);
    res.sendFile(filePath);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on https://abzarbook.ir with ultra-compression enabled.`);
});
