import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { formatTanggal } from "@/lib/format";
import { ArrowLeft, RotateCcw } from "lucide-react";

export default async function TranskripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user } = await requireUser();

  const { data: sesi } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!sesi) notFound();

  const { data: pesan } = await supabase
    .from("messages")
    .select("*")
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  const { data: skor } = await supabase
    .from("scores")
    .select("skor")
    .eq("session_id", id)
    .single();

  return (
    <div className="mx-auto max-w-2xl px-5 py-6 sm:px-8">
      <div className="flex items-center justify-between">
        <Link
          href="/riwayat"
          className="flex items-center gap-1.5 text-sm text-muted hover:text-ink"
        >
          <ArrowLeft size={18} /> Riwayat
        </Link>
        {skor && (
          <Link
            href={`/hasil/${id}`}
            className="grid size-10 place-items-center rounded-full bg-accent-soft font-display text-sm font-bold text-primary-press"
          >
            {skor.skor}
          </Link>
        )}
      </div>

      <h1 className="mt-4 font-display text-xl font-bold text-ink">
        {sesi.mapel}
        {sesi.topik ? ` · ${sesi.topik}` : ""}
      </h1>
      <p className="text-sm text-muted">{formatTanggal(sesi.mulai_at)}</p>

      <div className="mt-6 flex flex-col gap-4">
        {(pesan ?? []).map((m) => (
          <div
            key={m.id}
            className={m.peran === "user" ? "flex flex-row-reverse" : "flex"}
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                m.peran === "user"
                  ? "rounded-tr-sm border border-line bg-white text-ink"
                  : "rounded-tl-sm bg-accent-soft text-primary-press"
              }`}
            >
              {m.isi}
            </div>
          </div>
        ))}
      </div>

      <Link
        href={`/sesi/baru?mapel=${encodeURIComponent(sesi.mapel)}`}
        className="mt-8 flex items-center justify-center gap-2 rounded-xl border-2 border-primary py-3 font-semibold text-primary transition hover:bg-accent-soft"
      >
        <RotateCcw size={18} />
        Belajar topik ini lagi
      </Link>
    </div>
  );
}
