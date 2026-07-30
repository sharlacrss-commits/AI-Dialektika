"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Check, Search, Cpu } from "lucide-react";

type Model = { id: string; name: string; gratis: boolean };

export function PengaturanModel({
  chatAwal,
  fallbackAwal,
}: {
  chatAwal: string;
  fallbackAwal: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [models, setModels] = useState<Model[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [filter, setFilter] = useState("");
  const [chatModel, setChatModel] = useState(chatAwal);
  const [fallbackModel, setFallbackModel] = useState(fallbackAwal);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );

  useEffect(() => {
    fetch("/api/models")
      .then((r) => (r.ok ? r.json() : { models: [] }))
      .then((d) => setModels(d.models ?? []))
      .catch(() => setModels([]))
      .finally(() => setLoadingModels(false));
  }, []);

  const terfilter = useMemo(() => {
    const f = filter.toLowerCase();
    const list = f
      ? models.filter(
          (m) =>
            m.id.toLowerCase().includes(f) || m.name.toLowerCase().includes(f),
        )
      : models;
    return list.slice(0, 200);
  }, [models, filter]);

  // pastikan model terpilih selalu ada di daftar opsi
  function withSelected(selected: string) {
    if (!selected || terfilter.some((m) => m.id === selected)) return terfilter;
    const found = models.find((m) => m.id === selected);
    return found ? [found, ...terfilter] : terfilter;
  }

  async function simpan() {
    setStatus("saving");
    const isi = {
      chat_model: chatModel,
      fallback_model: fallbackModel,
      updated_at: new Date().toISOString(),
    };

    // Update dulu, insert hanya kalau barisnya belum ada. Sengaja tidak
    // memakai upsert: upsert selalu menuntut izin INSERT walau barisnya
    // sudah ada, dan kebijakan RLS bisa menolaknya (403).
    const { data: terupdate, error } = await supabase
      .from("app_settings")
      .update(isi)
      .eq("id", "global")
      .select("id");

    if (error) {
      setStatus("error");
      return;
    }
    if (!terupdate || terupdate.length === 0) {
      const { error: errInsert } = await supabase
        .from("app_settings")
        .insert({ id: "global", ...isi });
      if (errInsert) {
        setStatus("error");
        return;
      }
    }
    setStatus("saved");
    router.refresh();
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
      <div className="flex items-center gap-2">
        <Cpu className="text-primary" />
        <h1 className="font-display text-2xl font-bold text-ink">
          Pengaturan Model AI
        </h1>
      </div>
      <p className="mt-1 text-muted">
        Pilih model AI dari Sumopod. Perubahan langsung dipakai untuk semua
        chat dan penilaian. Model utama dipakai duluan; model cadangan otomatis
        dipakai kalau yang utama gagal.
      </p>

      <div className="mt-6 flex items-center gap-2 rounded-xl border-2 border-line bg-white px-4 py-2.5">
        <Search size={18} className="text-muted" />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Cari model (mis. gemini, gpt, gratis)"
          className="w-full bg-transparent text-base outline-none placeholder:text-muted"
        />
      </div>

      {loadingModels ? (
        <p className="mt-6 flex items-center gap-2 text-muted">
          <Loader2 className="animate-spin" size={18} /> Memuat daftar model...
        </p>
      ) : (
        <div className="mt-6 space-y-5">
          <PilihModel
            label="Model utama (dipakai duluan)"
            value={chatModel}
            onChange={setChatModel}
            options={withSelected(chatModel)}
          />
          <PilihModel
            label="Model cadangan (kalau utama gagal)"
            value={fallbackModel}
            onChange={setFallbackModel}
            options={withSelected(fallbackModel)}
          />
        </div>
      )}

      <button
        onClick={simpan}
        disabled={status === "saving" || loadingModels}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-white shadow-tosca transition hover:bg-primary-press disabled:opacity-60"
      >
        {status === "saving" && <Loader2 size={18} className="animate-spin" />}
        {status === "saved" && <Check size={18} />}
        {status === "saved" ? "Tersimpan" : "Simpan Pengaturan"}
      </button>
      {status === "error" && (
        <p className="mt-3 rounded-xl bg-coral/10 px-4 py-3 text-sm text-coral">
          Gagal menyimpan. Pastikan akunmu admin.
        </p>
      )}

      <p className="mt-4 text-xs text-muted">
        Total {models.length} model tersedia. Saran: <code>gemini/gemini-2.5-flash</code>{" "}
        untuk keseimbangan harga &amp; kualitas, <code>gpt-4o-mini</code> sebagai cadangan hemat.
      </p>
    </div>
  );
}

function PilihModel({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Model[];
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border-2 border-line bg-white px-4 py-3 text-base outline-none focus:border-primary"
      >
        {options.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
            {m.gratis ? " (gratis)" : ""} — {m.id}
          </option>
        ))}
      </select>
    </div>
  );
}
