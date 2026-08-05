"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import {
  Home,
  FileText,
  History,
  TrendingUp,
  User,
  Users,
  Activity,
  Settings,
} from "lucide-react";
import type { Role } from "@/lib/types";

const NAV_SISWA = [
  { href: "/beranda", label: "Beranda", icon: Home },
  { href: "/catatan", label: "Catatan", icon: FileText },
  { href: "/riwayat", label: "Riwayat", icon: History },
  { href: "/perkembangan", label: "Perkembangan", icon: TrendingUp },
  { href: "/profil", label: "Profil", icon: User },
];

// Guru tidak butuh menu belajar (catatan, riwayat sesi pribadi). Menunya
// diganti seluruhnya, bukan ditambahi, supaya tidak membingungkan.
const NAV_GURU = [
  { href: "/guru", label: "Siswa", icon: Users },
  { href: "/guru/rekap", label: "Rekap", icon: TrendingUp },
  { href: "/profil", label: "Profil", icon: User },
];

const NAV_ADMIN = [
  { href: "/guru", label: "Siswa", icon: Users },
  { href: "/guru/rekap", label: "Rekap", icon: TrendingUp },
  { href: "/admin/ai", label: "Performa AI", icon: Activity },
  { href: "/pengaturan", label: "Pengaturan", icon: Settings },
  { href: "/profil", label: "Profil", icon: User },
];

function menuUntuk(role: Role) {
  if (role === "admin") return NAV_ADMIN;
  if (role === "guru") return NAV_GURU;
  return NAV_SISWA;
}

export function NavShell({
  children,
  role = "siswa",
}: {
  children: React.ReactNode;
  role?: Role;
}) {
  const pathname = usePathname();
  const NAV = menuUntuk(role);
  // Dicocokkan dari yang terpanjang, kalau tidak "/guru" ikut menyala saat
  // membuka "/guru/rekap" dan dua menu tampak aktif bersamaan.
  const terpanjang = NAV.map((n) => n.href)
    .filter((h) => pathname === h || pathname.startsWith(h + "/"))
    .sort((a, b) => b.length - a.length)[0];
  const isActive = (href: string) => href === terpanjang;

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-line bg-white px-4 py-6 lg:flex">
        <div className="px-2">
          <Logo size="md" withText />
        </div>
        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                isActive(href)
                  ? "bg-primary text-white shadow-tosca-sm"
                  : "text-muted hover:bg-bg-soft hover:text-ink"
              }`}
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Konten */}
      <main className="pb-24 lg:pb-0">{children}</main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-white/95 backdrop-blur lg:hidden">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
              isActive(href) ? "text-primary" : "text-muted"
            }`}
          >
            <Icon size={22} />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
