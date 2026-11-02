const path = require("path");

const ALLOWED_IMAGE = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tiff", ".tif", ".avif"]);
const ALLOWED_PDF = new Set([".pdf"]);
const ALLOWED_OFFICE = new Set([".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".odt", ".ods", ".odp"]);

function extOf(name) {
  return path.extname(name || "").toLowerCase();
}

function validateFiles(files, kind) {
  if (!files || !files.length) throw new Error("No files uploaded");
  for (const f of files) {
    const ext = extOf(f.originalname || f.path);
    if (kind === "image" && !ALLOWED_IMAGE.has(ext)) throw new Error("Unsupported image: " + ext);
    if (kind === "pdf" && !ALLOWED_PDF.has(ext)) throw new Error("Not a PDF");
    if (kind === "office" && !ALLOWED_OFFICE.has(ext) && !ALLOWED_PDF.has(ext)) throw new Error("Unsupported office file");
  }
  return true;
}

const fs = require("fs/promises");
const SIGNATURES = {
  ".pdf": [Buffer.from([0x25,0x50,0x44,0x46])],
  ".png": [Buffer.from([0x89,0x50,0x4e,0x47])],
  ".jpg": [Buffer.from([0xff,0xd8,0xff])],
  ".jpeg": [Buffer.from([0xff,0xd8,0xff])],
};
async function checkFiles(req, res, next) {
  const files = req.file ? [req.file] : req.files || [];
  try {
    for (const f of files) {
      const ext = extOf(f.originalname);
      const sig = SIGNATURES[ext];
      if (!sig) continue;
      const fh = await fs.open(f.path, "r");
      const buf = Buffer.alloc(8);
      await fh.read(buf, 0, 8, 0);
      await fh.close();
      if (!sig.some((s) => buf.subarray(0, s.length).equals(s))) {
        return res.status(400).json({ error: "فایل معتبر نیست." });
      }
    }
    next();
  } catch (e) { next(e); }
}
module.exports = { validateFiles, extOf, ALLOWED_IMAGE, ALLOWED_PDF, ALLOWED_OFFICE, checkFiles };
