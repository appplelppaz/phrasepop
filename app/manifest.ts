import type { MetadataRoute } from "next";

/**
 * ホーム画面に追加したときの見え方を決める。
 *
 * iOS でフルスクリーン起動させるのは manifest の display ではなく
 * app/layout.tsx の appleWebApp.capable なので、両方を揃えておく。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PhrasePop — フレーズで覚える",
    short_name: "PhrasePop",
    description:
      "フレーズを聞いて、単語の意味と動詞の活用をまとめて覚える学習アプリ。",
    lang: "ja",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#020617",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
