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
  "/assets/photos/photo01.jpeg",
  "/assets/photos/photo02.jpeg",
  "/assets/photos/photo03.jpeg",
  "/assets/photos/photo04.jpeg",
  "/assets/photos/photo05.jpeg",
  "/assets/photos/photo06.jpeg",
  "/assets/photos/photo07.jpeg",
  "/assets/photos/photo08.jpeg",
  "/assets/photos/photo09.jpeg",
  "/assets/photos/photo10.jpeg",
  "/assets/photos/photo11.jpeg",
  "/assets/photos/photo12.jpeg",
  "/assets/photos/photo13.jpeg",
  "/assets/photos/photo14.jpeg",
  "/assets/photos/photo15.jpeg",
  "/assets/photos/photo16.jpeg",
  "/assets/photos/photo17.jpeg",
  "/assets/photos/photo18.jpeg",
  "/assets/photos/photo19.jpeg",
  "/assets/photos/photo20.jpeg",
  "/assets/photos/photo21.jpeg",
  "/assets/photos/photo22.jpeg",
  "/assets/photos/photo23.jpeg",
  "/assets/photos/photo24.jpeg",
  "/assets/photos/photo25.jpeg",
  "/assets/photos/photo26.jpeg",
  "/assets/photos/photo27.jpeg",
  "/assets/photos/photo28.jpeg",
  "/assets/photos/photo29.jpeg",
  "/assets/photos/photo30.jpeg",
];

// ------------------------------
// 2. FOTO KHUSUS SCENE 3 FIRST MEMORY (1 foto spesial)
// ------------------------------
// Pakai foto PALING SPESIAL (pertama ketemu / first date)
// Default: pakai IMG_4142.JPG (pertama alfabetis IMG_ foto pertama Anda; bisa ganti kapan saja)
export const firstMemoryPhoto = [
  "/assets/photos/firstmemoryphoto.JPG",
];

// ------------------------------
// 3. FOTO KHUSUS SCENE 4 IG PHOTO STORY (tap left/right, auto-advance 5s)
// ------------------------------
// Pilih 8 foto terbaru untuk story style
export const photoStoryPhotos = [
  "/assets/photos/photostory01.JPG",
  "/assets/photos/photostory02.JPG",
  "/assets/photos/photostory03.JPG",
  "/assets/photos/photostory04.JPG",
  "/assets/photos/photostory05.JPG",
  "/assets/photos/photostory06.JPG",
  "/assets/photos/photostory07.JPG",
  "/assets/photos/photostory08.JPG",
  "/assets/photos/photostory09.JPG",
  "/assets/photos/photostory10.JPG",
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
export const photos = [
  // "/assets/photos/AZRQ4276.JPG",
  // "/assets/photos/BUSQ0897.JPG",
  // "/assets/photos/CCBZ2708.JPG",
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
  "/assets/videos/video01.mp4",
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
    interval: 1000,

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
        text: "WISH YOU ALL THE BEST",
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

    // ⬇️ BACKWARD COMPAT (LAMA): masih didukung. Jika format lama dipakai di atas = array string,
    // sistem akan otomatis convert ke items di runtime (lihat FireworkScene.tsx).
    _legacyList: [
      "WISH YOU ALL THE BEST",
      "SEHAT SELALU",
      "DIPENUHI CINTA",
      "SEMOGA SEMUA IMPIANMU TERWUJUD",
      "SELALU DIBERIKAN KEBAHAGIAAN",
      "SEMOGA LANGKAHMU SELALU DIMUDAHKAN",
      "SEMOGA KITA SELALU BERSAMA",
    ],
    // ⬇️ BACKWARD COMPAT (LAMA): wishInterval = mapping ke interval (jika user pake format old number)
    _legacyInterval: 2200,
  },

  // Kembang api TERAKHIR (SETELAH semua wishes selesai)
  ending: {
    text: "HAPPY BIRTHDAY, MY LOVE",
    duration: 3000,
    launchDuration: 1900,
  },
};
