import Link from "next/link";
import { ACTIVE_LANGS, LANGS, LANG_LABEL, type Lang } from "@/lib/types";

const NATIVE_NAME: Record<Lang, string> = {
  es: "Español",
  fr: "Français",
  zh: "中文",
  en: "English",
};

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">PhrasePop</h1>
        <p className="text-slate-600 dark:text-slate-300">
          フレーズを聞いて、単語の意味と動詞の活用をまとめて覚える。
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">言語を選ぶ</h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {LANGS.map((lang) => {
            const active = ACTIVE_LANGS.includes(lang);
            const card = (
              <div
                className={[
                  "flex h-full flex-col gap-1 rounded-xl border p-5 transition-colors",
                  active
                    ? "border-slate-300 bg-white hover:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-white"
                    : "border-dashed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-600",
                ].join(" ")}
              >
                <span className="text-xl font-semibold">{LANG_LABEL[lang]}</span>
                <span className="text-sm opacity-70">{NATIVE_NAME[lang]}</span>
                {!active && <span className="mt-2 text-xs">準備中</span>}
              </div>
            );

            return (
              <li key={lang}>
                {active ? (
                  <Link href={`/study/${lang}`} className="block h-full">
                    {card}
                  </Link>
                ) : (
                  <div aria-disabled className="h-full cursor-not-allowed">
                    {card}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">活用ドリル</h2>
        <ul className="flex flex-wrap gap-3">
          {ACTIVE_LANGS.map((lang) => (
            <li key={lang}>
              <Link
                href={`/drill/${lang}`}
                className="inline-block rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
              >
                {LANG_LABEL[lang]}の動詞活用
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
