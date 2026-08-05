import { requireProfile } from "@/lib/auth";
import { NavShell } from "@/components/NavShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Menu sidebar berbeda per role. Role dibaca di server dari profil,
  // bukan dari state di browser, supaya tidak bisa dipalsukan.
  const { profile } = await requireProfile();
  return <NavShell role={profile.role}>{children}</NavShell>;
}
