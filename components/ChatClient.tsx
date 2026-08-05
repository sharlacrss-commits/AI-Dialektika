"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Markdown } from "@/components/Markdown";
import { FeedbackJawaban } from "@/components/FeedbackJawaban";
import type { Message, Session } from "@/lib/types";
import {
  ArrowLeft,
  Send,
  Bookmark,
  Check,
  Lightbulb,
  Loader2,
  Clock,
  CheckCircle2,
  Paperclip,
  FileText,
  Image as ImageIcon,
  X,
} from "lucide-react";

type Bubble = {
  id?: string;
  peran: "user" | "assistant";
  isi: string;
  is_pemantik?: boolean;
  lampiran_nama?: string | null;
  lampiran_tipe?: string | null;
};

type Lampiran = { path: string; nama: string; tipe: string };

const MAKS_BYTE = 10 * 1024 * 1024; // 10 MB, sama dengan batas bucket
const TIPE_BOLEH = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "application/pdf",
];

// Terjemahkan kegagalan /api/chat jadi pesan yang menunjuk penyebabnya,
// bukan tebakan umum "AI sedang sibuk" yang menyulitkan saat menyiapkan app.
function pesanError(status: number, detail: string) {
  const d = detail.trim().slice(0, 300);
  switch (status) {
    case 401:
      return d.includes("Belum masuk")
        ? "Sesi login habis. Muat ulang halaman lalu masuk lagi."
        : "API key Sumopod ditolak. Periksa SUMOPOD_API_KEY. " + d;
    case 402:
      return "Saldo/kredit Sumopod habis. Isi ulang di sumopod.com.";
    case 404:
      return "Sesi tidak ditemukan. Kembali ke beranda dan mulai sesi baru.";
    case 429:
      return "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.";
    case 500:
      return d || "Server bermasalah. Cek log terminal / Vercel.";
    default:
      return d
        ? `Gagal mengirim (${status}). ${d}`
        : `Gagal mengirim (${status}). Coba lagi.`;
  }
}

export function ChatClient({
  session,
  initialMessages,
  userId,
  nama,
}: {
  session: Session;
  initialMessages: Message[];
  userId: string;
  nama: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [messages, setMessages] = useState<Bubble[]>(initialMessages);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedIdx, setSavedIdx] = useState<number | null>(null);
  const [durasi, setDurasi] = useState("00:00");
  const [berkas, setBerkas] = useState<File | null>(null);
  const [mengunggah, setMengunggah] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const kickoffDone = useRef(false);

  // Unggah ke Storage lebih dulu, baru path-nya dikirim ke /api/chat.
  // File tidak dikirim lewat body chat supaya permintaannya tetap ringan
  // dan tidak kena batas ukuran body di Vercel.
  async function unggah(f: File): Promise<Lampiran | null> {
    const bersih = f.name.replace(/[^\w.\-]+/g, "_").slice(-60);
    const path = `${userId}/${session.id}/${Date.now()}-${bersih}`;
    const { error } = await supabase.storage
      .from("lampiran")
      .upload(path, f, { contentType: f.type, upsert: false });
    if (error) {
      setError(
        error.message.toLowerCase().includes("bucket")
          ? "Penyimpanan lampiran belum disiapkan. Minta admin menjalankan supabase/002-lampiran.sql."
          : "Gagal mengunggah file: " + error.message,
      );
      return null;
    }
    return { path, nama: f.name, tipe: f.type };
  }

  function pilihBerkas(f: File | null) {
    setError(null);
    if (!f) return setBerkas(null);
    if (!TIPE_BOLEH.includes(f.type)) {
      setError("File harus berupa gambar (PNG/JPG/WEBP) atau PDF.");
      return;
    }
    if (f.size > MAKS_BYTE) {
      setError("Ukuran file maksimal 10 MB. Coba fotonya dikecilkan dulu.");
      return;
    }
    setBerkas(f);
  }

  const inisial = nama.trim().slice(0, 2).toUpperCase() || "BS";

  // Timer durasi belajar (hitung naik)
  useEffect(() => {
    const mulai = new Date(session.mulai_at).getTime();
    const t = setInterval(() => {
      const d = Math.max(0, Math.floor((Date.now() - mulai) / 1000));
      const m = String(Math.floor(d / 60)).padStart(2, "0");
      const s = String(d % 60).padStart(2, "0");
      setDurasi(`${m}:${s}`);
    }, 1000);
    return () => clearInterval(t);
  }, [session.mulai_at]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  // Kickoff: kalau belum ada pesan, minta AI menyapa duluan
  useEffect(() => {
    if (kickoffDone.current) return;
    kickoffDone.current = true;
    if (initialMessages.length === 0) {
      void runStream({ kickoff: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runStream(opts: {
    pesan?: string;
    kickoff?: boolean;
    lampiran?: Lampiran;
  }) {
    setBusy(true);
    setError(null);
    setStreaming("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, ...opts }),
      });
      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => "");
        setError(pesanError(res.status, detail));
        setStreaming(null);
        setBusy(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setStreaming(acc);
      }
      if (!acc.trim()) {
        setError(
          "Dialektika belum bisa merespons. Coba lagi, atau minta admin ganti model AI di Pengaturan.",
        );
        return;
      }
      // Jawaban AI disimpan di server (siswa tidak boleh menulis pesan
      // berperan 'assistant'), jadi id-nya baru bisa diketahui dengan
      // membaca balik pesan terakhir. Id itu dipakai tombol penilaian
      // jawaban di bawah gelembung chat.
      const { data: baru } = await supabase
        .from("messages")
        .select("id")
        .eq("session_id", session.id)
        .eq("peran", "assistant")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setMessages((prev) => [
        ...prev,
        {
          id: baru?.id,
          peran: "assistant",
          isi: acc,
          is_pemantik: acc.includes("?"),
        },
      ]);
    } catch {
      setError("Koneksi terputus. Coba lagi.");
    } finally {
      setStreaming(null);
      setBusy(false);
    }
  }

  async function kirim() {
    const teks = input.trim();
    // Boleh mengirim file saja tanpa menulis apa-apa.
    if ((!teks && !berkas) || busy || mengunggah) return;

    let terlampir: Lampiran | undefined;
    if (berkas) {
      setMengunggah(true);
      const hasil = await unggah(berkas);
      setMengunggah(false);
      if (!hasil) return; // pesan error sudah dipasang di unggah()
      terlampir = hasil;
    }

    setInput("");
    setBerkas(null);
    if (fileRef.current) fileRef.current.value = "";
    setMessages((prev) => [
      ...prev,
      {
        peran: "user",
        isi: teks,
        lampiran_nama: terlampir?.nama ?? null,
        lampiran_tipe: terlampir?.tipe ?? null,
      },
    ]);
    await runStream({ pesan: teks, lampiran: terlampir });
  }

  async function simpanCatatan(isi: string, idx: number) {
    await supabase.from("notes").insert({
      user_id: userId,
      judul: `Catatan ${session.mapel}`,
      isi,
      mapel: session.mapel,
      source_session_id: session.id,
    });
    setSavedIdx(idx);
    setTimeout(() => setSavedIdx((v) => (v === idx ? null : v)), 2000);
  }

  async function akhiriDanNilai() {
    setGrading(true);
    setError(null);
    const res = await fetch("/api/nilai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.id }),
    });
    if (!res.ok) {
      setError("Gagal menilai. Coba lagi.");
      setGrading(false);
      setShowConfirm(false);
      return;
    }
    router.push(`/hasil/${session.id}`);
  }

  return (
    <div className="flex h-dvh flex-col bg-bg-soft">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-line bg-white px-4 py-3">
        <Link
          href="/beranda"
          className="grid size-9 place-items-center rounded-lg text-muted hover:bg-bg-soft"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-bold text-ink">
            {session.mapel}
          </p>
          {session.topik && (
            <p className="truncate text-xs text-muted">Topik: {session.topik}</p>
          )}
        </div>
        <div className="hidden items-center gap-1.5 text-sm text-muted sm:flex">
          <Clock size={15} />
          {durasi}
        </div>
        <button
          onClick={() => setShowConfirm(true)}
          className="flex items-center gap-1.5 rounded-xl border-2 border-primary px-3 py-1.5 text-sm font-semibold text-primary transition hover:bg-accent-soft"
        >
          <CheckCircle2 size={16} />
          <span className="hidden sm:inline">Akhiri & Nilai</span>
          <span className="sm:hidden">Nilai</span>
        </button>
      </header>

      {/* Pesan */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-5">
          {messages.map((m, i) =>
            m.peran === "assistant" ? (
              <AiBubble
                key={i}
                isi={m.isi}
                pemantik={m.is_pemantik}
                saved={savedIdx === i}
                onSave={() => simpanCatatan(m.isi, i)}
                messageId={m.id}
                userId={userId}
              />
            ) : (
              <UserBubble
                key={i}
                isi={m.isi}
                inisial={inisial}
                lampiranNama={m.lampiran_nama}
                lampiranTipe={m.lampiran_tipe}
              />
            ),
          )}

          {streaming !== null && (
            <div className="flex gap-2.5">
              <Avatar ai />
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-accent-soft px-4 py-3 text-[15px] leading-relaxed text-primary-press">
                {streaming === "" ? <ThinkingDots /> : <Markdown teks={streaming} />}
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-xl bg-coral/10 px-4 py-3 text-sm text-coral">
              {error}
            </p>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-line bg-white px-4 py-3">
        {berkas && (
          <div className="mx-auto mb-2 flex max-w-2xl items-center gap-2 rounded-xl bg-bg-soft px-3 py-2">
            {berkas.type === "application/pdf" ? (
              <FileText size={16} className="shrink-0 text-primary" />
            ) : (
              <ImageIcon size={16} className="shrink-0 text-primary" />
            )}
            <span className="min-w-0 flex-1 truncate text-sm text-ink">
              {berkas.name}
            </span>
            <span className="shrink-0 text-xs text-muted">
              {(berkas.size / 1024 / 1024).toFixed(1)} MB
            </span>
            <button
              onClick={() => pilihBerkas(null)}
              disabled={mengunggah}
              className="grid size-6 shrink-0 place-items-center rounded-full text-muted hover:bg-white hover:text-coral"
              aria-label="Batalkan lampiran"
            >
              <X size={14} />
            </button>
          </div>
        )}
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            accept={TIPE_BOLEH.join(",")}
            className="hidden"
            onChange={(e) => pilihBerkas(e.target.files?.[0] ?? null)}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy || mengunggah}
            title="Lampirkan foto soal atau PDF"
            className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-line text-muted transition hover:border-primary hover:text-primary disabled:opacity-50"
          >
            <Paperclip size={20} />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                kirim();
              }
            }}
            rows={1}
            placeholder={
              berkas
                ? "Bagian mana yang bikin bingung?"
                : "Tanyakan apa saja ke Dialektika..."
            }
            className="max-h-32 flex-1 resize-none rounded-2xl border-2 border-line bg-bg-soft px-4 py-3 text-base outline-none focus:border-primary"
          />
          <button
            onClick={kirim}
            disabled={busy || mengunggah || (!input.trim() && !berkas)}
            className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-white shadow-tosca transition hover:bg-primary-press disabled:opacity-50"
          >
            {busy || mengunggah ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
        <p className="mx-auto mt-2 max-w-2xl text-center text-[11px] text-muted">
          {mengunggah
            ? "Mengunggah file..."
            : "AI bisa keliru. Tinjau informasi penting."}
        </p>
      </div>

      {/* Dialog konfirmasi */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="font-display text-lg font-bold text-ink">
              Akhiri sesi ini?
            </h3>
            <p className="mt-2 text-sm text-muted">
              Dialektika akan menilai pemahamanmu dan memberi skor. Sesi yang
              sudah dinilai tidak bisa dilanjutkan.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={grading}
                className="flex-1 rounded-xl border-2 border-line py-3 font-semibold text-muted"
              >
                Batal
              </button>
              <button
                onClick={akhiriDanNilai}
                disabled={grading}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-white"
              >
                {grading && <Loader2 size={16} className="animate-spin" />}
                Ya, Nilai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Avatar({ ai, inisial }: { ai?: boolean; inisial?: string }) {
  return (
    <span
      className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
        ai ? "bg-primary text-white" : "bg-ink text-white"
      }`}
    >
      {ai ? "AI" : inisial}
    </span>
  );
}

function AiBubble({
  isi,
  pemantik,
  saved,
  onSave,
  messageId,
  userId,
}: {
  isi: string;
  pemantik?: boolean;
  saved: boolean;
  onSave: () => void;
  messageId?: string;
  userId: string;
}) {
  return (
    <div className="flex gap-2.5">
      <Avatar ai />
      <div className="max-w-[85%]">
        {pemantik && (
          <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary-press">
            <Lightbulb size={12} /> Pertanyaan Pemantik
          </span>
        )}
        <div className="rounded-2xl rounded-tl-sm bg-accent-soft px-4 py-3 text-[15px] leading-relaxed text-primary-press">
          <Markdown teks={isi} />
        </div>
        <button
          onClick={onSave}
          className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted transition hover:bg-bg-soft hover:text-primary"
        >
          {saved ? (
            <>
              <Check size={14} className="text-success-ink" /> Tersimpan
            </>
          ) : (
            <>
              <Bookmark size={14} /> Simpan ke Catatan
            </>
          )}
        </button>
        <FeedbackJawaban messageId={messageId} userId={userId} />
      </div>
    </div>
  );
}

function UserBubble({
  isi,
  inisial,
  lampiranNama,
  lampiranTipe,
}: {
  isi: string;
  inisial: string;
  lampiranNama?: string | null;
  lampiranTipe?: string | null;
}) {
  return (
    <div className="flex flex-row-reverse gap-2.5">
      <Avatar inisial={inisial} />
      <div className="max-w-[85%] rounded-2xl rounded-tr-sm border border-line bg-white px-4 py-3 text-[15px] leading-relaxed text-ink">
        {lampiranNama && (
          <span
            className={`inline-flex max-w-full items-center gap-1.5 rounded-lg bg-bg-soft px-2 py-1 text-xs text-muted ${
              isi ? "mb-2" : ""
            }`}
          >
            {lampiranTipe === "application/pdf" ? (
              <FileText size={13} className="shrink-0 text-primary" />
            ) : (
              <ImageIcon size={13} className="shrink-0 text-primary" />
            )}
            <span className="truncate">{lampiranNama}</span>
          </span>
        )}
        {isi && <span className="block whitespace-pre-wrap">{isi}</span>}
      </div>
    </div>
  );
}

function ThinkingDots() {
  return (
    <span className="flex items-center gap-1 py-1">
      <span className="thinking-dot size-2 rounded-full bg-primary" />
      <span className="thinking-dot size-2 rounded-full bg-primary" />
      <span className="thinking-dot size-2 rounded-full bg-primary" />
    </span>
  );
}