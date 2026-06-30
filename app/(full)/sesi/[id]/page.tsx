import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChatClient } from "@/components/ChatClient";
import type { Message, Session } from "@/lib/types";

export default async function SesiPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");

  const { data: sesi } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!sesi) notFound();
  if (sesi.status === "selesai") redirect(`/hasil/${id}`);

  const { data: pesan } = await supabase
    .from("messages")
    .select("*")
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  const { data: profile } = await supabase
    .from("profiles")
    .select("nama")
    .eq("id", user.id)
    .single();

  return (
    <ChatClient
      session={sesi as Session}
      initialMessages={(pesan ?? []) as Message[]}
      userId={user.id}
      nama={profile?.nama ?? "Kamu"}
    />
  );
}
