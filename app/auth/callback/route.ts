import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Tempat Google mengembalikan siswa setelah menekan "Masuk dengan Google".
// Supabase mengirim ?code=..., dan kode itu HARUS ditukar jadi sesi login
// di server supaya cookie-nya terbaca oleh middleware dan Server Component.
//
// PENTING saat menyiapkan Supabase:
//   Authentication > URL Configuration > Redirect URLs, tambahkan:
//     http://localhost:3000/auth/callback
//     https://<domain-produksi>/auth/callback
//   Tanpa itu Google mengembalikan error "redirect_uri_mismatch".
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/beranda";

  // Google/Supabase bisa membalas dengan error, mis. siswa menekan "Batal".
  const error = searchParams.get("error_description") ?? searchParams.get("error");
  if (error) {
    return NextResponse.redirect(
      `${origin}/masuk?galat=${encodeURIComponent(error)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/masuk?galat=${encodeURIComponent("Kode login tidak diterima. Coba masuk lagi.")}`,
    );
  }

  const supabase = await createClient();
  const { error: gagal } = await supabase.auth.exchangeCodeForSession(code);
  if (gagal) {
    return NextResponse.redirect(
      `${origin}/masuk?galat=${encodeURIComponent(gagal.message)}`,
    );
  }

  // Pengalihan memakai path relatif terhadap origin permintaan, bukan URL
  // dari parameter, supaya tidak bisa dipakai mengarahkan siswa ke situs lain.
  const tujuan = next.startsWith("/") ? next : "/beranda";
  return NextResponse.redirect(`${origin}${tujuan}`);
}
