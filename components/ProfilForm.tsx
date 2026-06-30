"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Check, Loader2, LogOut } from "lucide-react";

export function ProfilForm({
  namaAwal,
  userId,
}: {
  namaAwal: string;
  userId: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [nama, setNama] = useState(namaAwal);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  async function simpan() {
    setStatus("saving");
    await supabase.from("profiles").update({ nama }).eq("id", userId);
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 1500);
    router.refresh();
  }

  async function keluar() {
    await supabase.auth.signOut();
    router.push("/masuk");
    router.refresh();
  }

  return (
    <div className="mt-6">
      <label className="mb-1.5 block text-sm font-medium text-ink">
        Ubah nama
      </label>
      <input
        value={nama}
        onChange={(e) => setNama(e.target.value)}
        className="w-full rounded-xl border-2 border-line bg-white px-4 py-3 text-base outline-none focus:border-primary"
      />
      <button
        onClick={simpan}
        disabled={status === "saving"}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-white shadow-tosca transition hover:bg-primary-press"
      >
        {status === "saving" && <Loader2 size={18} className="animate-spin" />}
        {status === "saved" && <Check size={18} />}
        {status === "saved" ? "Tersimpan" : "Simpan"}
      </button>

      <button
        onClick={keluar}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-line py-3 font-semibold text-coral transition hover:bg-coral/10"
      >
        <LogOut size={18} />
        Keluar
      </button>
    </div>
  );
}
