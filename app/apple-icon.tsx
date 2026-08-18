import { ImageResponse } from "next/og";
import { LOGO_DATA_URI } from "@/lib/logo-data-uri";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS memberi sudut membulat sendiri, jadi latarnya dibuat penuh warna tosca
// supaya sudut membulat bawaan logo tidak terlihat dobel.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#14b8a6",
        }}
      >
        <img src={LOGO_DATA_URI} width={180} height={180} alt="" />
      </div>
    ),
    size,
  );
}
