const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { compressFile, compressToTarget } = require("../lib/converters");

const router = express.Router();
const uploadDir = path.join(__dirname, "..", "uploads");
const outDir = path.join(__dirname, "..", "converted");
for (const d of [uploadDir, outDir]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    cb(null, Date.now() + "-" + Math.random().toString(36).slice(2, 8) + path.extname(file.originalname || ""));
  },
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024, files: 1 } });

router.post("/", upload.single("file"), async (req, res) => {
  const file = req.file;
  try {
    if (!file) throw new Error("No file");
    const orig = await fs.promises.stat(file.path);
    const result = await compressFile(file, outDir);
    const neu = await fs.promises.stat(result.path);
    res.set("X-Original-Size", String(orig.size));
    res.set("X-Compressed-Size", String(neu.size));
    res.set("Access-Control-Expose-Headers", "X-Original-Size, X-Compressed-Size, Content-Disposition");
    res.download(result.path, result.name, async () => {
      try { await fs.promises.unlink(file.path); } catch {}
      try { await fs.promises.unlink(result.path); } catch {}
    });
  } catch (e) {
    try { if (file) await fs.promises.unlink(file.path); } catch {}
    res.status(400).json({ error: e.message || "compress failed" });
  }
});


router.post("/target", upload.single("file"), async (req, res) => {
  const file = req.file;
  try {
    if (!file) throw new Error("فایلی آپلود نشده");
    const targetKb = parseInt(req.body.target, 10);
    if (!targetKb || targetKb < 20) throw new Error("اندازه هدف را وارد کنید");
    const ext = path.extname(file.originalname || "").toLowerCase();
    const dir = path.join(outDir, "target-" + Date.now());
    fs.mkdirSync(dir, { recursive: true });
    const origSize = (await fs.promises.stat(file.path)).size;
    const { outPath, met } = await compressToTarget(file.path, dir, ext, targetKb);
    const outSize = (await fs.promises.stat(outPath)).size;
    res.set("X-Target-Met", met ? "1" : "0");
    res.set("X-Original-Size", String(origSize));
    res.set("X-Compressed-Size", String(outSize));
    res.set("Access-Control-Expose-Headers", "X-Target-Met, X-Original-Size, X-Compressed-Size, Content-Disposition");
    res.download(outPath, "compressed" + path.extname(outPath), () => {
      // Remove both the uploaded original and the processed copy once the download ends.
      try { fs.unlinkSync(file.path); } catch {}
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    });
  } catch (e) {
    try { if (file) fs.unlinkSync(file.path); } catch {}
    res.status(400).json({ error: e.message || "فشرده‌سازی ناموفق بود" });
  }
});

module.exports = router;
