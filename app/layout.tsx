import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PhrasePop",
  description: "フレーズを聞いて、単語の意味と動詞の活用をまとめて覚える学習アプリ。",
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
