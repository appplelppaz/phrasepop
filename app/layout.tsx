import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PhrasePop",
  description: "フレーズを聞いて、単語の意味と動詞の活用をまとめて覚える学習アプリ。",
  // iOS でホーム画面から開いたときに Safari の UI を出さずに全画面で起動させる。
  // manifest.ts の display: "standalone" は iOS には効かないので、こちらが本体。
  appleWebApp: { capable: true, title: "PhrasePop", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
  // ノッチのある端末で端まで塗るため。上下の余白は globals.css の safe-area で見る。
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
