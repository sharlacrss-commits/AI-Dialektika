import Link from "next/link";
import Image from "next/image";
import { requireProfile } from "@/lib/auth";
import { MAPEL } from "@/lib/mapel";
import { formatTanggal } from "@/lib/format";
import { Plus, ArrowRight, Star } from "lucide-react";

export default async function BerandaPage() {
  const { supabase, user, profile } = await requireProfile();

  const { data: sesi } = await supabase
    .from("sessions")
    .select("id, mapel, topik, status, mulai_at, scores(skor)")
    .eq("user_id", user.id)
    .order("mulai_at", { ascending: false })
    .limit(5);

  const sesiList = sesi ?? [];
  const skorTerakhir = sesiList
    .map((s) => (Array.isArray(s.scores) ? s.scores[0]?.skor : undefined))
    .find((v) => typeof v === "number");

  const namaDepan = (profile.nama ?? "Teman").split(" ")[0];

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
      {/* Sapaan */}
      <div className="flex items-start justify-between gap-4 rounded-2xl bg-gradient-to-br from-accent-soft to-bg-soft p-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary-press sm:text-3xl">
            Halo, {namaDepan}!
          </h1>
          <p className="mt-1 max-w-md text-muted">
            Mau belajar apa hari ini? Dialektika siap menemanimu berpikir.
          </p>
        </div>
        {typeof skorTerakhir === "number" && (
          <div className="flex shrink-0 items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-tosca-sm">
            <span className="grid size-9 place-items-center rounded-full bg-success-soft text-success-ink">
              <Star size={18} />
            </span>
            <div className="leading-tight">
              <p className="text-xs text-muted">Skor terakhir</p>
              <p className="font-display text-lg font-bold text-ink">
                {skorTerakhir}/10
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Mulai sesi baru */}
      <Link
        href="/sesi/baru"
        className="mt-6 flex items-center justify-between rounded-2xl bg-primary p-5 text-white shadow-tosca transition hover:bg-primary-press"
      >
        <span className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-white/20">
            <Plus size={22} />
          </span>
          <span>
            <span className="block font-display text-lg font-bold">
              Mulai Sesi Baru
            </span>
            <span className="text-sm text-white/80">
              Pilih materi dan mulai berdiskusi
            </span>
          </span>
        </span>
        <ArrowRight size={22} />
      </Link>

      {/* Pilihan materi */}
      <h2 className="mt-8 mb-3 font-display text-lg font-bold text-ink">
        Pilih Materi
      </h2>
      <div className="grid grid-cols-2 gap-4">
        {MAPEL.map(({ nama, desc, icon: Icon, img }) => (
          <Link
            key={nama}
            href={`/sesi/baru?mapel=${encodeURIComponent(nama)}`}
            className="group overflow-hidden rounded-2xl border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-tosca"
          >
            <div className="relative h-24 w-full">
              <Image
                src={img}
                alt={nama}
                fill
                sizes="(max-width: 640px) 50vw, 25vw"
                className="object-cover transition duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary-press/50 to-transparent" />
              <span className="absolute bottom-2 left-2 grid size-9 place-items-center rounded-lg bg-white/90 text-primary-press">
                <Icon size={18} />
              </span>
            </div>
            <div className="p-4">
              <p className="font-display font-bold text-ink">{nama}</p>
              <p className="mt-1 text-sm text-muted">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Sesi terakhir */}
      <h2 className="mt-8 mb-3 font-display text-lg font-bold text-ink">
        Sesi Terakhir
      </h2>
      {sesiList.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-white p-6 text-center text-muted">
          Belum ada sesi. Yuk mulai sesi pertamamu!
        </p>
      ) : (
        <div className="space-y-3">
          {sesiList.map((s) => {
            const skor = Array.isArray(s.scores) ? s.scores[0]?.skor : null;
            const href =
              s.status === "selesai" ? `/riwayat/${s.id}` : `/sesi/${s.id}`;
            return (
              <Link
                key={s.id}
                href={href}
                className="flex items-center justify-between rounded-xl border border-line bg-white p-4 transition hover:shadow-tosca-sm"
              >
                <div>
                  <p className="font-semibold text-ink">
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
