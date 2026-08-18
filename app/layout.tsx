import type { Metadata, Viewport } from "next";
import { Poppins, Inter } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const DESKRIPSI =
  "AI tutor untuk siswa SMA yang mengajakmu berpikir, bukan sekadar memberi jawaban.";

export const metadata: Metadata = {
  // Dipakai Next.js untuk membuat URL absolut pada tautan OG & ikon.
  metadataBase: new URL("https://dialektika.study"),
  title: {
    default: "Dialektika - Teman Belajar Berpikir",
    template: "%s | Dialektika",
  },
  description: DESKRIPSI,
  applicationName: "Dialektika",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Dialektika",
    locale: "id_ID",
    url: "/",
    title: "Dialektika - Teman Belajar Berpikir",
    description: DESKRIPSI,
  },
  twitter: {
    card: "summary_large_image",
    title: "Dialektika - Teman Belajar Berpikir",
    description: DESKRIPSI,
  },
};

export const viewport: Viewport = {
  themeColor: "#14b8a6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${poppins.variable} ${inter.variable} h-full`}>
      <body className="min-h-full font-sans antialiased">{children}</body>
    </html>
  );
}
