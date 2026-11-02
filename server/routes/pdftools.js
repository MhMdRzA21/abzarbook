const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { PDFDocument } = require("pdf-lib");

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
const upload = multer({ storage, limits: { fileSize: 80 * 1024 * 1024, files: 1 } });

async function cleanup(p) { try { if (p) await fs.promises.unlink(p); } catch {} }

router.post("/rotate", upload.single("file"), async (req, res) => {
  const file = req.file;
  try {
    if (!file) throw new Error("No file");
    const degrees = Number(req.body.degrees || 90);
    const bytes = await fs.promises.readFile(file.path);
    const pdf = await PDFDocument.load(bytes);
    for (const page of pdf.getPages()) page.setRotation({ angle: (page.getRotation().angle + degrees) % 360 });
    const out = path.join(outDir, "rotated-" + Date.now() + ".pdf");
    await fs.promises.writeFile(out, await pdf.save());
    res.download(out, "rotated.pdf", async () => { await cleanup(file.path); await cleanup(out); });
  } catch (e) {
    await cleanup(file && file.path);
    res.status(400).json({ error: e.message || "rotate failed" });
  }
});

module.exports = router;
