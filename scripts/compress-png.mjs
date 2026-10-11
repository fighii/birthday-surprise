// Kompres PNG transparan (background tetap hilang / alpha dipertahankan) hingga < batas ukuran.
//
// Pemakaian (dari folder proyek):
//   npm i -D sharp                                   (sekali saja)
//   node scripts/compress-png.mjs                    -> proses semua .png di src/assets, hasil ke src/assets/_optimized
//   node scripts/compress-png.mjs src/assets/egg     -> folder / file tertentu
//   node scripts/compress-png.mjs --inplace          -> timpa file asli (asli dicadangkan di _originals)
//   node scripts/compress-png.mjs --max=80 --dim=900 -> batas 80 KB, sisi terpanjang maks 900 px
//
// Opsi:
//   --max=100   batas ukuran file (KB)           default 100
//   --dim=1000  sisi terpanjang maksimum (px)    default 1000
//   --min-dim=360  ukuran terkecil yang boleh dicoba   default 360
//   --inplace   timpa file asli (cadangan ke folder _originals di samping file)

import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);
const flag = (name, def) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : def;
};
const has = (name) => args.includes(`--${name}`);

const MAX_BYTES = Number(flag("max", 100)) * 1024;
const MAX_DIM = Number(flag("dim", 1000));
const MIN_DIM = Number(flag("min-dim", 360));
const INPLACE = has("inplace");
const target = args.find((a) => !a.startsWith("--")) ?? "src/assets";

const SKIP_DIRS = new Set(["_optimized", "_originals", "node_modules"]);
const COLOR_STEPS = [256, 128, 64]; // dicoba berurutan di tiap ukuran; kecilkan ukuran dulu sebelum warna terlalu sedikit

async function listPngs(p) {
  const st = await fs.stat(p);
  if (st.isFile()) return /\.png$/i.test(p) ? [p] : [];
  const out = [];
  for (const e of await fs.readdir(p, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) out.push(...(await listPngs(path.join(p, e.name))));
    } else if (/\.png$/i.test(e.name)) {
      out.push(path.join(p, e.name));
    }
  }
  return out;
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

const encode = (img, colors, effort) =>
  img.clone().png({ palette: true, colors, quality: 90, effort, compressionLevel: 9, dither: 0.6 }).toBuffer();

// Coba dari kualitas tertinggi: pertahankan dimensi dulu (256 -> 128 -> 64 warna);
// kalau masih besar, kecilkan dimensi 10% lalu ulangi. Percobaan cepat (effort rendah),
// hasil yang lolos di-encode ulang dengan effort maksimal supaya makin kecil.
async function compress(file) {
  const input = await fs.readFile(file);
  const meta = await sharp(input).metadata();
  const longest = Math.max(meta.width ?? 1, meta.height ?? 1);
  let dim = Math.min(longest, MAX_DIM);
  let best = null;

  while (true) {
    const base = sharp(input)
      .ensureAlpha() // pastikan kanal alpha ada -> transparansi tetap
      .resize({ width: dim, height: dim, fit: "inside", withoutEnlargement: true });
    for (const colors of COLOR_STEPS) {
      let buf = await encode(base, colors, 4);
      if (!best || buf.length < best.buf.length) best = { buf, dim, colors };
      if (buf.length <= MAX_BYTES) {
        const final = await encode(base, colors, 10);
        if (final.length < buf.length) buf = final;
        return { buf, dim, colors, ok: true };
      }
    }
    if (dim <= MIN_DIM) break;
    dim = Math.max(MIN_DIM, Math.round(dim * 0.9));
  }
  return { ...best, ok: false };
}

const files = await listPngs(target);
if (files.length === 0) {
  console.log(`Tidak ada file .png di "${target}".`);
  process.exit(0);
}

let before = 0;
let after = 0;
for (const file of files) {
  const orig = await fs.stat(file);
  const res = await compress(file);
  const dir = path.dirname(file);

  let outPath;
  if (INPLACE) {
    const backupDir = path.join(dir, "_originals");
    await fs.mkdir(backupDir, { recursive: true });
    const backup = path.join(backupDir, path.basename(file));
    try {
      await fs.access(backup); // jangan timpa cadangan yang sudah ada
    } catch {
      await fs.copyFile(file, backup);
    }
    outPath = file;
  } else {
    const outDir = path.join(dir, "_optimized");
    await fs.mkdir(outDir, { recursive: true });
    outPath = path.join(outDir, path.basename(file));
  }
  await fs.writeFile(outPath, res.buf);

  before += orig.size;
  after += res.buf.length;
  console.log(
    `${res.ok ? "OK  " : "BESAR"} ${path.basename(file)}: ${kb(orig.size)} -> ${kb(res.buf.length)} (sisi ${res.dim}px, ${res.colors} warna)` +
      (res.ok ? "" : `  <- belum < ${MAX_BYTES / 1024} KB, coba --dim lebih kecil`),
  );
}
console.log(`\nTotal: ${kb(before)} -> ${kb(after)} untuk ${files.length} file.`);
console.log(INPLACE ? "File asli dicadangkan di folder _originals." : "Hasil ada di folder _optimized (asli tidak diubah).");
