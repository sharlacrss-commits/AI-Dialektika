"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Note } from "@/lib/types";
import { ArrowLeft, Trash2, Check, Loader2 } from "lucide-react";

export function CatatanEditor({ note }: { note: Note }) {
  const supabase = createClient();
  const router = useRouter();
  const [judul, setJudul] = useState(note.judul);
  const [isi, setIsi] = useState(note.isi);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [confirmDel, setConfirmDel] = useState(false);

  async function simpan() {
    setStatus("saving");
    await supabase
      .from("notes")
      .update({ judul, isi, updated_at: new Date().toISOString() })
      .eq("id", note.id);
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 1500);
  }

  async function hapus() {
    await supabase.from("notes").delete().eq("id", note.id);
    router.push("/catatan");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-6 sm:px-8">
      <div className="flex items-center justify-between">
        <Link
          href="/catatan"
          className="flex items-center gap-1.5 text-sm text-muted hover:text-ink"
        >
          <ArrowLeft size={18} /> Catatan
        </Link>
        <button
          onClick={() => setConfirmDel(true)}
          className="grid size-9 place-items-center rounded-lg text-muted hover:bg-coral/10 hover:text-coral"
          aria-label="Hapus catatan"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {note.mapel && (
        <span className="mt-4 inline-block rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-primary-press">
          {note.mapel}
        </span>
      )}

      <input
        value={judul}
        onChange={(e) => setJudul(e.target.value)}
        placeholder="Judul catatan"
        className="mt-3 w-full bg-transparent font-display text-2xl font-bold text-ink outline-none placeholder:text-muted"
      />
      <textarea
        value={isi}
        onChange={(e) => setIsi(e.target.value)}
        placeholder="Tulis catatanmu di sini..."
        className="mt-4 min-h-[50dvh] w-full resize-none bg-transparent text-[15px] leading-relaxed text-ink outline-none placeholder:text-muted"
      />

      <div className="sticky bottom-24 mt-4 lg:bottom-6">
        <button
          onClick={simpan}
          disabled={status === "saving"}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-white shadow-tosca transition hover:bg-primary-press"
        >
          {status === "saving" && <Loader2 size={18} className="animate-spin" />}
          {status === "saved" && <Check size={18} />}
          {status === "saved" ? "Tersimpan" : "Simpan"}
        </button>
      </div>

      {confirmDel && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="font-display text-lg font-bold text-ink">
              Hapus catatan ini?
            </h3>
            <p className="mt-2 text-sm text-muted">
              Catatan yang dihapus tidak bisa dikembalikan.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setConfirmDel(false)}
                className="flex-1 rounded-xl border-2 border-line py-3 font-semibold text-muted"
              >
                Batal
              </button>
              <button
                onClick={hapus}
                className="flex-1 rounded-xl bg-coral py-3 font-semibold text-white"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
