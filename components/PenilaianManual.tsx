"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Check } from "lucide-react";
import { KETERAMPILAN, type ManualScore } from "@/lib/types";

// Form penilaian manual oleh guru, memakai rubrik yang SAMA dengan yang
// dipakai AI (Facione, skala 1-10). Kesamaan rubrik inilah yang membuat
// selisih skor AI vs guru bisa ditafsirkan.
export function PenilaianManual({
  sessionId,
  penilaiId,
  awal,
  skorAi,
}: {
  sessionId: string;
  penilaiId: string;
  awal: ManualScore | null;
  skorAi: Record<string, number> | null;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [nilai, setNilai] = useState<Record<string, number>>(() => {
    const dasar: Record<string, number> = { skor: awal?.skor ?? 5 };
    for (const k of KETERAMPILAN) {
      dasar[k.key] = (awal?.[k.key as keyof ManualScore] as number) ?? 5;
    }
    return dasar;
  });
  const [catatan, setCatatan] = useState(awal?.catatan ?? "");
  const [simpan, setSimpan] = useState(false);
  const [sukses, setSukses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setSimpan(true);
    setGalat(null);
    setSukses(false);

    const { error } = await supabase.from("manual_scores").upsert(
      {
        session_id: sessionId,
        penilai_id: penilaiId,
        skor: nilai.skor,
        interpretasi: nilai.interpretasi,
        analisis: nilai.analisis,
        evaluasi: nilai.evaluasi,
        inferensi: nilai.inferensi,
        eksplanasi: nilai.eksplanasi,
        regulasi_diri: nilai.regulasi_diri,
        catatan,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id,penilai_id" },
    );

    setSimpan(false);
    if (error) {
      setGalat("Gagal menyimpan: " + error.message);
      return;
    }
    setSukses(true);
    router.refresh();
  }

  return (
    <form onSubmit={kirim} className="space-y-5">
      <Geser
        label="Skor keseluruhan"
        nilai={nilai.skor}
        pembanding={skorAi?.skor}
        onChange={(v) => setNilai((n) => ({ ...n, skor: v }))}
        tebal
      />

      <div className="space-y-4 rounded-2xl bg-bg-soft p-4">
        <p className="text-sm font-medium text-ink">
          Enam keterampilan berpikir kritis (Facione)
        </p>
        {KETERAMPILAN.map((k) => (
          <Geser
            key={k.key}
            label={k.label}
            nilai={nilai[k.key]}
            pembanding={skorAi?.[k.key]}
            onChange={(v) => setNilai((n) => ({ ...n, [k.key]: v }))}
          />
        ))}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">
          Catatan penilai (opsional)
        </label>
        <textarea
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          rows={3}
          placeholder="Mis. siswa sempat salah konsep di awal, tapi mengoreksi sendiri setelah dipancing."
          className="w-full resize-none rounded-xl border-2 border-line bg-white px-4 py-3 text-base outline-none focus:border-primary placeholder:text-muted"
        />
      </div>

      {galat && (
        <p className="rounded-xl bg-coral/10 px-4 py-3 text-sm text-coral">
          {galat}
        </p>
      )}
      {sukses && (
        <p className="flex items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-sm text-success-ink">
          <Check size={16} /> Penilaian tersimpan.
        </p>
      )}

      <button
        type="submit"
        disabled={simpan}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-white shadow-tosca transition hover:bg-primary-press disabled:opacity-60"
      >
        {simpan && <Loader2 size={18} className="animate-spin" />}
        {awal ? "Perbarui penilaian" : "Simpan penilaian"}
      </button>
    </form>
  );
}

function Geser({
  label,
  nilai,
  pembanding,
  onChange,
  tebal,
}: {
  label: string;
  nilai: number;
  pembanding?: number;
  onChange: (v: number) => void;
  tebal?: boolean;
}) {
  // Skor AI ditampilkan berdampingan supaya guru tahu ia sedang menilai
  // hal yang sama. Sengaja tidak dipakai sebagai nilai awal slider —
  // kalau begitu, guru cenderung sekadar menyetujui angka AI (anchoring)
  // dan perbandingannya kehilangan makna.
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label
          className={`text-sm ${tebal ? "font-semibold text-ink" : "text-ink"}`}
        >
          {label}
        </label>
        <span className="flex items-baseline gap-2 text-sm">
          {typeof pembanding === "number" && (
            <span className="text-xs text-muted">AI: {pembanding}</span>
          )}
          <b className="font-display text-lg text-primary-press">{nilai}</b>
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={nilai}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-primary"
      />
    </div>
  );
}
