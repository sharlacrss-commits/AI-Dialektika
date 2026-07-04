import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Daftar model Sumopod untuk dropdown di halaman Pengaturan (admin).
// Sumopod kompatibel OpenAI: endpoint /v1/models mengembalikan { data: [{ id }] }.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Belum masuk", { status: 401 });

  const res = await fetch("https://ai.sumopod.com/v1/models", {
    headers: { Authorization: `Bearer ${process.env.SUMOPOD_API_KEY}` },
  });
  if (!res.ok) return new Response("Gagal mengambil daftar model", { status: 502 });

  const data = await res.json();
  const models = (data.data ?? [])
    .map((m: { id: string; name?: string }) => ({
      id: m.id,
      name: m.name ?? m.id,
      gratis: false, // Sumopod berbayar per-token, tidak ada model gratis
    }))
    .sort((a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id));

  return Response.json({ models });
}
