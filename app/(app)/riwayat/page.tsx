import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatTanggal } from "@/lib/format";
import { iconMapel } from "@/lib/mapel";
import { History, ArrowRight } from "lucide-react";

export default async function RiwayatPage() {
  const { supabase, user } = await requireUser();
  const { data: sesi } = await supabase
    .from("sessions")
    .select("id, mapel, topik, status, mulai_at, scores(skor)")
    .eq("user_id", user.id)
    .order("mulai_at", { ascending: false });

  const list = sesi ?? [];

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
      <h1 className="font-display text-2xl font-bold text-ink">Riwayat Sesi</h1>
      <p className="mt-1 text-muted">Semua sesi belajarmu, dari yang terbaru.</p>

      {list.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <History size={36} className="mx-auto text-muted" />
          <p className="mt-3 text-muted">Belum ada sesi. Yuk mulai belajar!</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {list.map((s) => {
            const Icon = iconMapel(s.mapel);
            const skor = Array.isArray(s.scores) ? s.scores[0]?.skor : null;
            const href =
              s.status === "selesai" ? `/riwayat/${s.id}` : `/sesi/${s.id}`;
            return (
              <Link
                key={s.id}
                href={href}
                className="flex items-center gap-4 rounded-xl border border-line bg-white p-4 transition hover:shadow-tosca-sm"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-primary-press">
                  <Icon size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">
                    {s.mapel}
                    {s.topik ? ` · ${s.topik}` : ""}
                  </p>
                  <p className="text-sm text-muted">
                    {formatTanggal(s.mulai_at)}
                    {s.status === "berlangsung" && " · berlangsung"}
                  </p>
                </div>
                {typeof skor === "number" ? (
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft font-display text-sm font-bold text-primary-press">
                    {skor}
                  </span>
                ) : (
                  <ArrowRight size={18} className="text-muted" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
