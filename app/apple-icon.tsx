import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * iPhone のホーム画面に出るアイコン。
 *
 * 角は丸めない。iOS が自分でマスクをかけるので、こちらで丸めると二重になる。
 * 下の 4 本の帯は lib/grammar.ts の法ごとの色（直説法=青 / 条件法=琥珀 /
 * 接続法=紫 / 命令法=赤）で、アプリ内の活用の色分けと揃えてある。
 */
export default function AppleIcon() {
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
        }}
      >
        <div style={{ display: "flex", fontSize: 96, fontWeight: 700, lineHeight: 1 }}>
          P
        </div>
        <div style={{ display: "flex", marginTop: 14 }}>
          {["#38bdf8", "#fbbf24", "#c4b5fd", "#fda4af"].map((c) => (
            <div
              key={c}
              style={{ width: 20, height: 6, borderRadius: 3, background: c, marginLeft: 4 }}
            />
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
