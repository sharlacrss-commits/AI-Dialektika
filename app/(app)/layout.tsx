import { requireProfile } from "@/lib/auth";
import { NavShell } from "@/components/NavShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireProfile();
  return <NavShell>{children}</NavShell>;
}
