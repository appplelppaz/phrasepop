"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { IrregularMark, PersonMark, TenseChip } from "@/components/GrammarMarks";
import { IRREGULAR_LABEL, tenseStyle, type IrregularCode } from "@/lib/grammar";
import { getSpeech } from "@/lib/speech";
import { PERSONS, SPEECH_LANG, type Lang, type Person, type VerbTable } from "@/lib/types";

type Question = {
  lemma: string;
  ja: string;
  tense: string;
  person: Person;
  personIndex: number;
  answer: string;
};

/**
 * 動詞活用ドリル。
 *
 * 出題も答え合わせも data/{lang}/verbs.json だけを見るので、
 * 「答えとして表示される形」と「活用表の中身」が食い違うことはない。
 * 不規則活用のときは、規則どおりならどうなるはずかも合わせて出す。
 */
export function DrillClient({ lang, table }: { lang: Lang; table: VerbTable }) {
  const tenseKeys = useMemo(() => Object.keys(table.tenseLabels), [table]);
  const [selected, setSelected] = useState<string[]>([]);
  const [irregularOnly, setIrregularOnly] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState({ right: 0, total: 0 });

  const activeTenses = useMemo(
    () => (selected.length ? selected : tenseKeys),
    [selected, tenseKeys],
  );

  const nextQuestion = useCallback(() => {
    let picked: Question | null = null;

    for (let attempt = 0; attempt < 200 && !picked; attempt += 1) {
      const verb = table.verbs[Math.floor(Math.random() * table.verbs.length)];
      const tense = activeTenses[Math.floor(Math.random() * activeTenses.length)];
      const row = verb.forms[tense];
      if (!row || row.length < 6) continue;

      const filled = PERSONS.map((p, i) => [p, row[i], i] as const).filter(([, f]) => f);
      if (filled.length === 0) continue;

      const [person, answer, personIndex] = filled[Math.floor(Math.random() * filled.length)];

      // 「不規則だけ」を選んでいるときは、その人称が不規則な出題に絞る。
      if (irregularOnly) {
        const code = verb.irr?.[tense]?.codes?.[personIndex];
        if (!code || code === "R" || code === "-") continue;
      }

      picked = { lemma: verb.lemma, ja: verb.ja, tense, person, personIndex, answer };
    }

    setRevealed(false);
    setQuestion(picked);
  }, [table, activeTenses, irregularOnly]);

  useEffect(() => {
    nextQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.join(","), irregularOnly]);

  function answer(correct: boolean) {
    setScore((s) => ({ right: s.right + (correct ? 1 : 0), total: s.total + 1 }));
    nextQuestion();
  }

  const verb = question ? table.verbs.find((v) => v.lemma === question.lemma) : undefined;
  const irr = question && verb?.irr?.[question.tense];
  const code = irr?.codes?.[question!.personIndex] as IrregularCode | "R" | "-" | undefined;
  const isIrregular = code && code !== "R" && code !== "-";
  const irrTextIndex = irr?.idx?.[question?.personIndex ?? 0];
  const irrText = irrTextIndex == null ? null : irr?.texts?.[irrTextIndex];
  const style = question ? tenseStyle(lang, question.tense, table.tenseLabels[question.tense]) : null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-8 pt-3">
      <header className="flex items-center justify-between">
        <Link
          href="/"
          aria-label="言語を選ぶ"
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 4l-6 6 6 6" />
          </svg>
        </Link>
        <span className="text-sm tabular-nums text-slate-400">
          {score.right} / {score.total}
        </span>
      </header>

      <details className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-800">
        <summary className="cursor-pointer px-4 py-2.5 text-sm text-slate-500 dark:text-slate-400">
          出題範囲
        </summary>
        <div className="flex flex-col gap-3 border-t border-slate-200 p-4 dark:border-slate-800">
          <div className="flex flex-wrap gap-2">
            {tenseKeys.map((key) => {
              const s = tenseStyle(lang, key, table.tenseLabels[key]);
              const on = selected.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setSelected((prev) =>
                      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
                    )
                  }
                  data-tense-chip
                  className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs"
                  style={
                    {
                      ["--tense" as string]: s?.color,
                      ["--tense-dark" as string]: s?.colorDark,
                      borderColor: on ? "var(--tense)" : undefined,
                      backgroundColor: on ? "color-mix(in srgb, var(--tense) 14%, transparent)" : undefined,
                      color: on ? "var(--tense)" : undefined,
                    } as React.CSSProperties
                  }
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: "var(--tense)" }}
                    aria-hidden
                  />
                  {table.tenseLabels[key]}
                </button>
              );
            })}
          </div>
          <label className="flex items-center justify-between text-sm">
            <span>不規則活用だけ出す</span>
            <input
              type="checkbox"
              checked={irregularOnly}
              onChange={(e) => setIrregularOnly(e.target.checked)}
              className="h-5 w-5"
            />
          </label>
        </div>
      </details>

      {!question ? (
        <p className="py-24 text-center text-slate-400">
          この条件で出題できる形がありません。範囲を広げてください。
        </p>
      ) : (
        <section className="flex flex-1 flex-col items-center justify-center gap-7 py-8 text-center">
          <div className="flex flex-col items-center gap-1">
            <span lang={lang} className="text-4xl font-bold">
              {question.lemma}
            </span>
            <span className="text-sm text-slate-400">{question.ja}</span>
          </div>

          {/* 何を答えるか — 色と人称アイコンで示す */}
          <div className="flex items-center gap-3">
            {style && <TenseChip style={style} />}
            <span
              className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800"
              style={
                { ["--tense" as string]: style?.color, ["--tense-dark" as string]: style?.colorDark } as React.CSSProperties
              }
              data-tense-chip
            >
              <PersonMark person={question.person} color="currentColor" />
            </span>
          </div>

          {revealed ? (
            <div className="flex w-full flex-col items-center gap-5">
              <button
                type="button"
                onClick={() =>
                  void getSpeech().speak(question.answer, { lang: SPEECH_LANG[lang], rate: 0.85 })
                }
                lang={lang}
                className="text-4xl font-semibold"
                style={
                  style
                    ? ({
                        ["--tense" as string]: style.color,
                        ["--tense-dark" as string]: style.colorDark,
                        color: "var(--tense)",
                        textDecorationLine: "underline",
                        textDecorationColor: isIrregular ? "var(--irr)" : "var(--tense)",
                        textDecorationStyle: isIrregular ? "wavy" : "solid",
                        textUnderlineOffset: "8px",
                      } as React.CSSProperties)
                    : undefined
                }
                data-tense-chip
                data-irregular-underline={isIrregular ? "" : undefined}
              >
                {question.answer}
              </button>

              {isIrregular && (
                <div className="flex w-full flex-col items-center gap-2">
                  <IrregularMark label={IRREGULAR_LABEL[code as IrregularCode]} />
                  {irrText && (
                    <p
                      className="w-full rounded-xl px-3 py-2 text-sm"
                      data-irregular-mark
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--irr) 10%, transparent)",
                        color: "var(--irr)",
                      }}
                    >
                      {irrText}
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-center gap-8 pt-2">
                <button
                  type="button"
                  onClick={() => answer(false)}
                  aria-label="間違えた"
                  className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-slate-300 text-slate-400 active:scale-95 dark:border-slate-700"
                >
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                    <path d="M5 5l14 14M19 5L5 19" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => answer(true)}
                  aria-label="正解した"
                  className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-slate-900 text-slate-900 active:scale-95 dark:border-white dark:text-white"
                >
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <circle cx="12" cy="12" r="8.5" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="rounded-full bg-slate-900 px-10 py-3.5 font-semibold text-white dark:bg-white dark:text-slate-900"
            >
              答えを見る
            </button>
          )}
        </section>
      )}
    </main>
  );
}
