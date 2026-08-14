import type { Lang, Person } from "./types";

/**
 * 法と時制を「色」で、人称を「アイコン」で見分けるための対応表。
 *
 * 色の決め方:
 *   色相 = 法。青系 = 直説法 / 紫系 = 接続法 / 琥珀 = 条件法 / 赤 = 命令法 / 灰 = 非定形。
 *   同じ法の中では時制ごとに色味をずらす。
 * これで「青っぽい＝事実を述べている」「紫＝接続法」が一目で分かる。
 *
 * 言語をまたいで同じ意味の時制は同じ色にしてある（スペイン語の点過去と
 * フランス語の複合過去はどちらも「過去」の青）。両方を並行して学ぶときに色の意味がぶれない。
 */

export type MoodKey = "indicative" | "subjunctive" | "conditional" | "imperative" | "nonfinite";

export type TenseStyle = {
  /** 意味的な時制 id。言語をまたいで共有する。 */
  id: string;
  mood: MoodKey;
  moodLabel: string;
  /** 「直説法現在」のような表示名。言語ごとに違う。 */
  label: string;
  /** 明るい背景用の色。 */
  color: string;
  /** 暗い背景用の色。 */
  colorDark: string;
};

export const MOOD_LABEL: Record<MoodKey, string> = {
  indicative: "直説法",
  subjunctive: "接続法",
  conditional: "条件法",
  imperative: "命令法",
  nonfinite: "非定形",
};

/** 意味的な時制ごとの色。 */
const PALETTE: Record<string, { mood: MoodKey; color: string; colorDark: string }> = {
  pres: { mood: "indicative", color: "#0284c7", colorDark: "#38bdf8" }, // 現在（明るい青）
  past: { mood: "indicative", color: "#1d4ed8", colorDark: "#60a5fa" }, // 完了した過去（濃い青）
  impf: { mood: "indicative", color: "#0e7490", colorDark: "#22d3ee" }, // 未完了過去（青緑）
  perf: { mood: "indicative", color: "#0f766e", colorDark: "#2dd4bf" }, // 現在完了・複合過去
  plup: { mood: "indicative", color: "#1e3a8a", colorDark: "#93c5fd" }, // 大過去・過去完了
  fut: { mood: "indicative", color: "#4f46e5", colorDark: "#a5b4fc" }, // 未来（藍）
  cond: { mood: "conditional", color: "#b45309", colorDark: "#fbbf24" }, // 条件法（琥珀）
  subj: { mood: "subjunctive", color: "#7c3aed", colorDark: "#c4b5fd" }, // 接続法現在（紫）
  subjPast: { mood: "subjunctive", color: "#a21caf", colorDark: "#f0abfc" }, // 接続法過去
  subjPerf: { mood: "subjunctive", color: "#86198f", colorDark: "#e879f9" }, // 接続法完了
  imper: { mood: "imperative", color: "#be123c", colorDark: "#fda4af" }, // 命令法（赤）
  nonfin: { mood: "nonfinite", color: "#57534e", colorDark: "#a8a29e" }, // 不定詞・分詞（灰）
};

/** 時制キー → 意味的な時制 id。 */
const TENSE_ID: Record<Lang, Record<string, string>> = {
  es: {
    IND_PRES: "pres",
    IND_PRET: "past",
    IND_IMPF: "impf",
    IND_PERF: "perf",
    IND_PLUP: "plup",
    IND_FUT: "fut",
    COND: "cond",
    SUBJ_PRES: "subj",
    SUBJ_IMPF: "subjPast",
    SUBJ_PERF: "subjPerf",
    IMP: "imper",
    GER: "nonfin",
    PART: "nonfin",
  },
  fr: {
    PRES: "pres",
    PS: "past",
    PC: "perf",
    IMPF: "impf",
    PQP: "plup",
    FUT: "fut",
    COND: "cond",
    SUBJ: "subj",
    IMPER: "imper",
    PPRES: "nonfin",
    PPASSE: "nonfin",
  },
  zh: {},
  en: {},
};

/** 手書きラベル（不定詞・受動態など）に色を当てるための対応。 */
const LABEL_ID: [RegExp, string][] = [
  [/不定詞/, "nonfin"],
  [/分詞/, "nonfin"],
  [/命令/, "imper"],
  [/接続法/, "subj"],
  [/条件法/, "cond"],
  [/前未来|単純未来|未来/, "fut"],
  [/大過去|過去完了/, "plup"],
  [/複合過去|現在完了/, "perf"],
  [/半過去|線過去/, "impf"],
  [/過去/, "past"],
  [/現在/, "pres"],
];

/**
 * 時制キー（無ければラベル文字列）から表示用のスタイルを引く。
 * 活用表に無い形（不定詞・受動態など）でもラベルから色を推定する。
 */
export function tenseStyle(lang: Lang, tense: string | undefined, label: string): TenseStyle | null {
  let id = tense ? TENSE_ID[lang]?.[tense] : undefined;
  if (!id) id = LABEL_ID.find(([re]) => re.test(label))?.[1];
  if (!id) return null;

  const entry = PALETTE[id];
  return {
    id,
    mood: entry.mood,
    moodLabel: MOOD_LABEL[entry.mood],
    label,
    color: entry.color,
    colorDark: entry.colorDark,
  };
}

/** 設定画面の凡例。その言語に実在する時制だけを並べる。 */
export function legendFor(lang: Lang, tenseLabels: Record<string, string>): TenseStyle[] {
  const seen = new Set<string>();
  const out: TenseStyle[] = [];
  for (const [key, label] of Object.entries(tenseLabels)) {
    const style = tenseStyle(lang, key, label);
    if (!style) continue;
    const dedupeKey = `${style.id}:${label}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    out.push(style);
  }
  return out;
}

/* ------------------------------------------------------------------ 人称 */

/** 人称アイコンの形。数字は人称、人型の数は単複を表す。 */
export const PERSON_SPEC: Record<Person, { numeral: string; plural: boolean; label: string }> = {
  "1sg": { numeral: "1", plural: false, label: "1人称単数" },
  "2sg": { numeral: "2", plural: false, label: "2人称単数" },
  "3sg": { numeral: "3", plural: false, label: "3人称単数" },
  "1pl": { numeral: "1", plural: true, label: "1人称複数" },
  "2pl": { numeral: "2", plural: true, label: "2人称複数" },
  "3pl": { numeral: "3", plural: true, label: "3人称複数" },
};

/* ------------------------------------------------------------- 不規則活用 */

export type IrregularCode = "S" | "E" | "B" | "I";

export const IRREGULAR_LABEL: Record<IrregularCode, string> = {
  S: "語幹が不規則",
  E: "語尾が不規則",
  B: "語幹・語尾とも不規則",
  I: "不規則動詞",
};

/** 不規則な語を目立たせる色（法の色とぶつからないよう暖色の警告色にする）。 */
export const IRREGULAR_COLOR = "#dc2626";
export const IRREGULAR_COLOR_DARK = "#fca5a5";
