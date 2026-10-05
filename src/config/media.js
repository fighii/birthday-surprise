// ==========================================
// MEDIA CONFIG
// ==========================================
// Tambahkan path media Anda di sini.
// Jangan lupa masukkan file ke folder:
//   /assets/photos/
//   /assets/videos/
//   /assets/music/
//
// ⚠️ CASE-SENSITIVE! Ekstensi foto Anda = .JPG (huruf BESAR).
//    Jangan tulis .jpg → GitHub Pages AKAN 404!
//
// FOTO DIPISAH BERDASARKAN SCENE (agar bisa diatur masing-masing):
//   - polaroidPhotos     → Scene 2 Polaroid Montage (30x foto tersebar + stack)
//   - firstMemoryPhoto   → Scene 3 First Memory (1 foto spesial, slow zoom 9s)
//   - photoStoryPhotos   → Scene 4 IG Photo Story (semua foto, berurutan story)
//   - timelinePhotos     → Scene 5 Timeline (5 foto, 1 per tahap kenangan)
//
// FALLBACK: Jika salah satu array KOSONG, sistem akan pakai array `photos` di bawah.
// ==========================================

// ------------------------------
// 1. FOTO KHUSUS SCENE 2 POLAROID STACK (30 foto — pakai 30 foto pertama list alfabetis)
// ------------------------------
export const polaroidPhotos = [
  "/assets/photos/AZRQ4276.JPG",
  "/assets/photos/BUSQ0897.JPG",
  "/assets/photos/CCBZ2708.JPG",
  // "/assets/photos/CIGB7714.JPG",
  // "/assets/photos/EFDQ6684.JPG",
  // "/assets/photos/EGDY8312.JPG",
  // "/assets/photos/FPER2019.JPG",
  // "/assets/photos/GHYK0878.JPG",
  // "/assets/photos/GODD2903.JPG",
  // "/assets/photos/GYCJ4002.JPG",
  // "/assets/photos/HNAO8111.JPG",
  // "/assets/photos/IMG_4142.JPG",
  // "/assets/photos/IMG_4170.JPG",
  // "/assets/photos/IMG_4215.JPG",
  // "/assets/photos/IMG_4219.JPG",
  // "/assets/photos/IMG_4244.JPG",
  // "/assets/photos/IMG_6769.JPG",
  // "/assets/photos/IMG_6770.JPG",
  // "/assets/photos/IMG_7223.JPG",
  // "/assets/photos/IMG_7226.JPG",
  // "/assets/photos/IMG_E4120.JPG",
  // "/assets/photos/IMG_E4143.JPG",
  // "/assets/photos/IMG_E4144.JPG",
  // "/assets/photos/IMG_E4146.JPG",
  // "/assets/photos/IMG_E4149.JPG",
  // "/assets/photos/IMG_E4170.JPG",
  // "/assets/photos/IMG_E4179.JPG",
  // "/assets/photos/IMG_E4181.JPG",
  // "/assets/photos/IMG_E4215.JPG",
  // "/assets/photos/IMG_E4216.JPG",
  // "/assets/photos/IMG_E4219.JPG",
  // "/assets/photos/IMG_E4220.JPG",
  // "/assets/photos/IMG_E4271.JPG",
  // "/assets/photos/IMG_E4275.JPG",
  // "/assets/photos/IMG_E6769.JPG",
  // "/assets/photos/IMG_E6770.JPG",
  // "/assets/photos/IMG_E7226.JPG",
  // "/assets/photos/IMG_E7258.JPG",
  // "/assets/photos/IMG_E7259.JPG",
  // "/assets/photos/IMG_E7268.JPG",
  // "/assets/photos/IMG_E7272.JPG",
  // "/assets/photos/IOJA3145.JPG",
  // "/assets/photos/IOKL4641.JPG",
  // "/assets/photos/JAOF9360.JPG",
  // "/assets/photos/KJUH1172.JPG",
  // "/assets/photos/LJQR7381.JPG",
  // "/assets/photos/LXDC8607.JPG",
  // "/assets/photos/MSNS3324.JPG",
  // "/assets/photos/MZEY1232.JPG",
  // "/assets/photos/photo01.JPG",
  // "/assets/photos/photo02.JPG",
  // "/assets/photos/photo03.JPG",
  // "/assets/photos/RSTV8715.JPG",
  // "/assets/photos/TBEG0155.JPG",
  // "/assets/photos/TLGJ9655.JPG",
  // "/assets/photos/VAGX7686.JPG",
  // "/assets/photos/VBKM0210.JPG",
  // "/assets/photos/VEVG0626.JPG",
  // "/assets/photos/XGZG6390.JPG",
  // "/assets/photos/XIIQ0452.JPG",
  // "/assets/photos/XWTF8228.JPG",
  // "/assets/photos/YCUZ7548.JPG",
];

// ------------------------------
// 2. FOTO KHUSUS SCENE 3 FIRST MEMORY (1 foto spesial)
// ------------------------------
// Pakai foto PALING SPESIAL (pertama ketemu / first date)
// Default: pakai IMG_4142.JPG (pertama alfabetis IMG_ foto pertama Anda; bisa ganti kapan saja)
export const firstMemoryPhoto = [
  "/assets/photos/IMG_4142.JPG",
];

// ------------------------------
// 3. FOTO KHUSUS SCENE 4 IG PHOTO STORY (tap left/right, auto-advance 5s)
// ------------------------------
// Pilih 8 foto terbaru untuk story style
export const photoStoryPhotos = [
  "/assets/photos/photo01.JPG",
  "/assets/photos/photo02.JPG",
  "/assets/photos/photo03.JPG",
  "/assets/photos/IMG_7226.JPG",
  "/assets/photos/IMG_E7226.JPG",
  "/assets/photos/IMG_E7258.JPG",
  "/assets/photos/IMG_E7259.JPG",
  "/assets/photos/YCUZ7548.JPG",
];

// ------------------------------
// 4. FOTO KHUSUS SCENE 5 TIMELINE (5 foto = 5 tahap kenangan)
// ------------------------------
// Urutan default: 5 foto pertama setiap tahap (Anda bisa ganti kapan saja)
export const timelinePhotos = [
  "/assets/photos/IMG_4142.JPG",      // Tahap 1: Pertama ketemu
  "/assets/photos/IMG_4170.JPG",      // Tahap 2: Pertama chat / deketan
  "/assets/photos/IMG_4215.JPG",      // Tahap 3: First date
  "/assets/photos/IMG_6769.JPG",      // Tahap 4: Anniversary / kenangan manis
  "/assets/photos/YCUZ7548.JPG",      // Tahap 5: Terbaru (still going strong)
];

// ------------------------------
// FALLBACK: photos (array umum, jika scene-spesifik array KOSONG)
// ------------------------------
// Diisi OTOMATIS 63 foto asli (full backup jika salah satu array di atas dihapus / dikosongkan)
export const photos = [
  "/assets/photos/AZRQ4276.JPG",
  "/assets/photos/BUSQ0897.JPG",
  "/assets/photos/CCBZ2708.JPG",
  // "/assets/photos/CIGB7714.JPG",
  // "/assets/photos/EFDQ6684.JPG",
  // "/assets/photos/EGDY8312.JPG",
  // "/assets/photos/FPER2019.JPG",
  // "/assets/photos/GHYK0878.JPG",
  // "/assets/photos/GODD2903.JPG",
  // "/assets/photos/GYCJ4002.JPG",
  // "/assets/photos/HNAO8111.JPG",
  // "/assets/photos/IMG_4142.JPG",
  // "/assets/photos/IMG_4170.JPG",
  // "/assets/photos/IMG_4215.JPG",
  // "/assets/photos/IMG_4219.JPG",
  // "/assets/photos/IMG_4244.JPG",
  // "/assets/photos/IMG_6769.JPG",
  // "/assets/photos/IMG_6770.JPG",
  // "/assets/photos/IMG_7223.JPG",
  // "/assets/photos/IMG_7226.JPG",
  // "/assets/photos/IMG_E4120.JPG",
  // "/assets/photos/IMG_E4143.JPG",
  // "/assets/photos/IMG_E4144.JPG",
  // "/assets/photos/IMG_E4146.JPG",
  // "/assets/photos/IMG_E4149.JPG",
  // "/assets/photos/IMG_E4170.JPG",
  // "/assets/photos/IMG_E4179.JPG",
  // "/assets/photos/IMG_E4181.JPG",
  // "/assets/photos/IMG_E4215.JPG",
  // "/assets/photos/IMG_E4216.JPG",
  // "/assets/photos/IMG_E4219.JPG",
  // "/assets/photos/IMG_E4220.JPG",
  // "/assets/photos/IMG_E4271.JPG",
  // "/assets/photos/IMG_E4275.JPG",
  // "/assets/photos/IMG_E6769.JPG",
  // "/assets/photos/IMG_E6770.JPG",
  // "/assets/photos/IMG_E7226.JPG",
  // "/assets/photos/IMG_E7258.JPG",
  // "/assets/photos/IMG_E7259.JPG",
  // "/assets/photos/IMG_E7268.JPG",
  // "/assets/photos/IMG_E7272.JPG",
  // "/assets/photos/IOJA3145.JPG",
  // "/assets/photos/IOKL4641.JPG",
  // "/assets/photos/JAOF9360.JPG",
  // "/assets/photos/KJUH1172.JPG",
  // "/assets/photos/LJQR7381.JPG",
  // "/assets/photos/LXDC8607.JPG",
  // "/assets/photos/MSNS3324.JPG",
  // "/assets/photos/MZEY1232.JPG",
  // "/assets/photos/photo01.JPG",
  // "/assets/photos/photo02.JPG",
  // "/assets/photos/photo03.JPG",
  // "/assets/photos/RSTV8715.JPG",
  // "/assets/photos/TBEG0155.JPG",
  // "/assets/photos/TLGJ9655.JPG",
  // "/assets/photos/VAGX7686.JPG",
  // "/assets/photos/VBKM0210.JPG",
  // "/assets/photos/VEVG0626.JPG",
  // "/assets/photos/XGZG6390.JPG",
  // "/assets/photos/XIIQ0452.JPG",
  // "/assets/photos/XWTF8228.JPG",
  // "/assets/photos/YCUZ7548.JPG",
];

export const videos = [
  "/assets/videos/video01-compressed.mp4",
];

// Musik Anda di folder assets/music/our-song.mp3 (✅ 100% match case)
export const music = {
  src: "/assets/music/our-song.mp3",
  title: "Our Song",
};
