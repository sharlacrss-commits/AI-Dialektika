import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { ProfilForm } from "@/components/ProfilForm";
import { Cpu, ChevronRight } from "lucide-react";

export default async function ProfilPage() {
  const { profile, user } = await requireProfile();

  return (
    <div className="mx-auto max-w-xl px-5 py-8 sm:px-8">
      <h1 className="font-display text-2xl font-bold text-ink">Profil</h1>

      <div className="mt-6 flex items-center gap-4 rounded-2xl border border-line bg-white p-5">
        <span className="grid size-16 place-items-center rounded-full bg-primary font-display text-xl font-bold text-white">
          {(profile.nama ?? "S").slice(0, 2).toUpperCase()}
        </span>
        <div>
          <p className="font-display text-lg font-bold text-ink">
            {profile.nama}
          </p>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Info label="Kode siswa" value={profile.kode_siswa ?? "-"} />
        <Info label="Kelas" value={profile.kelas ?? "-"} />
        <Info label="Sekolah" value={profile.sekolah ?? "-"} />
      </div>

      {profile.role === "admin" && (
        <Link
          href="/pengaturan"
          className="mt-4 flex items-center gap-3 rounded-xl border border-line bg-white p-4 transition hover:shadow-tosca-sm"
        >
          <span className="grid size-9 place-items-center rounded-lg bg-accent-soft text-primary-press">
            <Cpu size={18} />
          </span>
          <span className="flex-1">
            <span className="block font-semibold text-ink">
              Pengaturan Model AI
            </span>
            <span className="text-sm text-muted">
              Ganti model Sumopod (khusus admin)
            </span>
          </span>
          <ChevronRight size={18} className="text-muted" />
        </Link>
      )}

      <ProfilForm namaAwal={profile.nama ?? ""} userId={user.id} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 font-semibold text-ink">{value}</p>
    </div>
  );
}
