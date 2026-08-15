"use client";

import { PERSON_SPEC, type TenseStyle } from "@/lib/grammar";
import type { Person } from "@/lib/types";

/**
 * 色と記号だけで文法情報を伝えるための部品。
 * 文字での説明は単語カードの中だけにして、フレーズ本体は色とアイコンで読ませる。
 */

/**
 * 人称マーク。数字が人称、続く「単」「複」が単数・複数。
 *
 * 人型アイコンは使わない。小さすぎて実機で見えなかったため、
 * 時制の色のべた塗りに白抜き文字を載せて、離して持っても読めるようにしてある。
 * 数字だけにすると3人称単数と3人称複数が同じ表示になり（está と están の区別が
 * 付かなくなる）活用の学習にならないので、単複の1文字は残す。
 */
export function PersonMark({ person, color }: { person: Person; color: string }) {
  const spec = PERSON_SPEC[person];
  return (
    <span
      // whitespace-nowrap が要る。語の上に絶対配置すると箱の幅が語の幅から
      // 計算されるため、短い語（fue, van など）の上では「3単」が2行に折り返して
      // 語に重なる。
      className="inline-flex items-center whitespace-nowrap rounded-full px-1.5 py-px text-[12px] font-bold leading-[1.4] tabular-nums text-white"
      style={{ backgroundColor: color }}
      title={spec.label}
      aria-label={spec.label}
    >
      {spec.numeral}
      {spec.plural ? "複" : "単"}
    </span>
  );
}

/**
 * 法・時制を表す色チップ。単語カードの中では文字ラベルも添える。
 *
 * 単語カードで一番読ませたい情報なので、薄い地に同系色の文字ではなく
 * べた塗りに白抜きにしてコントラストを最大に取る。
 */
export function TenseChip({ style }: { style: TenseStyle }) {
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-[13px] font-semibold text-white"
      style={{
        backgroundColor: "var(--tense)",
        ["--tense" as string]: style.color,
        ["--tense-dark" as string]: style.colorDark,
      }}
      data-tense-chip
    >
      {style.label}
    </span>
  );
}

/** 不規則活用であることを示すバッジ。 */
export function IrregularMark({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[13px] font-semibold"
      style={{
        backgroundColor: "color-mix(in srgb, var(--irr) 12%, #fff)",
        borderColor: "color-mix(in srgb, var(--irr) 45%, #fff)",
        color: "#991b1b",
      }}
      data-irregular-mark
    >
      <svg width="12" height="12" viewBox="0 0 20 20" fill="var(--irr)" aria-hidden>
        <path d="M10 1.6 19 18H1zm0 4.6a1 1 0 0 0-1 1v4a1 1 0 1 0 2 0v-4a1 1 0 0 0-1-1zm0 8.2a1.15 1.15 0 1 0 0 2.3 1.15 1.15 0 0 0 0-2.3z" />
      </svg>
      {label}
    </span>
  );
}
