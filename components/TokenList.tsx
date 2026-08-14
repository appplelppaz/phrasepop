"use client";

import type { Phrase } from "@/lib/types";
import { IdiomBadge, InflectionBadge } from "./InflectionBadge";

/**
 * 単語ごとの意味リスト。
 * 表層形・原形（辞書形）・品詞・意味・活用の種類をまとめて出す。
 * 機能語（冠詞・前置詞など）は gloss を持たないので既定では出さない。
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
        // 活用している語だけ「表層形 → 原形」を見せる。同じなら原形の再掲は省く。
        const showLemma = gloss.lemma.toLowerCase() !== token.surface.toLowerCase();

        return (
          <li key={index}>
            <button
              type="button"
              onClick={() => onSelect(active ? null : index)}
              className={[
                "w-full rounded-lg border p-3 text-left transition-colors",
                active
                  ? "border-amber-400 bg-amber-50 dark:border-amber-400/60 dark:bg-amber-400/10"
                  : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800",
              ].join(" ")}
            >
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span lang={phrase.lang} className="text-lg font-semibold">
                  {token.surface}
                </span>
                {showLemma && (
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    <span aria-hidden>→</span>{" "}
                    <span lang={phrase.lang} className="font-medium">
                      {gloss.lemma}
                    </span>
                  </span>
                )}
                {gloss.reading && (
                  <span className="text-sm text-slate-500 dark:text-slate-400">{gloss.reading}</span>
                )}
                <span className="text-xs text-slate-500 dark:text-slate-400">{gloss.pos}</span>
              </div>

              <div className="mt-1 text-base">{gloss.ja}</div>

              {(gloss.inflection || gloss.idiom || gloss.note) && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {gloss.inflection && <InflectionBadge inflection={gloss.inflection} />}
                  {gloss.idiom && <IdiomBadge />}
                  {gloss.note && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">{gloss.note}</span>
                  )}
                </div>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
