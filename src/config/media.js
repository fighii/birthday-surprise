// ==========================================
// MEDIA CONFIG
// ==========================================
// Tambahkan path media Anda di sini.
// Jangan lupa masukkan file ke folder:
//   /assets/photos/
//   /assets/videos/
//   /assets/music/
//
// Contoh:
// "/assets/photos/photo01.jpg"
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
// 1. FOTO KHUSUS SCENE 2 POLAROID STACK (30 foto)
// ------------------------------
export const polaroidPhotos = [
  "/assets/photos/photo01.jpg",
  "/assets/photos/photo02.jpg",
  "/assets/photos/photo03.jpg",
  // "/assets/photos/photo04.jpg",
  // "/assets/photos/photo05.jpg",
  // "/assets/photos/photo06.jpg",
  // "/assets/photos/photo07.jpg",
  // "/assets/photos/photo08.jpg",
  // "/assets/photos/photo09.jpg",
  // "/assets/photos/photo10.jpg",
  // "/assets/photos/photo11.jpg",
  // "/assets/photos/photo12.jpg",
  // "/assets/photos/photo13.jpg",
  // "/assets/photos/photo14.jpg",
  // "/assets/photos/photo15.jpg",
  // "/assets/photos/photo16.jpg",
  // "/assets/photos/photo17.jpg",
  // "/assets/photos/photo18.jpg",
  // "/assets/photos/photo19.jpg",
  // "/assets/photos/photo20.jpg",
  // "/assets/photos/photo21.jpg",
  // "/assets/photos/photo22.jpg",
  // "/assets/photos/photo23.jpg",
  // "/assets/photos/photo24.jpg",
  // "/assets/photos/photo25.jpg",
  // "/assets/photos/photo26.jpg",
  // "/assets/photos/photo27.jpg",
  // "/assets/photos/photo28.jpg",
  // "/assets/photos/photo29.jpg",
  // "/assets/photos/photo30.jpg",
];

// ------------------------------
// 2. FOTO KHUSUS SCENE 3 FIRST MEMORY (1 foto spesial)
// ------------------------------
// Isi dengan HANYA 1 FOTO (array index 0) — misal foto pertama ketemu / first date.
// Contoh: ["/assets/photos/first-date.jpg"]
export const firstMemoryPhoto = [
  // "/assets/photos/first-memory.jpg",
];

// ------------------------------
// 3. FOTO KHUSUS SCENE 4 IG PHOTO STORY (tap left/right, auto-advance 5s)
// ------------------------------
export const photoStoryPhotos = [
  "/assets/photos/story01.jpg",
  "/assets/photos/story02.jpg",
  // "/assets/photos/story03.jpg",
  // "/assets/photos/story04.jpg",
  // "/assets/photos/story05.jpg",
];

// ------------------------------
// 4. FOTO KHUSUS SCENE 5 TIMELINE (5 foto = 5 tahap kenangan)
// ------------------------------
// Urutan: pertama ketemu → pertama chat → first date → anniversary → terbaru.
export const timelinePhotos = [
  // "/assets/photos/tl-pertama-ketemu.jpg",
  // "/assets/photos/tl-pertama-chat.jpg",
  // "/assets/photos/tl-first-date.jpg",
  // "/assets/photos/tl-anniversary.jpg",
  // "/assets/photos/tl-terbaru.jpg",
];

// ------------------------------
// FALLBACK: photos (array umum, jika scene-spesifik array KOSONG)
// ------------------------------
export const photos = [
  "/assets/photos/photo01.jpg",
  "/assets/photos/photo02.jpg",
  "/assets/photos/photo03.jpg",
  // "/assets/photos/photo04.jpg",
  // "/assets/photos/photo05.jpg",
  // "/assets/photos/photo06.jpg",
  // "/assets/photos/photo07.jpg",
  // "/assets/photos/photo08.jpg",
  // "/assets/photos/photo09.jpg",
  // "/assets/photos/photo10.jpg",
  // "/assets/photos/photo11.jpg",
  // "/assets/photos/photo12.jpg",
  // "/assets/photos/photo13.jpg",
  // "/assets/photos/photo14.jpg",
  // "/assets/photos/photo15.jpg",
  // "/assets/photos/photo16.jpg",
  // "/assets/photos/photo17.jpg",
  // "/assets/photos/photo18.jpg",
  // "/assets/photos/photo19.jpg",
  // "/assets/photos/photo20.jpg",
  // "/assets/photos/photo21.jpg",
  // "/assets/photos/photo22.jpg",
  // "/assets/photos/photo23.jpg",
  // "/assets/photos/photo24.jpg",
  // "/assets/photos/photo25.jpg",
  // "/assets/photos/photo26.jpg",
  // "/assets/photos/photo27.jpg",
  // "/assets/photos/photo28.jpg",
  // "/assets/photos/photo29.jpg",
  // "/assets/photos/photo30.jpg",
];

export const videos = [
  "/assets/videos/video01-compressed.mp4",
];

//export const music = null;
// Jika ingin pakai musik:
export const music = {
  src: "/assets/music/our-song.mp3",
  title: "Our Song",
};
