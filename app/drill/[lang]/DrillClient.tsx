"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getSpeech } from "@/lib/speech";
import { LANG_LABEL, PERSONS, SPEECH_LANG, type Lang, type Person, type VerbTable } from "@/lib/types";

const PERSON_LABEL: Record<Person, string> = {
  "1sg": "1人称単数",
  "2sg": "2人称単数",
  "3sg": "3人称単数",
  "1pl": "1人称複数",
  "2pl": "2人称複数",
  "3pl": "3人称複数",
};

type Question = { lemma: string; ja: string; tense: string; person: Person; answer: string };

/**
 * 動詞活用ドリル。
 *
 * 出題も答え合わせも data/{lang}/verbs.json だけを見るので、
 * 「答えとして表示される形」と「活用表の中身」が食い違うことはない。
 */
export function DrillClient({ lang, table }: { lang: Lang; table: VerbTable }) {
  const tenseKeys = useMemo(() => Object.keys(table.tenseLabels), [table]);
  const [selected, setSelected] = useState<string[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState({ right: 0, total: 0 });

  const activeTenses = selected.length ? selected : tenseKeys;

  const nextQuestion = useCallback(() => {
    // 人称を持つ時制だけを出題対象にする（分詞は答えが 1 つしかないため）。
    const candidates: Question[] = [];
    for (let attempt = 0; attempt < 40 && candidates.length === 0; attempt += 1) {
      const verb = table.verbs[Math.floor(Math.random() * table.verbs.length)];
      const tense = activeTenses[Math.floor(Math.random() * activeTenses.length)];
      const row = verb.forms[tense];
      if (!row || row.length < 6) continue;

      const filled = PERSONS.map((p, i) => [p, row[i]] as const).filter(([, f]) => f);
      if (filled.length === 0) continue;

      const [person, answer] = filled[Math.floor(Math.random() * filled.length)];
      candidates.push({ lemma: verb.lemma, ja: verb.ja, tense, person, answer });
    }
    setRevealed(false);
    setQuestion(candidates[0] ?? null);
  }, [table, activeTenses]);

  useEffect(() => {
    nextQuestion();
    // 時制の選択が変わったら出題し直す。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.join(",")]);

  function answer(correct: boolean) {
    setScore((s) => ({ right: s.right + (correct ? 1 : 0), total: s.total + 1 }));
    nextQuestion();
  }

  function speakAnswer() {
    if (question) void getSpeech().speak(question.answer, { lang: SPEECH_LANG[lang], rate: 0.85 });
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-5 py-8">
      <header className="flex items-center justify-between gap-4">
        <Link href="/" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← 言語を選ぶ
        </Link>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {LANG_LABEL[lang]}の活用 · {score.right} / {score.total} 正解
        </div>
      </header>

      <details className="rounded-xl border border-slate-200 dark:border-slate-700">
        <summary className="cursor-pointer px-4 py-2 text-sm font-medium">
          出題する時制（未選択ならすべて）
        </summary>
        <div className="flex flex-wrap gap-2 border-t border-slate-200 p-4 dark:border-slate-700">
          {tenseKeys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() =>
                setSelected((prev) =>
                  prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
                )
              }
              className={[
                "rounded-md border px-2 py-1 text-xs",
                selected.includes(key)
                  ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                  : "border-slate-300 dark:border-slate-600",
              ].join(" ")}
            >
              {table.tenseLabels[key]}
            </button>
          ))}
        </div>
      </details>

      {!question ? (
        <p className="py-16 text-center text-slate-500 dark:text-slate-400">
          選んだ時制には出題できる形がありません。
        </p>
      ) : (
        <section className="flex flex-col items-center gap-6 rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-col gap-1">
            <span lang={lang} className="text-3xl font-bold">
              {question.lemma}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">{question.ja}</span>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            <span className="rounded-md bg-amber-100 px-2 py-1 text-sm font-medium text-amber-900 dark:bg-amber-400/15 dark:text-amber-200">
              {table.tenseLabels[question.tense]}
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-sm dark:bg-slate-800">
              {PERSON_LABEL[question.person]}
            </span>
          </div>

          {revealed ? (
            <div className="flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={speakAnswer}
                lang={lang}
                className="text-3xl font-semibold underline decoration-dotted underline-offset-8"
              >
                {question.answer}
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => answer(false)}
                  className="rounded-xl border border-slate-300 px-6 py-2 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
                >
                  間違えた
                </button>
                <button
                  type="button"
                  onClick={() => answer(true)}
                  className="rounded-xl bg-slate-900 px-6 py-2 text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  正解した
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="rounded-xl bg-slate-900 px-8 py-3 font-semibold text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              答えを見る
            </button>
          )}
        </section>
      )}
    </main>
  );
}
