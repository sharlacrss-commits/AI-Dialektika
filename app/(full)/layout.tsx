import { requireProfile } from "@/lib/auth";

// Layout layar penuh (chat & hasil): cek auth + onboarding, tanpa navigasi.
export default async function FullLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireProfile();
  return <>{children}</>;
}
