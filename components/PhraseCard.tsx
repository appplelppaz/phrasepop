"use client";

import { tenseStyle } from "@/lib/grammar";
import type { Phrase } from "@/lib/types";
import { PersonMark } from "./GrammarMarks";

/**
 * フレーズ本文。
 *
 * 文字での説明は入れず、色と記号だけで文法情報を伝える:
 *   - 活用している語の下線の色 = 法と時制（青系＝直説法 / 紫＝接続法 / 琥珀＝条件法 / 赤＝命令法）
 *   - 語の真上の人型アイコン = 人称（人型ひとつ＝単数、ふたつ＝複数、数字が人称）
 *   - 不規則活用の語は下線が波線になり、赤い点が付く
 *
 * タップすると該当語がハイライトされ、下の単語カードと連動する。
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
  const parts: React.ReactNode[] = [];
  let cursor = 0;

  phrase.tokens.forEach((token, i) => {
    if (token.start > cursor) {
      parts.push(<span key={`gap-${i}`}>{phrase.text.slice(cursor, token.start)}</span>);
    }

    const text = phrase.text.slice(token.start, token.end);
    const gloss = token.gloss;

    if (!gloss) {
      parts.push(
        <span key={`t-${i}`} className="text-slate-400 dark:text-slate-500">
          {text}
        </span>,
      );
      cursor = token.end;
      return;
    }

    const active = activeIndex === i;
    const infl = gloss.inflection;
    const style = infl ? tenseStyle(phrase.lang, infl.tense, infl.label) : null;
    const irregular = infl?.irregular;

    parts.push(
      <span key={`t-${i}`} className="relative inline-block">
        {/* 人称アイコンは語の真上に重ねる */}
        {infl?.person && (
          <span className="pointer-events-none absolute -top-3.5 left-1/2 -translate-x-1/2">
            <PersonMark person={infl.person} color={style ? "var(--tense)" : "currentColor"} />
          </span>
        )}
        <button
          type="button"
          onClick={() => onSelect(active ? null : i)}
          data-tense-underline={style ? "" : undefined}
          data-irregular-underline={irregular ? "" : undefined}
          className={[
            "rounded px-0.5 transition-colors",
            style ? "font-medium" : "",
            active ? "bg-amber-200/70 dark:bg-amber-400/25" : "",
          ].join(" ")}
          style={
            style
              ? ({
                  ["--tense" as string]: style.color,
                  ["--tense-dark" as string]: style.colorDark,
                  color: "var(--tense)",
                  textDecorationLine: "underline",
                  textDecorationColor: irregular ? "var(--irr)" : "var(--tense)",
                  textDecorationStyle: irregular ? "wavy" : "solid",
                  textDecorationThickness: irregular ? "2px" : "3px",
                  textUnderlineOffset: "5px",
                } as React.CSSProperties)
              : { textDecorationLine: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "5px" }
          }
        >
          {text}
        </button>
      </span>,
    );
    cursor = token.end;
  });

  if (cursor < phrase.text.length) {
    parts.push(<span key="gap-end">{phrase.text.slice(cursor)}</span>);
  }

  return (
    <p
      lang={phrase.lang}
      className={[
        "pt-4 text-[27px] leading-[1.75] tracking-tight",
        dimmed ? "opacity-50" : "",
      ].join(" ")}
    >
      {parts}
    </p>
  );
}
