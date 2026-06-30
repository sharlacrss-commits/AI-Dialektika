"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Plus, Loader2 } from "lucide-react";

export function NewNoteButton({ userId }: { userId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function buat() {
    setLoading(true);
    const { data } = await supabase
      .from("notes")
      .insert({ user_id: userId, judul: "Catatan baru", isi: "" })
      .select("id")
      .single();
    if (data) router.push(`/catatan/${data.id}`);
    else setLoading(false);
  }

  return (
    <button
      onClick={buat}
      disabled={loading}
      className="fixed bottom-24 right-5 z-30 grid size-14 place-items-center rounded-full bg-primary text-white shadow-tosca transition hover:bg-primary-press lg:bottom-8 lg:right-8"
      aria-label="Catatan baru"
    >
      {loading ? <Loader2 className="animate-spin" /> : <Plus size={26} />}
    </button>
  );
}
