// ==========================================
// MEDIA CONFIG (versi src/assets, TypeScript)
// ==========================================
// Taruh semua foto/video/musik di folder:  src/assets/  (boleh dalam subfolder)
// Vite memprosesnya lewat import.meta.glob, jadi ikut ke build GitHub Pages tanpa folder public/.
//
// Setiap kategori diambil berdasarkan POLA NAMA FILE (tidak peduli subfolder / huruf besar-kecil
// ekstensi). Beri nomor dua digit agar urutannya benar: photo01, photo02, ... photo30.
//
//   polaroidPhotos       photo01.jpeg ... photo30.jpeg        (Polaroid stack)
//   firstMemoryPhoto     firstmemoryphoto.JPG                 (First Memory)
//   photoStoryPhotos     photostory01.JPG ... photostory20    (Photo Story, jumlah bebas)
//   timelinePhotos       timeline01.JPG ... timeline05.JPG    (Timeline)
//   timelineSidePhotos   side01.JPG ...                       (foto sisi Timeline, maks 6)
//   loveLetterSidePhotos letter01.JPG ...                     (foto sisi Love Letter, maks 6)
//   finalHeartPhotos     heart01.JPG ...                      (belakang hati pixel, maks 5)
//   easterEggPhotos      egg01.png ... egg04.png              (PNG cut-out easter egg)
//   videos               video01.mp4
//   music                our-song.mp3 (atau mp3 pertama yang ditemukan)
//
// Ingin pola nama lain? Ubah regex di objek PATTERNS di bawah.
// Tips Safari iPhone: kecilkan foto (±1200px, <400KB). Format HEIC tidak bisa tampil di browser.
// ==========================================

const all = import.meta.glob<string>("../assets/**/*.{jpg,jpeg,JPG,JPEG,png,PNG,webp,WEBP,mp4,MP4,MOV,mp3,MP3}", {
  eager: true,
  query: "?url",
  import: "default",
});

const PATTERNS = {
  polaroid: /\/photo\d+\./i,
  firstMemory: /\/firstmemoryphoto\./i,
  photoStory: /\/photostory\d+\./i,
  timeline: /\/timeline\d+\./i,
  timelineSide: /\/side\d+\./i,
  loveLetterSide: /\/letter\d+\./i,
  finalHeart: /\/heart\d+\./i,
  easterEgg: /\/egg\d+\./i,
  video: /\/video\d+\./i,
  song: /\/our-song\./i,
  anyMp3: /\.mp3$/i,
};

// urutan natural: photo2 sebelum photo10
const pick = (re: RegExp): string[] =>
  Object.keys(all)
    .filter((k) => re.test(k))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((k) => all[k]);

export const polaroidPhotos = pick(PATTERNS.polaroid);
export const firstMemoryPhoto = pick(PATTERNS.firstMemory);
export const photoStoryPhotos = pick(PATTERNS.photoStory);
export const timelinePhotos = pick(PATTERNS.timeline);
export const timelineSidePhotos = pick(PATTERNS.timelineSide);
export const loveLetterSidePhotos = pick(PATTERNS.loveLetterSide);
export const finalHeartPhotos = pick(PATTERNS.finalHeart);
export const easterEggPhotos = pick(PATTERNS.easterEgg);
export const photos: string[] = []; // fallback umum (opsional): isi URL foto jika array scene-spesifik kosong
export const videos = pick(PATTERNS.video);
export const music = {
  src: pick(PATTERNS.song)[0] ?? pick(PATTERNS.anyMp3)[0] ?? "",
  title: "Our Song",
};

// whiteEdge: true  -> tepi putih ala kertas gunting ditambahkan otomatis di sekeliling bentuk PNG
// whiteEdge: false -> pakai PNG apa adanya (jika PNG kamu sudah punya tepi putih)
export const easterEggPhotoOptions = {
  whiteEdge: true,
  edgePx: 3,
};

// Bantu diagnosa saat npm run dev: kategori yang kosong ditampilkan di console.
if (import.meta.env?.DEV) {
  const counts = {
    polaroidPhotos: polaroidPhotos.length,
    firstMemoryPhoto: firstMemoryPhoto.length,
    photoStoryPhotos: photoStoryPhotos.length,
    timelinePhotos: timelinePhotos.length,
    timelineSidePhotos: timelineSidePhotos.length,
    loveLetterSidePhotos: loveLetterSidePhotos.length,
    finalHeartPhotos: finalHeartPhotos.length,
    easterEggPhotos: easterEggPhotos.length,
    videos: videos.length,
    music: music.src ? 1 : 0,
  };
  console.info("[media] jumlah aset ditemukan di src/assets:", counts, "total file:", Object.keys(all).length);
}

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

  },

  // Kembang api TERAKHIR (SETELAH semua wishes selesai)
  ending: {
    text: "HAPPY BIRTHDAY, MY LOVE",
    duration: 3000,
    launchDuration: 1900,
  },
};