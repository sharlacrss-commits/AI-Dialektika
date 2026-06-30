import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ScoreRing } from "@/components/ScoreRing";
import { HasilActions } from "@/components/HasilActions";
import { Logo } from "@/components/Logo";
import { CheckCircle2, AlertCircle, Lightbulb } from "lucide-react";

function labelSkor(s: number) {
  if (s >= 9) return "Luar Biasa!";
  if (s >= 7) return "Bagus!";
  if (s >= 4) return "Terus Semangat!";
  return "Jangan Menyerah!";
}

export default async function HasilPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");

  const { data: sesi } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!sesi) notFound();

  const { data: skor } = await supabase
    .from("scores")
    .select("*")
    .eq("session_id", id)
    .single();

  if (!skor) {
    return (
      <main className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <p className="text-muted">Sesi ini belum dinilai.</p>
          <Link
            href={`/sesi/${id}`}
            className="mt-4 inline-block rounded-xl bg-primary px-5 py-3 font-semibold text-white"
          >
            Lanjutkan sesi
          </Link>
        </div>
      </main>
    );
  }

  const ringkasan = `Materi: ${sesi.mapel}${sesi.topik ? ` (${sesi.topik})` : ""}\nSkor: ${skor.skor}/10\n\nYang sudah bagus:\n${skor.kelebihan}\n\nYang perlu diperbaiki:\n${skor.kekurangan}\n\nSaran belajar:\n${skor.saran}`;

  return (
    <main className="min-h-dvh bg-bg-soft">
      <header className="flex items-center justify-between px-5 py-4 sm:px-8">
        <Logo size="sm" withText />
        <Link href="/beranda" className="text-sm text-muted hover:text-ink">
          Tutup
        </Link>
      </header>

      <div className="mx-auto max-w-2xl px-5 py-6 sm:px-8">
        {/* Skor */}
        <div className="flex flex-col items-center text-center">
          <ScoreRing value={skor.skor} />
          <p className="mt-3 font-display text-2xl font-bold text-primary-press">
            {labelSkor(skor.skor)}
          </p>
          <p className="mt-1 max-w-md text-muted">
            Kamu menyelesaikan sesi {sesi.mapel}
            {sesi.topik ? ` (${sesi.topik})` : ""}. Terus jaga semangat
            belajarmu!
          </p>
        </div>

        {/* Tiga kartu */}
        <div className="mt-8 space-y-4">
          <KartuUmpan
            warna="bg-success-soft"
            ikonWarna="text-success-ink"
            icon={<CheckCircle2 size={20} />}
            judul="Yang sudah bagus"
            isi={skor.kelebihan}
          />
          <KartuUmpan
            warna="bg-warning-soft"
            ikonWarna="text-warning-ink"
            icon={<AlertCircle size={20} />}
            judul="Yang perlu diperbaiki"
            isi={skor.kekurangan}
          />
          <KartuUmpan
            warna="bg-accent-soft"
            ikonWarna="text-primary-press"
            icon={<Lightbulb size={20} />}
            judul="Saran belajar"
            isi={skor.saran}
            img="/images/hasil.jpg"
          />
        </div>

        <div className="mt-8">
          <HasilActions
            userId={user.id}
            sessionId={id}
            mapel={sesi.mapel}
            ringkasan={ringkasan}
          />
        </div>
      </div>
    </main>
  );
}

function KartuUmpan({
  warna,
  ikonWarna,
  icon,
  judul,
  isi,
  img,
}: {
  warna: string;
  ikonWarna: string;
  icon: React.ReactNode;
  judul: string;
  isi: string;
  img?: string;
}) {
  return (
    <div className={`rounded-2xl ${warna} p-5`}>
      <div className="mb-2 flex items-center gap-2">
        <span className={ikonWarna}>{icon}</span>
        <h3 className="font-display font-bold text-ink">{judul}</h3>
      </div>
      <div className="flex items-start gap-4">
        <p className="flex-1 whitespace-pre-wrap text-[15px] leading-relaxed text-ink/80">
          {isi}
        </p>
        {img && (
          <div className="relative hidden h-24 w-32 shrink-0 overflow-hidden rounded-xl sm:block">
            <Image src={img} alt="" fill sizes="128px" className="object-cover" />
          </div>
        )}
      </div>
    </div>
  );
}
