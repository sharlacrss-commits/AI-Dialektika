import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Daftar model OpenRouter untuk dropdown di halaman Pengaturan (admin).
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Belum masuk", { status: 401 });

  const res = await fetch("https://openrouter.ai/api/v1/models", {
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
  });
  if (!res.ok) return new Response("Gagal mengambil daftar model", { status: 502 });

  const data = await res.json();
  const models = (data.data ?? [])
    .map((m: { id: string; name?: string; pricing?: { prompt?: string } }) => ({
      id: m.id,
      name: m.name ?? m.id,
      gratis: m.pricing?.prompt === "0" || m.id.endsWith(":free"),
    }))
    .sort((a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id));

  return Response.json({ models });
}
