export type Kelompok = "eksperimen" | "kontrol";

export type Profile = {
  id: string;
  nama: string | null;
  kode_siswa: string | null;
  kelompok: Kelompok | null;
  kelas: string | null;
  sekolah: string | null;
  consent: boolean;
  role: "siswa" | "admin";
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
