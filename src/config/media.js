// ==========================================
// MEDIA CONFIG
// ==========================================
// Taruh file di folder public/assets/{photos,videos,music}/ dan tulis path-nya di sini
// (diawali "/assets/..."). Nama file CASE-SENSITIVE di GitHub Pages.
//
// Foto per scene:
//   polaroidPhotos   -> Polaroid stack (30 foto)
//   firstMemoryPhoto -> First Memory (1 foto)
//   photoStoryPhotos -> Photo Story (berurutan)
//   timelinePhotos   -> Timeline (1 per tahap)
// Jika array scene kosong, dipakai array `photos` (fallback umum).
// ==========================================
 
// ------------------------------
// 1. FOTO KHUSUS SCENE 2 POLAROID STACK (30 foto — pakai 30 foto pertama list alfabetis)
// ------------------------------
export const polaroidPhotos = [
  "/assets/photos/polaroidStack/photo01.jpeg",
  "/assets/photos/polaroidStack/photo02.jpeg",
  "/assets/photos/polaroidStack/photo03.jpeg",
  "/assets/photos/polaroidStack/photo04.jpeg",
  "/assets/photos/polaroidStack/photo05.jpeg",
  "/assets/photos/polaroidStack/photo06.jpeg",
  "/assets/photos/polaroidStack/photo07.jpeg",
  "/assets/photos/polaroidStack/photo08.jpeg",
  "/assets/photos/polaroidStack/photo09.jpeg",
  "/assets/photos/polaroidStack/photo10.jpeg",
  "/assets/photos/polaroidStack/photo11.jpeg",
  "/assets/photos/polaroidStack/photo12.jpeg",
  "/assets/photos/polaroidStack/photo13.jpeg",
  "/assets/photos/polaroidStack/photo14.jpeg",
  "/assets/photos/polaroidStack/photo15.jpeg",
  "/assets/photos/polaroidStack/photo16.jpeg",
  "/assets/photos/polaroidStack/photo17.jpeg",
  "/assets/photos/polaroidStack/photo18.jpeg",
  "/assets/photos/polaroidStack/photo19.jpeg",
  "/assets/photos/polaroidStack/photo20.jpeg",
  "/assets/photos/polaroidStack/photo21.jpeg",
  "/assets/photos/polaroidStack/photo22.jpeg",
  "/assets/photos/polaroidStack/photo23.jpeg",
  "/assets/photos/polaroidStack/photo24.jpeg",
  "/assets/photos/polaroidStack/photo25.jpeg",
  "/assets/photos/polaroidStack/photo26.jpeg",
  "/assets/photos/polaroidStack/photo27.jpeg",
  "/assets/photos/polaroidStack/photo28.jpeg",
  "/assets/photos/polaroidStack/photo29.jpeg",
  "/assets/photos/polaroidStack/photo30.jpeg",
];
 
// ------------------------------
// 2. FOTO KHUSUS SCENE 3 FIRST MEMORY (1 foto spesial)
// ------------------------------
// Pakai foto PALING SPESIAL (pertama ketemu / first date)
// Default: pakai IMG_4142.JPG (pertama alfabetis IMG_ foto pertama Anda; bisa ganti kapan saja)
export const firstMemoryPhoto = [
  "/assets/photos/firstMemory/firstmemoryphoto.jpeg",
];
 
// ------------------------------
// 3. FOTO KHUSUS SCENE 4 IG PHOTO STORY (tap left/right, auto-advance 5s)
// ------------------------------
// Pilih 8 foto terbaru untuk story style
export const photoStoryPhotos = [
  "/assets/photos/photoStory/photostory01.jpeg",
  "/assets/photos/photoStory/photostory02.jpeg",
  "/assets/photos/photoStory/photostory03.jpeg",
  "/assets/photos/photoStory/photostory04.jpeg",
  "/assets/photos/photoStory/photostory05.jpeg",
  "/assets/photos/photoStory/photostory06.jpeg",
  "/assets/photos/photoStory/photostory07.jpeg",
  "/assets/photos/photoStory/photostory08.jpeg",
  "/assets/photos/photoStory/photostory09.jpeg",
  "/assets/photos/photoStory/photostory10.jpeg",
];
 
// ------------------------------
// 4. FOTO KHUSUS SCENE 5 TIMELINE (5 foto = 5 tahap kenangan)
// ------------------------------
// Urutan default: 5 foto pertama setiap tahap (Anda bisa ganti kapan saja)
export const timelinePhotos = [
  "/assets/photos/timeline01.JPG",      // Tahap 1: Pertama ketemu
  "/assets/photos/timeline02.JPG",      // Tahap 2: Pertama chat / deketan
  "/assets/photos/timeline03.JPG",      // Tahap 3: First date
  "/assets/photos/timeline04.JPG",      // Tahap 4: Anniversary / kenangan manis
  "/assets/photos/timeline05.JPG",      // Tahap 5: Terbaru (still going strong)
];
 
// ------------------------------
// FALLBACK: photos (array umum, jika scene-spesifik array KOSONG)
// ------------------------------
// Diisi OTOMATIS 63 foto asli (full backup jika salah satu array di atas dihapus / dikosongkan)
export const photos = []; // fallback umum (opsional): isi path foto jika array scene-spesifik kosong
 
export const videos = [
  "/assets/videos/video01.MOV"
];
 
// Musik Anda di folder assets/music/our-song.mp3 (✅ 100% match case)
export const music = {
  src: "/assets/music/our-song.mp3",
  title: "Our Song",
};
 
// ------------------------------
// 5. SCENE BARU: Firework & Wishes (Scene 2 — sebelum Polaroid)
// ------------------------------
// Semua teks wishes & timing bisa diubah DISINI TANPA sentuh kode animasi.
// STRUKTUR BARU: wishes.interval (ms, overlap default 1 detik) + wishes.items[] (per wish ada text + posisi + launch pos)
// BACKWARD COMPATIBLE: masih mendukung format LAMA wishes[] array string & wishInterval number.
export const fireworkConfig = {
  enabled: true,
 
  // Kembang API UTAMA di AWAL scene (sebelum wishes)
  mainBirthday: {
    text: "HAPPY BIRTHDAY",
    launchDuration: 1800,        // ms roket terbang menuju langit
    explosionDelay: 300,          // jeda sebelum state berubah explode → text
    textFormationDuration: 1000,  // ms fase partikel membentuk huruf
    textHoldDuration: 2200,       // ms text bertahan FULLY FORMED sebelum fade
    displayDuration: 2800,        // backward compat = formation + hold kira kira
  },
 
  // WISHES = 1 kembang api per item. TAMBAH / KURANGI array items SESUKA HATI!
  wishes: {
    // 🏁 OVERLAP INTERVAL (ms). 1000 = setiap 1 detik luncurkan 1 wish,
    // TANPA menunggu wish sebelumnya selesai! (natural cinematic fireworks)
    interval: 1500,
 
    // Default animasi per wish (bisa di override di items level future)
    animation: {
      launchDuration: 720,          // ms roket wish naik ke langit
      explosionDelay: 260,          // jeda explode state → converge text
      textFormationDuration: 900,   // ms partikel menyusun huruf
      textHoldDuration: 1800,       // ms text utuh sebelum fade
      fadeDuration: 900,            // ms fade text out
    },
 
    // 6 Default wishes dengan posisi SPREAD (tidak saling menutupi).
    // x dan y = PERSENTASE LEBAR / TINGGI CANVAS (0.0 kiri/atas → 1.0 kanan/bawah)
    // Safe area posisi: y 0.18 ... 0.70, x 0.16 ... 0.84
    items: [
      {
        text: "WISH YOU ALL THE BESTTT",
        position: { x: 0.50, y: 0.22 }, // TENGAH ATAS
        launch:   { x: 0.50, y: 0.95 }  // mulai dari tengah bawah
      },
      {
        text: "SEHAT SELALU",
        position: { x: 0.24, y: 0.40 }, // KIRI TENGAH
        launch:   { x: 0.50, y: 0.95 }
      },
      {
        text: "DIPENUHI CINTA",
        position: { x: 0.76, y: 0.40 }, // KANAN TENGAH
        launch:   { x: 0.50, y: 0.95 }
      },
      {
        text: "SEMOGA SEMUA IMPIANMU TERWUJUD",
        position: { x: 0.50, y: 0.58 }, // TENGAH BAWAH
        launch:   { x: 0.50, y: 0.95 }
      },
      {
        text: "SELALU DIBERIKAN KEBAHAGIAAN",
        position: { x: 0.22, y: 0.72 }, // KIRI BAWAH
        launch:   { x: 0.50, y: 0.95 }
      },
      {
        text: "SEMOGA KITA SELALU BERSAMA",
        position: { x: 0.78, y: 0.72 }, // KANAN BAWAH
        launch:   { x: 0.50, y: 0.95 }
      },
    ],
 
  },
 
  // Kembang api TERAKHIR (SETELAH semua wishes selesai)
  ending: {
    text: "HAPPY BIRTHDAY, MY LOVE",
    duration: 3000,
    launchDuration: 1900,
  },
};
 
// ==========================================
// FOTO TAMBAHAN (BARU) — semua bisa diatur di sini
// ==========================================
// Kosong = tidak ditampilkan. Nama file case-sensitive (sistem juga mencoba .JPG/.jpg/.jpeg otomatis).
// Tips iPhone/Safari: kecilkan foto (maks ±1200px sisi panjang, <400KB) supaya tidak berat/crash.
// Format HEIC TIDAK bisa tampil di browser — ubah ke JPG/PNG.
 
// Foto latar di SISI kiri/kanan scene Timeline (selang-seling, maks 6)
export const timelineSidePhotos = [
  // "/assets/photos/side01.JPG",
  // "/assets/photos/side02.JPG",
  // "/assets/photos/side03.JPG",
  // "/assets/photos/side04.JPG",
];
 
// Foto latar di SISI kiri/kanan scene Love Letter (maks 6)
export const loveLetterSidePhotos = [
 "/assets/photos/egg01.png",
  // "/assets/photos/letter02.JPG",
  // "/assets/photos/letter03.JPG",
  // "/assets/photos/letter04.JPG",
];
 
// Foto di BELAKANG hati pixel (Final Surprise), maks 5.
// Jika kosong, otomatis memakai 3 foto pertama dari polaroidPhotos.
export const finalHeartPhotos = [
  "/assets/photos/heart/heart01.JPG",
  // "/assets/photos/heart02.JPG",
  // "/assets/photos/heart03.JPG",
];
 
// Foto saat EASTER EGG muncul (tap hati 5x). Rekomendasi: 4 PNG cut-out (latar transparan).
// 2 foto di atas teks, 2 foto di bawah teks, saling overlap.
export const easterEggPhotos = [
  "/assets/photos/easterEgg/egg01.png",
  // "/assets/photos/egg02.png",
  // "/assets/photos/egg03.png",
  // "/assets/photos/egg04.png",
];
 
// whiteEdge: true  -> tepi putih ala kertas gunting ditambahkan otomatis di sekeliling bentuk PNG
// whiteEdge: false -> pakai PNG apa adanya (jika PNG kamu sudah punya tepi putih)
export const easterEggPhotoOptions = {
  whiteEdge: true,
  edgePx: 3,
};
 
