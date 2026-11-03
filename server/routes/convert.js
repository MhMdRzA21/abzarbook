const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  convertImageFiles,
  imagesToPdf,
  pdfToImages,
  officeConvert,
  pdfToDocxSmart,
  mergePdfs,
  splitPdf,
} = require("../lib/converters");

const router = express.Router();
const uploadDir = path.join(__dirname, "..", "uploads");
const outDir = path.join(__dirname, "..", "converted");
for (const d of [uploadDir, outDir]) {
  try {
    if (fs.existsSync(d) && !fs.statSync(d).isDirectory()) fs.unlinkSync(d);
    fs.mkdirSync(d, { recursive: true });
  } catch {}
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = Date.now() + "-" + Math.random().toString(36).slice(2, 8) + path.extname(file.originalname || ".bin");
    cb(null, safe);
  },
});
const upload = multer({ storage, limits: { fileSize: 80 * 1024 * 1024, files: 20 } });

async function cleanup(files = []) {
  for (const f of files) {
    try { if (f && f.path) await fs.promises.unlink(f.path); } catch {}
  }
}

router.post("/image", upload.array("files", 20), async (req, res) => {
  const files = req.files || [];
  try {
    if (!files.length) throw new Error("فایلی ارسال نشده");
    const target = (req.body.target || "jpg").toLowerCase();
    const quality = Number(req.body.quality) || 80;
    const width = Number(req.body.width) || 0;
    const result = await convertImageFiles(files, target, outDir, { quality, width });
    res.download(result.path, result.name, async () => {
      await cleanup(files);
      try { await fs.promises.unlink(result.path); } catch {}
    });
  } catch (e) {
    await cleanup(files);
    res.status(400).json({ error: e.message || "convert failed" });
  }
});

router.post("/image-to-pdf", upload.array("files", 20), async (req, res) => {
  const files = req.files || [];
  try {
    if (!files.length) throw new Error("فایلی ارسال نشده");
    const out = path.join(outDir, "images-" + Date.now() + ".pdf");
    await imagesToPdf(files.map((f) => f.path), out);
    res.download(out, "images.pdf", async () => {
      await cleanup(files);
      try { await fs.promises.unlink(out); } catch {}
    });
  } catch (e) {
    await cleanup(files);
    res.status(400).json({ error: e.message || "convert failed" });
  }
});

router.post("/pdf-to-image", upload.single("file"), async (req, res) => {
  const file = req.file;
  try {
    if (!file) throw new Error("فایلی ارسال نشده");
    const target = (req.body.target || "jpg").toLowerCase();
    const result = await pdfToImages(file.path, outDir, target);
    res.download(result.path, result.name, async () => {
      await cleanup([file]);
      try { await fs.promises.unlink(result.path); } catch {}
    });
  } catch (e) {
    await cleanup([file]);
    res.status(400).json({ error: e.message || "convert failed" });
  }
});

router.post("/office", upload.single("file"), async (req, res) => {
  const file = req.file;
  try {
    if (!file) throw new Error("فایلی ارسال نشده");
    const target = (req.body.target || "pdf").toLowerCase();
    const result = target === "docx"
      ? await pdfToDocxSmart(file.path, outDir)
      : await officeConvert(file.path, outDir, target);
    res.download(result.path, result.name, async () => {
      await cleanup([file]);
      try { await fs.promises.unlink(result.path); } catch {}
    });
  } catch (e) {
    await cleanup([file]);
    res.status(400).json({ error: e.message || "convert failed" });
  }
});

router.post("/merge-pdf", upload.array("files", 20), async (req, res) => {
  const files = req.files || [];
  try {
    if (files.length < 1) throw new Error("حداقل یک فایل PDF بفرستید");
    const out = path.join(outDir, "merged-" + Date.now() + ".pdf");
    await mergePdfs(files.map((f) => f.path), out);
    res.download(out, "merged.pdf", async () => {
      await cleanup(files);
      try { await fs.promises.unlink(out); } catch {}
    });
  } catch (e) {
    await cleanup(files);
    res.status(400).json({ error: e.message || "merge failed" });
  }
});

router.post("/split-pdf", upload.single("file"), async (req, res) => {
  const file = req.file;
  try {
    if (!file) throw new Error("فایلی ارسال نشده");
    const ranges = req.body.ranges || "";
    const result = await splitPdf(file.path, ranges, outDir);
    res.download(result.path, result.name, async () => {
      await cleanup([file]);
      try { await fs.promises.unlink(result.path); } catch {}
    });
  } catch (e) {
    await cleanup([file]);
    res.status(400).json({ error: e.message || "split failed" });
  }
});

module.exports = router;
