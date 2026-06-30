import { requireUser } from "@/lib/auth";
import { PerkembanganClient } from "@/components/PerkembanganClient";
import { KETERAMPILAN } from "@/lib/types";
import { TrendingUp } from "lucide-react";

export default async function PerkembanganPage() {
  const { supabase, user } = await requireUser();

  const { data: skor } = await supabase
    .from("scores")
    .select(
      "skor, interpretasi, analisis, evaluasi, inferensi, eksplanasi, regulasi_diri, created_at, sessions(mapel, mulai_at)",
    )
    .order("created_at", { ascending: true });

  const rows = (skor ?? []).filter((r) => r.sessions);

  if (rows.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <h1 className="font-display text-2xl font-bold text-ink">Perkembangan</h1>
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <TrendingUp size={36} className="mx-auto text-muted" />
          <p className="mt-3 text-muted">
            Selesaikan beberapa sesi dulu untuk melihat perkembangan berpikir
            kritismu.
          </p>
        </div>
      </div>
    );
  }

  // Data tren skor
  const tren = rows.map((r) => ({
    tanggal: new Date(r.created_at).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    }),
    skor: r.skor,
  }));

  // Rata-rata 6 keterampilan
  const radar = KETERAMPILAN.map(({ key, label }) => {
    const total = rows.reduce(
      (a, r) => a + (Number(r[key as keyof typeof r]) || 0),
      0,
    );
    return { keterampilan: label, nilai: Math.round((total / rows.length) * 10) / 10 };
  });

  const totalSesi = rows.length;
  const topikDikuasai = rows.filter((r) => r.skor >= 8).length;
  const rataSkor =
    Math.round((rows.reduce((a, r) => a + r.skor, 0) / rows.length) * 10) / 10;

  return (
    <PerkembanganClient
      tren={tren}
      radar={radar}
      totalSesi={totalSesi}
      topikDikuasai={topikDikuasai}
      rataSkor={rataSkor}
    />
  );
}
