import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { CatatanEditor } from "@/components/CatatanEditor";
import type { Note } from "@/lib/types";

export default async function CatatanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const { data: note } = await supabase
    .from("notes")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!note) notFound();

  return <CatatanEditor note={note as Note} />;
}
