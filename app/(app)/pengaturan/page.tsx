import { requireProfile } from "@/lib/auth";
import { PengaturanModel } from "@/components/PengaturanModel";
import { ShieldAlert } from "lucide-react";

export default async function PengaturanPage() {
  const { supabase, profile } = await requireProfile();

  if (profile.role !== "admin") {
    return (
      <div className="mx-auto max-w-xl px-5 py-12 text-center sm:px-8">
        <ShieldAlert size={36} className="mx-auto text-muted" />
        <h1 className="mt-3 font-display text-xl font-bold text-ink">
          Halaman khusus admin
        </h1>
        <p className="mt-1 text-muted">
          Pengaturan model AI hanya bisa diakses oleh peneliti/admin.
        </p>
      </div>
    );
  }

  const { data: setting } = await supabase
    .from("app_settings")
    .select("chat_model, fallback_model")
    .eq("id", "global")
    .single();

  return (
    <PengaturanModel
      chatAwal={setting?.chat_model ?? ""}
      fallbackAwal={setting?.fallback_model ?? ""}
    />
  );
}
