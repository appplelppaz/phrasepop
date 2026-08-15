"use client";

import { tenseStyle } from "@/lib/grammar";
import type { Phrase } from "@/lib/types";
import { PersonMark } from "./GrammarMarks";

/**
 * フレーズ本文。
 *
 * 文字での説明は入れず、色と記号だけで文法情報を伝える:
 *   - 活用している語の下線の色 = 法と時制（青系＝直説法 / 紫＝接続法 / 琥珀＝条件法 / 赤＝命令法）
 *   - 語の真上のマーク = 人称（数字が人称、単＝単数 / 複＝複数）
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
      <span
        key={`t-${i}`}
        className="relative inline-block"
        // --tense は人称マークと下線の両方が使うので、その共通の親であるここで定義する。
        // button 側に置くと、兄弟である人称マークから参照できない。
        style={
          style
            ? ({
                ["--tense" as string]: style.color,
                ["--tense-dark" as string]: style.colorDark,
              } as React.CSSProperties)
            : undefined
        }
      >
        {/* 人称マークは語の真上に重ねる */}
        {infl?.person && (
          // flex にしておくのが要点。ふつうの inline の箱にすると、この箱が行の高さぶん
          // 伸びてマークがベースラインまで押し下げられ、単語に重なってしまう。
          <span className="pointer-events-none absolute top-0.5 left-1/2 z-10 flex -translate-x-1/2">
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
        // 行間を広めに取っているのは、人称マークを語の真上に置く余白を作るため。
        // これを詰めるとマークが単語に重なる。
        "pt-5 text-[27px] leading-[2.45] tracking-tight",
        dimmed ? "opacity-50" : "",
      ].join(" ")}
    >
      {parts}
    </p>
  );
}
