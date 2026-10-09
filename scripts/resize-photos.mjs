// Mengecilkan foto untuk web (aman untuk Safari iPhone).
// Pakai:  node scripts/resize-photos.mjs [folderAsal] [folderHasil] [sisiPanjangMaks]
// Contoh: node scripts/resize-photos.mjs assets/photos public/assets/photos 1200
// Nama file & ekstensi TIDAK diubah, jadi path di media.js tetap valid.
import { readdirSync, mkdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { spawnSync } from "node:child_process";

const SRC = process.argv[2] ?? "assets/photos";
const OUT = process.argv[3] ?? "assets/photos-small";
const MAX = Number(process.argv[4] ?? 1200);

let ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";
if (!process.env.FFMPEG_PATH) {
  try {
    ffmpegPath = (await import("@ffmpeg-installer/ffmpeg")).default.path;
  } catch {
    /* pakai ffmpeg dari PATH */
  }
}

const EXT = new Set([".jpg", ".jpeg", ".png"]);
mkdirSync(OUT, { recursive: true });

let before = 0;
let after = 0;
let count = 0;
for (const name of readdirSync(SRC)) {
  const ext = extname(name).toLowerCase();
  if (!EXT.has(ext)) {
    console.log("lewati (bukan jpg/png):", name);
    continue;
  }
  const inp = join(SRC, name);
  const out = join(OUT, name);
  const args = [
    "-v", "error", "-y", "-i", inp,
    "-vf", `scale='min(${MAX},iw)':'min(${MAX},ih)':force_original_aspect_ratio=decrease`,
    ...(ext === ".png" ? [] : ["-q:v", "4"]),
    "-frames:v", "1", out,
  ];
  const r = spawnSync(ffmpegPath, args, { encoding: "utf8" });
  if (r.status !== 0) {
    console.log("GAGAL:", name, (r.stderr || "").trim().split("\n")[0]);
    continue;
  }
  const a = statSync(inp).size;
  const b = statSync(out).size;
  before += a;
  after += b;
  count++;
  console.log(`${name}: ${(a / 1024).toFixed(0)}KB -> ${(b / 1024).toFixed(0)}KB`);
}
console.log(`\nSelesai ${count} file: ${(before / 1048576).toFixed(1)}MB -> ${(after / 1048576).toFixed(1)}MB (hasil di ${OUT})`);
