import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { LOGO_DATA_URI } from "@/lib/logo-data-uri";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Dialektika - Teman Belajar Berpikir";

// Gambar pratinjau saat tautan dialektika.study dibagikan ke WhatsApp,
// Instagram, X, dan sejenisnya. Pakai Poppins supaya sama dengan font
// judul di dalam aplikasi.
export default async function OpengraphImage() {
  const fontDir = path.join(process.cwd(), "public", "fonts");
  const [bold, regular] = await Promise.all([
    readFile(path.join(fontDir, "Poppins-Bold.ttf")),
    readFile(path.join(fontDir, "Poppins-Regular.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "0 96px",
          background: "#f0fdfa",
          fontFamily: "Poppins",
        }}
      >
        <img src={LOGO_DATA_URI} width={132} height={132} alt="" />
        <div
          style={{
            marginTop: 40,
            fontSize: 88,
            fontWeight: 700,
            color: "#0f766e",
            letterSpacing: "-0.02em",
          }}
        >
          Dialektika
        </div>
        <div
          style={{
            marginTop: 12,
            fontSize: 38,
            color: "#1f2937",
            maxWidth: 900,
            lineHeight: 1.35,
          }}
        >
          Teman belajar yang mengajakmu berpikir, bukan sekadar memberi jawaban.
        </div>
        <div style={{ marginTop: 40, fontSize: 30, color: "#6b7280" }}>
          dialektika.study
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Poppins", data: bold, weight: 700, style: "normal" },
        { name: "Poppins", data: regular, weight: 400, style: "normal" },
      ],
    },
  );
}
