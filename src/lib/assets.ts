// Helper path aset: aman untuk GitHub Pages (base path) dan toleran huruf besar/kecil ekstensi.
const BASE: string = (((import.meta as any).env?.BASE_URL as string) ?? "/") || "/";

const isExternal = (p: string) => /^(https?:|data:|blob:)/i.test(p);

export function assetUrl(p: string): string {
  if (!p || isExternal(p)) return p;
  const base = BASE.endsWith("/") ? BASE : BASE + "/";
  if (base !== "/" && p.startsWith(base)) return p;
  return base + p.replace(/^\/+/, "");
}

const EXT_GROUPS = [
  ["jpg", "JPG", "jpeg", "JPEG"],
  ["png", "PNG"],
  ["webp", "WEBP"],
];

/** Daftar kandidat URL: path asli dulu, lalu variasi ekstensi (.JPG/.jpg/.jpeg/...). */
export function srcCandidates(p: string): string[] {
  if (!p) return [];
  if (isExternal(p)) return [p];
  const out = [assetUrl(p)];
  const m = p.match(/^(.*)\.([A-Za-z0-9]+)$/);
  if (m) {
    const stem = m[1];
    const ext = m[2].toLowerCase();
    const group = EXT_GROUPS.find((g) => g.some((e) => e.toLowerCase() === ext));
    group?.forEach((e) => out.push(assetUrl(`${stem}.${e}`)));
  }
  return Array.from(new Set(out));
}
