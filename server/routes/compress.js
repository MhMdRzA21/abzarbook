const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { compressFile } = require("../lib/converters");

const router = express.Router();
const uploadDir = path.join(__dirname, "..", "uploads");
const outDir = path.join(__dirname, "..", "converted");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = Date.now() + "-" + Math.random().toString(36).slice(2, 8) + path.extname(file.originalname || "");
    cb(null, safe);
  },
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024, files: 1 } });

router.post("/", upload.single("file"), async (req, res) => {
  const file = req.file;
  try {
    if (!file) throw new Error("No file");
    const result = await compressFile(file, outDir);
    res.download(result.path, result.name, async () => {
      try { await fs.promises.unlink(file.path); } catch {}
      try { await fs.promises.unlink(result.path); } catch {}
    });
  } catch (e) {
    try { if (file) await fs.promises.unlink(file.path); } catch {}
    res.status(400).json({ error: e.message || "compress failed" });
  }
});

module.exports = router;
