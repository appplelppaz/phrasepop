"use client";

import type { Phrase } from "@/lib/types";

/**
 * フレーズ本文。トークンをクリックすると該当語をハイライトする。
 * 意味を持つトークンだけがクリックできる（機能語は素通し）。
 */
export function PhraseCard({
  phrase,
  activeIndex,
  onSelect,
  dimmed,
}: {
  phrase: Phrase;
  activeIndex: number | null;
  onSelect: (index: number | null) => void;
  dimmed?: boolean;
}) {
  // トークンが覆っていない範囲（空白・句読点）も表示するため、隙間を埋めながら描画する。
  const parts: React.ReactNode[] = [];
  let cursor = 0;

  phrase.tokens.forEach((token, i) => {
    if (token.start > cursor) {
      parts.push(<span key={`gap-${i}`}>{phrase.text.slice(cursor, token.start)}</span>);
    }

    const text = phrase.text.slice(token.start, token.end);
    if (!token.gloss) {
      parts.push(<span key={`t-${i}`}>{text}</span>);
    } else {
      const active = activeIndex === i;
      parts.push(
        <button
          key={`t-${i}`}
          type="button"
          onClick={() => onSelect(active ? null : i)}
          className={[
            "rounded px-0.5 transition-colors",
            "underline decoration-dotted decoration-1 underline-offset-4",
            active
              ? "bg-amber-200 decoration-amber-500 dark:bg-amber-400/30"
              : "decoration-slate-400 hover:bg-slate-200/70 dark:decoration-slate-500 dark:hover:bg-slate-700/60",
          ].join(" ")}
        >
          {text}
        </button>,
      );
    }
    cursor = token.end;
  });

  if (cursor < phrase.text.length) {
    parts.push(<span key="gap-end">{phrase.text.slice(cursor)}</span>);
  }

  return (
    <p
      lang={phrase.lang}
      className={[
        "text-2xl leading-relaxed sm:text-3xl sm:leading-relaxed",
        dimmed ? "opacity-60" : "",
      ].join(" ")}
    >
      {parts}
    </p>
  );
}
