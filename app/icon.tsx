import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** ブラウザのタブに出る小さいアイコン。32px なので帯は 1 本だけにする。 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#020617",
          color: "#f8fafc",
          fontSize: 20,
          fontWeight: 700,
        }}
      >
        P
        <div style={{ display: "flex", width: 16, height: 3, background: "#38bdf8" }} />
      </div>
    ),
    { ...size },
  );
}
