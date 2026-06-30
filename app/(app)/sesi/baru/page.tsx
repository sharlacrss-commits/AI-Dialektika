"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MAPEL } from "@/lib/mapel";
import { Loader2, ArrowRight } from "lucide-react";

function BaruInner() {
  const router = useRouter();
  const supabase = createClient();
  const params = useSearchParams();
  const [mapel, setMapel] = useState<string>(params.get("mapel") ?? "");
  const [topik, setTopik] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function mulai() {
    if (!mapel) {
      setError("Pilih materi dulu ya.");
      return;
    }
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/masuk");
      return;
    }

    const { data, error } = await supabase
      .from("sessions")
      .insert({ user_id: user.id, mapel, topik: topik.trim() || null })
      .select("id")
      .single();

    if (error || !data) {
      setError("Gagal memulai sesi. Coba lagi.");
      setLoading(false);
      return;
    }
    router.push(`/sesi/${data.id}`);
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-8 sm:px-8">
      <h1 className="font-display text-2xl font-bold text-ink">
        Mulai Sesi Baru
      </h1>
      <p className="mt-1 text-muted">Pilih materi dan topik yang ingin dibahas.</p>

      <label className="mb-2 mt-6 block text-sm font-medium text-ink">
        Materi
      </label>
      <div className="grid grid-cols-2 gap-3">
        {MAPEL.map(({ nama, icon: Icon }) => (
          <button
            key={nama}
            onClick={() => setMapel(nama)}
            className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition ${
              mapel === nama
                ? "border-primary bg-accent-soft"
                : "border-line bg-white"
            }`}
          >
            <Icon
              size={20}
              className={mapel === nama ? "text-primary-press" : "text-muted"}
            />
            <span
              className={`text-sm font-semibold ${
                mapel === nama ? "text-primary-press" : "text-ink"
              }`}
            >
              {nama}
            </span>
          </button>
        ))}
      </div>

      <label className="mb-2 mt-6 block text-sm font-medium text-ink">
        Topik <span className="text-muted">(boleh dikosongkan)</span>
      </label>
      <input
        value={topik}
        onChange={(e) => setTopik(e.target.value)}
        placeholder="contoh: Genetika & Pewarisan Sifat"
        className="w-full rounded-xl border-2 border-line bg-white px-4 py-3 text-base outline-none focus:border-primary placeholder:text-muted"
      />

      {error && (
        <p className="mt-4 rounded-xl bg-coral/10 px-4 py-3 text-sm text-coral">
          {error}
        </p>
      )}

      <button
        onClick={mulai}
        disabled={loading}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-white shadow-tosca transition hover:bg-primary-press disabled:opacity-60"
      >
        {loading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <ArrowRight size={18} />
        )}
        Mulai Diskusi
      </button>
    </div>
  );
}

export default function SesiBaruPage() {
  return (
    <Suspense fallback={<div className="p-8 text-muted">Memuat...</div>}>
      <BaruInner />
    </Suspense>
  );
}
