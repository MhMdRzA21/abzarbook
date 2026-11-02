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

module.exports = { validateFiles, extOf, ALLOWED_IMAGE, ALLOWED_PDF, ALLOWED_OFFICE };
