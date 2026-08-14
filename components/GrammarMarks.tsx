"use client";

import { PERSON_SPEC, type TenseStyle } from "@/lib/grammar";
import type { Person } from "@/lib/types";

/**
 * 色と記号だけで文法情報を伝えるための部品。
 * 文字での説明は単語カードの中だけにして、フレーズ本体は色とアイコンで読ませる。
 */

/**
 * 人称アイコン。人型ひとつ = 単数、ふたつ = 複数。数字が人称。
 * 動詞の真上に小さく出す。
 */
export function PersonMark({ person, color }: { person: Person; color: string }) {
  const spec = PERSON_SPEC[person];
  return (
    <span
      className="inline-flex items-center gap-px leading-none"
      style={{ color }}
      title={spec.label}
      aria-label={spec.label}
    >
      <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
        <circle cx="7" cy="5.5" r="3.2" />
        <path d="M1.2 17c0-3.2 2.6-5.4 5.8-5.4s5.8 2.2 5.8 5.4z" />
        {spec.plural && (
          <>
            <circle cx="15" cy="6.5" r="2.6" />
            <path d="M10.6 17c0-2.7 2-4.6 4.4-4.6 2.4 0 4.4 1.9 4.4 4.6z" />
          </>
        )}
      </svg>
      <span className="text-[9px] font-bold tabular-nums">{spec.numeral}</span>
    </span>
  );
}

/**
 * 法・時制を表す色チップ。単語カードの中では文字ラベルも添える。
 */
export function TenseChip({
  style,
  showLabel = true,
}: {
  style: TenseStyle;
  showLabel?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: "color-mix(in srgb, var(--tense) 16%, transparent)",
        color: "var(--tense)",
        // ライト／ダークで色を差し替える。globals.css の @media 側で --tense を上書きする。
        ["--tense" as string]: style.color,
        ["--tense-dark" as string]: style.colorDark,
      }}
      data-tense-chip
    >
      <span
        className="inline-block h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: "var(--tense)" }}
        aria-hidden
      />
      {showLabel && style.label}
    </span>
  );
}

/** 不規則活用であることを示すバッジ。 */
export function IrregularMark({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold"
      style={{
        backgroundColor: "color-mix(in srgb, var(--irr) 16%, transparent)",
        color: "var(--irr)",
      }}
      data-irregular-mark
    >
      <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
        <path d="M10 1.6 19 18H1z" opacity="0.25" />
        <path d="M10 1.6 19 18H1zm0 4.6a1 1 0 0 0-1 1v4a1 1 0 1 0 2 0v-4a1 1 0 0 0-1-1zm0 8.2a1.15 1.15 0 1 0 0 2.3 1.15 1.15 0 0 0 0-2.3z" />
      </svg>
      {label}
    </span>
  );
}
