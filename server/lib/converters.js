const { execFile } = require("child_process");
const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");
const { PDFDocument } = require("pdf-lib");
const { randomUUID } = require("crypto");

const HEAVY = new Set(["soffice", "ffmpeg", "python3", "gs", "qpdf"]);
const MAX_HEAVY = Number(process.env.MAX_HEAVY_JOBS || 2);
let active = 0;
const waiting = [];
async function acquire() {
  if (active < MAX_HEAVY) { active++; return; }
  await new Promise((r) => waiting.push(r));
}
function release() {
  const next = waiting.shift();
  if (next) next(); else active--;
}

const CONVERTED_DIR = path.join(__dirname, "..", "converted");

async function run(cmd, args, opts = {}) {
  if (!HEAVY.has(cmd)) return runNow(cmd, args, opts);
  await acquire();
  try { return await runNow(cmd, args, opts); } finally { release(); }
}
function runNow(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 120000, ...opts }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve({ stdout, stderr });
    });
  });
}

async function convertImage(inputPath, outputPath, targetFormat, opts = {}) {
  const fmt = targetFormat.toLowerCase() === "jpg" ? "jpeg" : targetFormat.toLowerCase();
  const quality = Math.min(95, Math.max(40, Number(opts.quality) || 80));
  const width = Number(opts.width) || 0;
  let pipeline = sharp(inputPath, { animated: fmt === "gif" }).rotate();
  if (width > 0) pipeline = pipeline.resize({ width, withoutEnlargement: true });
  if (fmt === "jpeg") pipeline = pipeline.flatten({ background: "#ffffff" });
  const formatOpts = fmt === "jpeg" || fmt === "webp" || fmt === "avif" ? { quality } : {};
  await pipeline.toFormat(fmt, formatOpts).toFile(outputPath);
  return outputPath;
}

async function imagesToPdf(inputPaths, outputPath) {
  const pdf = await PDFDocument.create();
  for (const p of inputPaths) {
    const buf = await fs.readFile(p);
    let img;
    try { img = await pdf.embedJpg(buf); } catch {
      try { img = await pdf.embedPng(buf); } catch {
        const png = await sharp(p).png().toBuffer();
        img = await pdf.embedPng(png);
      }
    }
    const page = pdf.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
  await fs.writeFile(outputPath, await pdf.save());
  return outputPath;
}

async function pdfToImages(inputPath, outDir, format) {
  const fmt = format === "png" ? "png" : "jpeg";
  const prefix = path.join(outDir, "page");
  await run("pdftoppm", ["-" + (fmt === "png" ? "png" : "jpeg"), inputPath, prefix]);
  const files = (await fs.readdir(outDir)).filter((f) => f.startsWith("page")).sort();
  if (!files.length) throw new Error("No pages");
  if (files.length === 1) {
    return { path: path.join(outDir, files[0]), name: "page." + (fmt === "png" ? "png" : "jpg") };
  }
  const archiver = require("archiver");
  const zipPath = path.join(outDir, "pages.zip");
  await new Promise((resolve, reject) => {
    const output = require("fs").createWriteStream(zipPath);
    const archive = archiver("zip");
    output.on("close", resolve);
    archive.on("error", reject);
    archive.pipe(output);
    for (const f of files) archive.file(path.join(outDir, f), { name: f });
    archive.finalize();
  });
  return { path: zipPath, name: "pages.zip" };
}

async function officeConvert(inputPath, outDir, target) {
  await run("soffice", ["--headless", "--convert-to", target, "--outdir", outDir, inputPath]);
  const base = path.basename(inputPath, path.extname(inputPath));
  const out = path.join(outDir, base + "." + target);
  await fs.access(out);
  return { path: out, name: base + "." + target };
}

async function mergePdfs(inputPaths, outputPath) {
  const out = await PDFDocument.create();
  for (const p of inputPaths) {
    const bytes = await fs.readFile(p);
    const doc = await PDFDocument.load(bytes);
    const pages = await out.copyPages(doc, doc.getPageIndices());
    pages.forEach((pg) => out.addPage(pg));
  }
  await fs.writeFile(outputPath, await out.save());
  return outputPath;
}

async function splitPdf(inputPath, ranges, outDir) {
  const bytes = await fs.readFile(inputPath);
  const doc = await PDFDocument.load(bytes);
  const total = doc.getPageCount();
  const parts = [];
  if (!ranges || !String(ranges).trim()) {
    for (let i = 0; i < total; i++) {
      const out = await PDFDocument.create();
      const [pg] = await out.copyPages(doc, [i]);
      out.addPage(pg);
      const fp = path.join(outDir, `page-${i + 1}.pdf`);
      await fs.writeFile(fp, await out.save());
      parts.push(fp);
    }
  } else {
    const chunks = String(ranges).split(",").map((s) => s.trim()).filter(Boolean);
    let n = 0;
    for (const chunk of chunks) {
      const m = chunk.match(/^(\d+)(?:-(\d+))?$/);
      if (!m) continue;
      const a = Math.max(1, parseInt(m[1], 10));
      const b = m[2] ? parseInt(m[2], 10) : a;
      const idxs = [];
      for (let i = a; i <= b && i <= total; i++) idxs.push(i - 1);
      if (!idxs.length) continue;
      const out = await PDFDocument.create();
      const pages = await out.copyPages(doc, idxs);
      pages.forEach((pg) => out.addPage(pg));
      const fp = path.join(outDir, `part-${++n}.pdf`);
      await fs.writeFile(fp, await out.save());
      parts.push(fp);
    }
  }
  if (!parts.length) throw new Error("No pages to split");
  if (parts.length === 1) return { path: parts[0], name: path.basename(parts[0]) };
  const archiver = require("archiver");
  const zipPath = path.join(outDir, "split.zip");
  await new Promise((resolve, reject) => {
    const output = require("fs").createWriteStream(zipPath);
    const archive = archiver("zip");
    output.on("close", resolve);
    archive.on("error", reject);
    archive.pipe(output);
    for (const f of parts) archive.file(f, { name: path.basename(f) });
    archive.finalize();
  });
  return { path: zipPath, name: "split.zip" };
}

async function compressPdfFile(inputPath, outputPath) {
  try {
    await run("gs", ["-sDEVICE=pdfwrite", "-dCompatibilityLevel=1.4", "-dPDFSETTINGS=/ebook", "-dNOPAUSE", "-dQUIET", "-dBATCH", "-sOutputFile=" + outputPath, inputPath]);
  } catch {
    await fs.copyFile(inputPath, outputPath);
  }
  return outputPath;
}

async function neverGrow(originalPath, candidatePath) {
  const [orig, candidate] = await Promise.all([fs.stat(originalPath), fs.stat(candidatePath)]);
  if (candidate.size >= orig.size) await fs.copyFile(originalPath, candidatePath);
  return candidatePath;
}

const IMAGE_COMPRESS_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".tiff", ".tif", ".webp"]);

async function compressImageFile(inputPath, outputPath, ext = path.extname(outputPath)) {
  const e = (ext || "").toLowerCase();
  if (e === ".jpg" || e === ".jpeg") {
    await fs.copyFile(inputPath, outputPath);
    try { await run("jpegoptim", ["--strip-all", "--quiet", outputPath]); }
    catch { await sharp(inputPath).jpeg({ quality: 80, mozjpeg: true }).toFile(outputPath); }
  } else if (e === ".png") {
    await sharp(inputPath).png({ compressionLevel: 9, effort: 10, palette: false }).toFile(outputPath);
  } else if (e === ".gif") {
    await sharp(inputPath, { animated: true }).gif().toFile(outputPath);
  } else if (e === ".tiff" || e === ".tif") {
    await sharp(inputPath, { pages: -1 }).tiff({ compression: "lzw" }).toFile(outputPath);
  } else if (e === ".webp") {
    await sharp(inputPath).webp({ quality: 80 }).toFile(outputPath);
  } else {
    throw new Error("فشرده‌سازی این فرمت تصویر پشتیبانی نمی‌شود.");
  }
  return neverGrow(inputPath, outputPath);
}

async function compressOfficeDocFile(inputPath, outDir, ext) {
  const workDir = path.join(outDir, "extract-" + randomUUID().slice(0, 6));
  await fs.mkdir(workDir, { recursive: true });
  try {
    await run("unzip", ["-q", "-o", path.resolve(inputPath), "-d", workDir]);
  } catch (e) {
    if (/password|central-directory|zipfile/i.test(e.message)) {
      throw new Error("این فایل آفیس رمز دارد یا معتبر نیست. اول رمز را بردارید.");
    }
    throw e;
  }
  for (const rel of ["word/media", "xl/media", "ppt/media"]) {
    const dir = path.join(workDir, rel);
    let entries;
    try { entries = await fs.readdir(dir); } catch { continue; }
    for (const name of entries) {
      const mediaExt = path.extname(name).toLowerCase();
      if (!IMAGE_COMPRESS_EXTS.has(mediaExt) || mediaExt === ".gif") continue;
      const filePath = path.join(dir, name);
      const tmpOut = filePath + ".tmp";
      try {
        await compressImageFile(filePath, tmpOut, mediaExt);
        const [before, after] = await Promise.all([fs.stat(filePath), fs.stat(tmpOut)]);
        if (after.size < before.size) await fs.rename(tmpOut, filePath);
        else await fs.unlink(tmpOut).catch(() => {});
      } catch { await fs.unlink(tmpOut).catch(() => {}); }
    }
  }
  const outPath = path.join(outDir, `compressed.${ext}`);
  await run("zip", ["-q", "-r", "-X", "-9", outPath, "."], { cwd: workDir });
  return neverGrow(path.resolve(inputPath), outPath);
}

async function compressVideoFile(inputPath, outputPath) {
  await run("ffmpeg", [
    "-y", "-hide_banner", "-loglevel", "error", "-i", inputPath,
    "-c:v", "libx264", "-preset", "slow", "-crf", "18",
    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", outputPath,
  ], { timeout: 30 * 60 * 1000, maxBuffer: 20 * 1024 * 1024 });
  return neverGrow(inputPath, outputPath);
}

async function compressFile(file, outDir) {
  const ext = path.extname(file.originalname || file.path).toLowerCase();
  const id = randomUUID().slice(0, 8);
  if (ext === ".pdf") {
    const out = path.join(outDir, `compressed-${id}.pdf`);
    try {
      await run("qpdf", ["--compress-streams=y", "--object-streams=generate", "--recompress-flate", "--compression-level=9", file.path, out]);
      await neverGrow(file.path, out);
    } catch {
      await compressPdfFile(file.path, out);
    }
    return { path: out, name: "compressed.pdf" };
  }
  if (IMAGE_COMPRESS_EXTS.has(ext)) {
    const outExt = ext === ".jpeg" ? ".jpg" : ext;
    const out = path.join(outDir, `compressed-${id}${outExt}`);
    await compressImageFile(file.path, out, ext);
    return { path: out, name: "compressed" + outExt };
  }
  if ([".docx", ".xlsx", ".pptx"].includes(ext)) {
    const out = await compressOfficeDocFile(file.path, outDir, ext.slice(1));
    return { path: out, name: "compressed" + ext };
  }
  if ([".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v"].includes(ext)) {
    const out = path.join(outDir, `compressed-${id}.mp4`);
    await compressVideoFile(file.path, out);
    return { path: out, name: "compressed.mp4" };
  }
  throw new Error("این نوع فایل برای فشرده‌سازی پشتیبانی نمی‌شود. JPG، PNG، GIF، TIFF، PDF، DOCX، XLSX، PPTX و ویدیو.");
}

// High-level helpers used by routes
async function convertImageFiles(files, target, outDir, opts = {}) {
  const outs = [];
  for (const f of files) {
    const out = path.join(outDir, randomUUID().slice(0, 8) + "." + (target === "jpg" ? "jpg" : target));
    await convertImage(f.path, out, target, opts);
    outs.push(out);
  }
  if (outs.length === 1) return { path: outs[0], name: path.basename(outs[0]) };
  const archiver = require("archiver");
  const zipPath = path.join(outDir, "images.zip");
  await new Promise((resolve, reject) => {
    const output = require("fs").createWriteStream(zipPath);
    const archive = archiver("zip");
    output.on("close", resolve);
    archive.on("error", reject);
    archive.pipe(output);
    for (const f of outs) archive.file(f, { name: path.basename(f) });
    archive.finalize();
  });
  return { path: zipPath, name: "images.zip" };
}


// PDF -> DOCX via pdf2docx, with LibreOffice fallback. Keeps Persian text logical.
async function pdfToDocxSmart(inputPath, outDir) {
  const base = path.basename(inputPath, path.extname(inputPath));
  const outPath = path.join(outDir, `${base}.docx`);
  const scriptPath = path.join(__dirname, "pdf2docx_convert.py");
  try {
    await run("python3", [scriptPath, inputPath, outPath], { timeout: 180000 });
    await fs.access(outPath);
    return outPath;
  } catch (e) {
    return officeConvert(inputPath, outDir, "docx");
  }
}


async function compressToTarget(inputPath, outDir, ext, targetKb) {
  const target = targetKb * 1024;
  const e = ext.toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp"].includes(e)) {
    const outPath = path.join(outDir, "compressed.jpg");
    const meta = await sharp(inputPath).metadata();
    let width = meta.width || 4000;
    for (let round = 0; round < 8; round++) {
      let lo = 25, hi = 92, best = null;
      while (lo <= hi) {
        const q = (lo + hi) >> 1;
        const buf = await sharp(inputPath).rotate().resize({ width, withoutEnlargement: true })
          .flatten({ background: "#ffffff" }).jpeg({ quality: q, mozjpeg: true }).toBuffer();
        if (buf.length <= target) { best = buf; lo = q + 1; } else hi = q - 1;
      }
      if (best) { await fs.writeFile(outPath, best); return { outPath, met: true }; }
      width = Math.round(width * 0.8);
    }
    await sharp(inputPath).rotate().resize({ width: Math.max(width, 200) })
      .flatten({ background: "#ffffff" }).jpeg({ quality: 25, mozjpeg: true }).toFile(outPath);
    return { outPath, met: (await fs.stat(outPath)).size <= target };
  }
  if (e === ".pdf") {
    const outPath = path.join(outDir, "compressed.pdf");
    let smallest = null;
    for (const dpi of [200, 150, 110, 80, 60, 45]) {
      const tmp = path.join(outDir, `try-${dpi}.pdf`);
      await run("gs", [
        "-sDEVICE=pdfwrite", "-dCompatibilityLevel=1.5", "-dNOPAUSE", "-dQUIET", "-dBATCH",
        "-dDownsampleColorImages=true", `-dColorImageResolution=${dpi}`,
        "-dDownsampleGrayImages=true", `-dGrayImageResolution=${dpi}`,
        "-dDownsampleMonoImages=true", `-dMonoImageResolution=${Math.max(dpi, 150)}`,
        `-sOutputFile=${tmp}`, inputPath,
      ], { timeout: 300000 });
      const size = (await fs.stat(tmp)).size;
      if (!smallest || size < smallest.size) smallest = { tmp, size };
      if (size <= target) { await fs.copyFile(tmp, outPath); return { outPath, met: true }; }
    }
    await fs.copyFile(smallest.tmp, outPath);
    return { outPath, met: false };
  }
  throw new Error("اندازه مشخص فقط برای PDF، JPG، PNG و WEBP است.");
}

module.exports = {
  compressToTarget,
  pdfToDocxSmart,
  convertImage,
  convertImageFiles,
  imagesToPdf,
  pdfToImages,
  officeConvert,
  mergePdfs,
  splitPdf,
  compressPdfFile,
  compressImageFile,
  compressFile,
  CONVERTED_DIR,
};
