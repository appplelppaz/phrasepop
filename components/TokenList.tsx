"use client";

import { IRREGULAR_LABEL, tenseStyle } from "@/lib/grammar";
import type { Phrase } from "@/lib/types";
import { IrregularMark, PersonMark, TenseChip } from "./GrammarMarks";

/**
 * 単語ごとの意味リスト。
 * 表層形・原形（辞書形）・品詞・意味・法と時制・不規則活用の中身をまとめて出す。
 * 機能語（冠詞・前置詞など）は gloss を持たないので出さない。
 */
export function TokenList({
  phrase,
  activeIndex,
  onSelect,
}: {
  phrase: Phrase;
  activeIndex: number | null;
  onSelect: (index: number | null) => void;
}) {
  const entries = phrase.tokens
    .map((token, index) => ({ token, index }))
    .filter(({ token }) => token.gloss);

  if (entries.length === 0) return null;

  return (
    <ul className="flex flex-col gap-2">
      {entries.map(({ token, index }) => {
        const gloss = token.gloss!;
        const active = activeIndex === index;
        const infl = gloss.inflection;
        const style = infl ? tenseStyle(phrase.lang, infl.tense, infl.label) : null;
        const irregular = infl?.irregular;
        const showLemma = gloss.lemma.toLowerCase() !== token.surface.toLowerCase();

        return (
          <li key={index}>
            <button
              type="button"
              onClick={() => onSelect(active ? null : index)}
              // フレーズ本文から飛んでくるときの着地点。PhraseCard 側の word-<i> と対になる。
              // ヘッダーに隠れないよう少し上に余白を取る。
              id={`gloss-${index}`}
              className={[
                "w-full scroll-mt-20 rounded-2xl border p-4 text-left transition-colors",
                active
                  ? "border-amber-400 bg-amber-50 dark:border-amber-400/60 dark:bg-amber-400/10"
                  : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
              ].join(" ")}
              style={
                style
                  ? ({
                      ["--tense" as string]: style.color,
                      ["--tense-dark" as string]: style.colorDark,
                    } as React.CSSProperties)
                  : undefined
              }
              data-tense-chip={style ? "" : undefined}
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {infl?.person && <PersonMark person={infl.person} color="var(--tense)" />}
                <span
                  lang={phrase.lang}
                  className="text-lg font-semibold"
                  style={style ? { color: "var(--tense)" } : undefined}
                >
                  {token.surface}
                </span>
                {showLemma && (
                  <span className="text-sm text-slate-600">
                    <span aria-hidden>→</span>{" "}
                    <span lang={phrase.lang} className="font-medium">
                      {gloss.lemma}
                    </span>
                  </span>
                )}
                {gloss.reading && <span className="text-sm text-slate-600">{gloss.reading}</span>}
                <span className="text-[13px] text-slate-500">{gloss.pos}</span>
              </div>

              <div className="mt-1.5 text-base">{gloss.ja}</div>

              {/* 熟語の中の動詞。原形と活用は普通の動詞と同じように出す。 */}
              {gloss.verb && (
                <div className="mt-1.5 text-sm text-slate-600">
                  <span lang={phrase.lang} className="font-semibold text-slate-800">
                    {gloss.verb.surface}
                  </span>{" "}
                  <span aria-hidden>→</span>{" "}
                  <span lang={phrase.lang} className="font-medium">
                    {gloss.verb.lemma}
                  </span>
                  <span className="ml-1.5 text-[13px] text-slate-500">動詞</span>
                </div>
              )}

              {(style || gloss.idiom || irregular) && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {style && <TenseChip style={style} />}
                  {gloss.idiom && (
                    <span className="rounded-md bg-violet-100 px-2 py-0.5 text-[13px] font-semibold text-violet-900">
                      熟語
                    </span>
                  )}
                  {irregular && <IrregularMark label={IRREGULAR_LABEL[irregular.code]} />}
                </div>
              )}

              {/* 不規則活用の中身。規則形との差分を具体的に示す。
                  赤地に赤文字だと読めないので、赤は左の線に残して本文は濃い色にする。 */}
              {irregular && (
                <p
                  className="mt-2 rounded-r-lg border-l-[3px] py-2 pl-3 pr-3 text-[15px] leading-relaxed text-slate-800"
                  data-irregular-mark
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--irr) 8%, #fff)",
                    borderColor: "var(--irr)",
                  }}
                >
                  {irregular.text}
                </p>
              )}

              {gloss.note && <p className="mt-2 text-[13px] text-slate-600">{gloss.note}</p>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
