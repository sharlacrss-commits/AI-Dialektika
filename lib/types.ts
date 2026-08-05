// Semua pengguna aplikasi ini adalah kelompok eksperimen — diisi otomatis
// oleh trigger di database. Kelompok kontrol memakai AI lain di luar
// aplikasi, jadi tidak pernah punya akun di sini. Nilai "kontrol" tetap
// ada di tipe karena data lama dari uji coba awal masih memakainya.
export type Kelompok = "eksperimen" | "kontrol";

// siswa = pengguna aplikasi
// guru  = memantau siswa DI SEKOLAH YANG SAMA + menilai transkrip manual
// admin = semua akses guru + setelan model AI + ekspor data penelitian
export type Role = "siswa" | "guru" | "admin";

// Dipakai di banyak halaman. Didefinisikan sekali di sini supaya tidak ada
// halaman pemantauan yang lupa mengizinkan admin.
export const ROLE_PEMANTAU: readonly Role[] = ["guru", "admin"] as const;

export type Profile = {
  id: string;
  nama: string | null;
  kode_siswa: string | null;
  kelompok: Kelompok | null;
  kelas: string | null;
  sekolah: string | null;
  consent: boolean;
  role: Role;
  onboarded: boolean;
};

export type Mapel = "Biologi" | "Kimia" | "Matematika" | "Studi Kasus";

export type Session = {
  id: string;
  user_id: string;
  mapel: string;
  topik: string | null;
  status: "berlangsung" | "selesai";
  mulai_at: string;
  selesai_at: string | null;
};

export type Message = {
  id: string;
  session_id: string;
  peran: "user" | "assistant";
  isi: string;
  is_pemantik: boolean;
  created_at: string;
  // Diisi kalau siswa melampirkan foto soal / PDF. Lihat supabase/002-lampiran.sql.
  lampiran_path?: string | null;
  lampiran_nama?: string | null;
  lampiran_tipe?: string | null;
};

export type Score = {
  id: string;
  session_id: string;
  skor: number;
  interpretasi: number;
  analisis: number;
  evaluasi: number;
  inferensi: number;
  eksplanasi: number;
  regulasi_diri: number;
  kelebihan: string;
  kekurangan: string;
  saran: string;
  created_at: string;
};

export type Note = {
  id: string;
  user_id: string;
  judul: string;
  isi: string;
  mapel: string | null;
  source_session_id: string | null;
  created_at: string;
  updated_at: string;
};

export const KETERAMPILAN = [
  { key: "interpretasi", label: "Interpretasi" },
  { key: "analisis", label: "Analisis" },
  { key: "evaluasi", label: "Evaluasi" },
  { key: "inferensi", label: "Inferensi" },
  { key: "eksplanasi", label: "Eksplanasi" },
  { key: "regulasi_diri", label: "Regulasi Diri" },
] as const;

export type KunciKeterampilan = (typeof KETERAMPILAN)[number]["key"];

// ---------------------------------------------------------------
//  Pelacakan performa AI (lihat supabase/003-role-guru-dan-tracking.sql)
// ---------------------------------------------------------------

// Satu baris per panggilan ke Sumopod — performa TEKNIS.
export type AiCall = {
  id: string;
  user_id: string | null;
  session_id: string | null;
  jenis: "chat" | "nilai";
  model_diminta: string | null;
  model: string | null;
  pakai_fallback: boolean;
  status: "ok" | "error";
  http_status: number | null;
  // Jeda sampai huruf pertama muncul. Ini yang paling dirasakan siswa.
  ttfb_ms: number | null;
  latensi_ms: number | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  jumlah_lampiran: number;
  pesan_error: string | null;
  created_at: string;
};

export type AlasanFeedback =
  | "memancing_berpikir"
  | "penjelasannya_jelas"
  | "langsung_menjawab"
  | "tidak_relevan"
  | "sulit_dipahami"
  | "terlalu_panjang";

// Alasan dipisah positif/negatif supaya siswa tidak disodori pilihan yang
// tidak masuk akal (mis. "langsung menjawab" setelah menekan jempol atas).
export const ALASAN_POSITIF: { key: AlasanFeedback; label: string }[] = [
  { key: "memancing_berpikir", label: "Bikin aku ikut mikir" },
  { key: "penjelasannya_jelas", label: "Penjelasannya jelas" },
];

export const ALASAN_NEGATIF: { key: AlasanFeedback; label: string }[] = [
  { key: "langsung_menjawab", label: "Langsung kasih jawaban" },
  { key: "tidak_relevan", label: "Tidak nyambung" },
  { key: "sulit_dipahami", label: "Sulit dipahami" },
  { key: "terlalu_panjang", label: "Terlalu panjang" },
];

export const LABEL_ALASAN: Record<AlasanFeedback, string> = Object.fromEntries(
  [...ALASAN_POSITIF, ...ALASAN_NEGATIF].map((a) => [a.key, a.label]),
) as Record<AlasanFeedback, string>;

export type MessageFeedback = {
  id: string;
  message_id: string;
  user_id: string;
  membantu: boolean;
  alasan: AlasanFeedback | null;
  catatan: string;
  created_at: string;
};

// Penilaian guru atas transkrip, rubrik SAMA dengan yang dipakai AI.
export type ManualScore = {
  id: string;
  session_id: string;
  penilai_id: string;
  skor: number;
  interpretasi: number;
  analisis: number;
  evaluasi: number;
  inferensi: number;
  eksplanasi: number;
  regulasi_diri: number;
  catatan: string;
  created_at: string;
  updated_at: string;
};
