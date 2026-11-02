// ابزارهای صفحه PDF: چرخش، حذف، ترتیب، رمز، باز کردن قفل.
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs/promises");
const fssync = require("fs");
const os = require("os");
const { randomUUID: uuid } = require("crypto");
const { PDFDocument, degrees } = require("pdf-lib");
const { execFile } = require("child_process");
const { checkFiles } = require("../lib/validate");

const router = express.Router();
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
const CONVERTED_DIR = path.join(__dirname, "..", "converted");
for (const d of [UPLOAD_DIR, CONVERTED_DIR]) {
  if (!fssync.existsSync(d)) fssync.mkdirSync(d, { recursive: true });
}
const upload = multer({ dest: UPLOAD_DIR, limits: { fileSize: 25 * 1024 * 1024, files: 1 } });
const rm = (p) => fs.rm(p, { recursive: true, force: true }).catch(() => {});

function parsePages(str, count) {
  const out = [];
  for (const part of String(str || "").split(",").map((s) => s.trim()).filter(Boolean)) {
    const m = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) throw new Error(`«${part}» صفحه یا بازه معتبر نیست. مثل 1-3,5,8`);
    const a = parseInt(m[1], 10);
    const b = m[2] ? parseInt(m[2], 10) : a;
    if (a < 1 || b < 1 || a > count || b > count) throw new Error(`صفحه ${part} خارج از محدوده است. این PDF ${count} صفحه دارد.`);
    const step = a <= b ? 1 : -1;
    for (let p = a; p !== b + step; p += step) out.push(p);
  }
  return out;
}

async function loadPdf(file) {
  try {
    return await PDFDocument.load(await fs.readFile(file.path));
  } catch (e) {
    if (/encrypt/i.test(e.message)) throw new Error("این PDF رمز دارد. اول قفل را بردار.");
    throw new Error("خواندن PDF ممکن نشد. شاید خراب باشد.");
  }
}

function qpdf(args) {
  return new Promise((resolve, reject) => {
    execFile("qpdf", args, { timeout: 120000 }, (err, _o, stderr) => {
      if (err && err.code !== 3) return reject(new Error(stderr || err.message));
      resolve();
    });
  });
}

function tool(handler) {
  return async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "فایلی آپلود نشده" });
    const outDir = path.join(CONVERTED_DIR, uuid());
    fssync.mkdirSync(outDir, { recursive: true });
    const extra = [];
    res.on("close", () => { [outDir, req.file.path, ...extra].forEach(rm); });
    try {
      const outName = await handler(req, outDir, extra);
      res.download(path.join(outDir, outName.file), outName.download);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  };
}

const baseName = (f) => path.basename(f.originalname, path.extname(f.originalname));

router.post("/rotate", upload.single("file"), checkFiles, tool(async (req, outDir) => {
  const angle = parseInt(req.body.angle || req.body.degrees, 10);
  if (![90, 180, 270].includes(angle)) throw new Error("زاویه را ۹۰، ۱۸۰ یا ۲۷۰ انتخاب کنید.");
  const doc = await loadPdf(req.file);
  const n = doc.getPageCount();
  const targets = req.body.pages && req.body.pages.trim()
    ? parsePages(req.body.pages, n)
    : doc.getPageIndices().map((i) => i + 1);
  for (const p of new Set(targets)) {
    const page = doc.getPage(p - 1);
    page.setRotation(degrees((page.getRotation().angle + angle) % 360));
  }
  await fs.writeFile(path.join(outDir, "rotated.pdf"), await doc.save());
  return { file: "rotated.pdf", download: `rotated-${baseName(req.file)}.pdf` };
}));

router.post("/delete-pages", upload.single("file"), checkFiles, tool(async (req, outDir) => {
  const doc = await loadPdf(req.file);
  const n = doc.getPageCount();
  const del = new Set(parsePages(req.body.pages, n));
  if (!del.size) throw new Error("صفحه‌های حذف را وارد کنید، مثلاً 2,5-7.");
  if (del.size >= n) throw new Error("این کار همه صفحه‌ها را حذف می‌کند. حداقل یک صفحه بماند.");
  [...del].sort((a, b) => b - a).forEach((p) => doc.removePage(p - 1));
  await fs.writeFile(path.join(outDir, "out.pdf"), await doc.save());
  return { file: "out.pdf", download: `${baseName(req.file)}-edited.pdf` };
}));

router.post("/reorder", upload.single("file"), checkFiles, tool(async (req, outDir) => {
  const src = await loadPdf(req.file);
  const n = src.getPageCount();
  const first = parsePages(req.body.order || req.body.pages, n);
  if (!first.length) throw new Error("ترتیب جدید را وارد کنید، مثلاً 3,1,2.");
  const seen = new Set(first);
  const rest = src.getPageIndices().map((i) => i + 1).filter((p) => !seen.has(p));
  const order = [...first, ...rest].map((p) => p - 1);
  const out = await PDFDocument.create();
  (await out.copyPages(src, order)).forEach((pg) => out.addPage(pg));
  await fs.writeFile(path.join(outDir, "out.pdf"), await out.save());
  return { file: "out.pdf", download: `${baseName(req.file)}-reordered.pdf` };
}));

async function argsFile(lines, extra) {
  const f = path.join(os.tmpdir(), `qa_${uuid()}`);
  await fs.writeFile(f, lines.join("\n") + "\n", { mode: 0o600 });
  extra.push(f);
  return `@${f}`;
}

router.post("/protect", upload.single("file"), checkFiles, tool(async (req, outDir, extra) => {
  const pw = String(req.body.password || "");
  if (pw.length < 4) throw new Error("رمز حداقل ۴ کاراکتر باشد.");
  if (/[\r\n]/.test(pw)) throw new Error("رمز نباید خط جدید داشته باشد.");
  const out = path.join(outDir, "protected.pdf");
  await qpdf([await argsFile(["--encrypt", pw, pw, "256", "--"], extra), req.file.path, out]);
  return { file: "protected.pdf", download: `protected-${baseName(req.file)}.pdf` };
}));

router.post("/unlock", upload.single("file"), checkFiles, tool(async (req, outDir, extra) => {
  const pw = String(req.body.password || "");
  if (/[\r\n]/.test(pw)) throw new Error("رمز نباید خط جدید داشته باشد.");
  const pwFile = path.join(os.tmpdir(), `qp_${uuid()}`);
  await fs.writeFile(pwFile, pw, { mode: 0o600 });
  extra.push(pwFile);
  const out = path.join(outDir, "unlocked.pdf");
  try {
    await qpdf([`--password-file=${pwFile}`, "--decrypt", req.file.path, out]);
  } catch (e) {
    if (/invalid password/i.test(e.message)) throw new Error(pw ? "رمز اشتباه است." : "این PDF رمز می‌خواهد.");
    throw new Error("باز کردن قفل ممکن نشد.");
  }
  return { file: "unlocked.pdf", download: `unlocked-${baseName(req.file)}.pdf` };
}));

module.exports = router;
