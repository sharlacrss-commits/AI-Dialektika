"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Bookmark, Check, RotateCcw, Home } from "lucide-react";

export function HasilActions({
  userId,
  sessionId,
  mapel,
  ringkasan,
}: {
  userId: string;
  sessionId: string;
  mapel: string;
  ringkasan: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  async function simpan() {
    await supabase.from("notes").insert({
      user_id: userId,
      judul: `Hasil belajar ${mapel}`,
      isi: ringkasan,
      mapel,
      source_session_id: sessionId,
    });
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
      <button
        onClick={simpan}
        disabled={saved}
        className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-white shadow-tosca transition hover:bg-primary-press disabled:opacity-70"
      >
        {saved ? <Check size={18} /> : <Bookmark size={18} />}
        {saved ? "Tersimpan di Catatan" : "Simpan ke Catatan"}
      </button>
      <Link
        href={`/sesi/baru?mapel=${encodeURIComponent(mapel)}`}
        className="flex items-center justify-center gap-2 rounded-xl border-2 border-line px-5 py-3 font-semibold text-ink transition hover:border-primary hover:text-primary"
      >
        <RotateCcw size={18} />
        Belajar lagi
      </Link>
      <Link
        href="/beranda"
        className="flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold text-muted transition hover:text-ink"
      >
        <Home size={18} />
        Beranda
      </Link>
    </div>
  );
}
