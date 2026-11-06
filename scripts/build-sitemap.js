#!/usr/bin/env node
/* sitemap.xml با lastmod از git. مسیرهای ادغام‌شده و تکراری حذف می‌شوند. */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.join(__dirname, "..");
const origin = "https://abzarbook.ir";
const skip = new Set([
  "404.html",
  "convert/guides/how-to-reduce-pdf-size-for-email.html",
  "convert/guides/compress-pdf-without-losing-quality.html",
]);

function walk(dir, acc) {
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === "scripts") continue;
    const abs = path.join(dir, name);
    const rel = path.relative(root, abs).split(path.sep).join("/");
    const st = fs.statSync(abs);
    if (st.isDirectory()) walk(abs, acc);
    else if (name.endsWith(".html")) acc.push(rel);
  }
  return acc;
}

function gitDate(rel) {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cs", "--", rel], {
      cwd: root,
      encoding: "utf8",
    }).trim();
    return out || null;
  } catch {
    return null;
  }
}

function locFor(rel) {
  if (rel === "index.html") return origin + "/";
  if (rel.endsWith("/index.html")) return origin + "/" + rel.slice(0, -"index.html".length);
  return origin + "/" + rel;
}

const oldXml = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
const oldMeta = new Map();
for (const block of oldXml.split("<url>").slice(1)) {
  const loc = (block.match(/<loc>([^<]+)<\/loc>/) || [])[1];
  const cf = (block.match(/<changefreq>([^<]+)<\/changefreq>/) || [])[1] || "weekly";
  const pr = (block.match(/<priority>([^<]+)<\/priority>/) || [])[1] || "0.6";
  if (loc && !oldMeta.has(loc)) oldMeta.set(loc, { cf, pr });
}

const files = walk(root, []).filter((rel) => !skip.has(rel)).sort();
const seen = new Set();
const urls = [];
for (const rel of files) {
  const loc = locFor(rel);
  if (seen.has(loc)) continue;
  seen.add(loc);
  const dirty = execFileSync("git", ["status", "--porcelain", "--", rel], { cwd: root, encoding: "utf8" }).trim();
  const lastmod = dirty ? "2026-11-06" : (gitDate(rel) || "2026-11-06");
  const meta = oldMeta.get(loc) || (
    rel.startsWith("convert/guides/") ? { cf: "monthly", pr: "0.6" } :
    rel.startsWith("convert/compress/") ? { cf: "monthly", pr: "0.7" } :
    rel.startsWith("convert/pages/") ? { cf: "yearly", pr: "0.3" } :
    rel.startsWith("convert/") ? { cf: "weekly", pr: "0.85" } :
    rel === "index.html" ? { cf: "daily", pr: "1.0" } :
    { cf: "weekly", pr: "0.8" }
  );
  urls.push({ loc, lastmod, ...meta });
}

urls.sort((a, b) => a.loc.localeCompare(b.loc));
const body = urls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.cf}</changefreq>
    <priority>${u.pr}</priority>
  </url>`).join("\n");
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
fs.writeFileSync(path.join(root, "sitemap.xml"), xml);
const locs = urls.map((u) => u.loc);
const dup = locs.filter((l, i) => locs.indexOf(l) !== i);
console.log("urls", urls.length, "dups", dup.length);
console.log("guides/", locs.filter((l) => l.endsWith("/convert/guides/")).length);
console.log("compress/", locs.filter((l) => l.endsWith("/convert/compress/")).length);
console.log("new", locs.filter((l) => /eydi-1405|sanavat|maliat-hoghoogh|hoghoogh-khales|tabdil-rahn|ghest-vam-ezdevaj|saghf-ejare/.test(l)).join("\n"));
