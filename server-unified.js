// Unified server: AbzarBook static + Converter API
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");

const ROOT = __dirname;
const PORT = process.env.PORT || 16660;

let convertRoutes, compressRoutes, pdfToolRoutes;
try {
  convertRoutes = require("./server/routes/convert");
  compressRoutes = require("./server/routes/compress");
  pdfToolRoutes = require("./server/routes/pdftools");
} catch (e) {
  console.warn("Converter routes not loaded:", e.message);
}

const app = express();
app.set("trust proxy", 1);

for (const d of ["server/uploads", "server/converted", "uploads", "converted"]) {
  const p = path.join(ROOT, d);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "2mb" }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: "Too many requests, please try again later." },
});

if (convertRoutes) app.use("/api/convert", limiter, convertRoutes);
if (compressRoutes) app.use("/api/compress", limiter, compressRoutes);
if (pdfToolRoutes) app.use("/api/pdf", limiter, pdfToolRoutes);

app.use("/convert", express.static(path.join(ROOT, "convert"), { index: ["index.html"] }));
app.use(express.static(ROOT, {
  extensions: ["html"],
  setHeaders(res, filePath) {
    if (filePath.endsWith(".html") || filePath.endsWith(".xml")) {
      res.setHeader("Cache-Control", "public, max-age=300, must-revalidate");
    } else if (/\.(png|jpg|jpeg|webp|ico|svg|woff2)$/i.test(filePath)) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
  },
}));

app.get("/health", (_req, res) => res.json({ ok: true, convert: Boolean(convertRoutes) }));

app.use((req, res) => {
  const p404 = path.join(ROOT, "404.html");
  if (fs.existsSync(p404)) return res.status(404).sendFile(p404);
  res.status(404).send("404");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`ابزاربوک+تبدیل روی پورت ${PORT}`);
});
