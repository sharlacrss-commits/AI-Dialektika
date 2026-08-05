import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/types";

// Pastikan ada user login. Kalau tidak, lempar ke /masuk.
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");
  return { supabase, user };
}

// Pastikan user login DAN sudah onboarding. Kembalikan profilnya.
export async function requireProfile() {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.onboarded) redirect("/onboarding");
  return { supabase, user, profile: profile as Profile };
}

// Pastikan pemakainya punya salah satu role yang diizinkan.
//
// Halaman guru/admin memakai ini alih-alih memeriksa `profile.role`
// sendiri-sendiri, supaya tidak ada halaman yang lupa mengizinkan admin
// atau malah keliru mengizinkan siswa.
export async function requireRole(izin: readonly Role[]) {
  const hasil = await requireProfile();
  if (!izin.includes(hasil.profile.role)) {
    // Sengaja dialihkan ke beranda, bukan menampilkan "akses ditolak":
    // siswa tidak perlu tahu halaman ini ada.
    redirect("/beranda");
  }
  return hasil;
}

// Guru dan admin: boleh memantau siswa di sekolahnya.
export function requirePemantau() {
  return requireRole(["guru", "admin"]);
}

// Admin saja: setelan model AI, metrik performa, ekspor data penelitian.
export function requireAdmin() {
  return requireRole(["admin"]);
}
