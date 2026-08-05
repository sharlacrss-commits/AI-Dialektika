"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ThumbsUp, ThumbsDown, Check } from "lucide-react";
import {
  ALASAN_POSITIF,
  ALASAN_NEGATIF,
  type AlasanFeedback,
} from "@/lib/types";

// Penilaian siswa atas SATU jawaban AI.
//
// Pertanyaannya sengaja bukan "suka/tidak suka", melainkan apakah jawaban
// itu membantu — dan alasannya dipilih supaya bisa menjawab pertanyaan
// inti penelitian: apakah AI benar-benar memantik siswa berpikir, atau
// justru membocorkan jawaban. Alasan "langsung kasih jawaban" adalah
// pelanggaran persona, bukan sekadar keluhan rasa.
export function FeedbackJawaban({
  messageId,
  userId,
}: {
  messageId?: string;
  userId: string;
}) {
  const supabase = createClient();
  const [membantu, setMembantu] = useState<boolean | null>(null);
  const [tersimpan, setTersimpan] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  // Id pesan baru diketahui setelah jawaban tersimpan di server. Selama
  // belum ada, tombolnya tidak ditampilkan supaya siswa tidak menekan
  // sesuatu yang pasti gagal.
  if (!messageId) return null;

  async function simpan(nilaiMembantu: boolean, alasan?: AlasanFeedback) {
    setMembantu(nilaiMembantu);
    setGalat(null);
    const { error } = await supabase.from("message_feedback").upsert(
      {
        message_id: messageId,
        user_id: userId,
        membantu: nilaiMembantu,
        alasan: alasan ?? null,
      },
      { onConflict: "message_id,user_id" },
    );
    if (error) {
      setGalat("Gagal menyimpan penilaian.");
      return;
    }
    if (alasan) setTersimpan(true);
  }

  if (tersimpan) {
    return (
      <span className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-1 text-xs text-success-ink">
        <Check size={14} /> Terima kasih, masukanmu tercatat.
      </span>
    );
  }

  const alasanList = membantu ? ALASAN_POSITIF : ALASAN_NEGATIF;

  return (
    <div className="mt-1.5">
      {membantu === null ? (
        <div className="flex items-center gap-1">
          <span className="px-2 text-xs text-muted">Jawaban ini membantu?</span>
          <button
            onClick={() => simpan(true)}
            aria-label="Membantu"
            className="grid size-7 place-items-center rounded-lg text-muted transition hover:bg-success-soft hover:text-success-ink"
          >
            <ThumbsUp size={14} />
          </button>
          <button
            onClick={() => simpan(false)}
            aria-label="Tidak membantu"
            className="grid size-7 place-items-center rounded-lg text-muted transition hover:bg-coral/10 hover:text-coral"
          >
            <ThumbsDown size={14} />
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted">Kenapa?</span>
          {alasanList.map((a) => (
            <button
              key={a.key}
              onClick={() => simpan(membantu, a.key)}
              className="rounded-full border border-line px-2.5 py-1 text-xs text-ink transition hover:border-primary hover:bg-accent-soft"
            >
              {a.label}
            </button>
          ))}
          <button
            onClick={() => setTersimpan(true)}
            className="px-2 py-1 text-xs text-muted underline"
          >
            lewati
          </button>
        </div>
      )}
      {galat && <p className="px-2 text-xs text-coral">{galat}</p>}
    </div>
  );
}
