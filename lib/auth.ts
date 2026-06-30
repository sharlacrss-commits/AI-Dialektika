import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

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
