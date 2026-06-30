import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatTanggal } from "@/lib/format";
import { NewNoteButton } from "@/components/NewNoteButton";
import { FileText } from "lucide-react";

export default async function CatatanPage() {
  const { supabase, user } = await requireUser();
  const { data: notes } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const list = notes ?? [];

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
      <h1 className="font-display text-2xl font-bold text-ink">Catatan Saya</h1>
      <p className="mt-1 text-muted">Simpan dan tinjau lagi hal penting dari belajarmu.</p>

      {list.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <FileText size={36} className="mx-auto text-muted" />
          <p className="mt-3 text-muted">
            Belum ada catatan. Simpan momen penting dari sesi belajarmu, atau
            buat catatan baru.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {list.map((n) => (
            <Link
              key={n.id}
              href={`/catatan/${n.id}`}
              className="rounded-2xl border border-line bg-white p-5 transition hover:shadow-tosca-sm"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-ink">{n.judul}</h3>
                {n.mapel && (
                  <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-primary-press">
                    {n.mapel}
                  </span>
                )}
              </div>
              <p className="mt-2 line-clamp-3 text-sm text-muted">
                {n.isi || "Catatan kosong"}
              </p>
              <p className="mt-3 text-xs text-muted">
                {formatTanggal(n.updated_at)}
              </p>
            </Link>
          ))}
        </div>
      )}

      <NewNoteButton userId={user.id} />
    </div>
  );
}
