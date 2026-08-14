/**
 * PhrasePop のデータモデル。
 *
 * v1 で出題するのはスペイン語とフランス語だが、型は 4 言語すべてを表現できる形にしてある。
 * 中国語には活用が存在しないため、`Inflection.construction` にアスペクト・構文タグ
 * （了 / 过 / 着 / 把構文 / 被構文 / 成語）を入れて同じ枠で表示する。
 */

export const LANGS = ["es", "fr", "zh", "en"] as const;
export type Lang = (typeof LANGS)[number];

/** v1 で実際にフレーズバンクを持つ言語。 */
export const ACTIVE_LANGS: Lang[] = ["es", "fr"];

export type Level = "A1" | "A2" | "B1" | "B2";

/** ブラウザの音声合成に渡す BCP-47 タグ。 */
export const SPEECH_LANG: Record<Lang, string> = {
  es: "es-ES",
  fr: "fr-FR",
  zh: "zh-CN",
  en: "en-US",
};

export const LANG_LABEL: Record<Lang, string> = {
  es: "スペイン語",
  fr: "フランス語",
  zh: "中国語",
  en: "英語",
};

/**
 * 不規則活用の説明。scripts/lib/irregularity.mjs がビルド時に生成する。
 * 「本来の規則形」と実際の形の差分から作られるので、手書きの誤りが入らない。
 */
export type Irregularity = {
  /** S=語幹 / E=語尾 / B=両方 / I=規則形が存在しない不規則動詞 */
  code: "S" | "E" | "B" | "I";
  /** 「語幹の o が ue に変わる（pod- → pued-）」のような説明。 */
  text: string;
  /** 規則どおりならこうなったはずの形。 */
  regular?: string;
};

export type Inflection = {
  /** 画面に出す日本語ラベル。例: 「接続法現在・3人称単数」 */
  label: string;
  /** 直説法 / 接続法 / 命令法 / 条件法 など。 */
  mood?: string;
  /** 現在 / 点過去 / 線過去 / 未来 など。 */
  tense?: string;
  /** "1sg" 〜 "3pl"。活用表との突き合わせに使う。 */
  person?: Person;
  /** 中国語専用。アスペクト・構文タグ。 */
  construction?: string;
  irregular?: Irregularity;
};

export const PERSONS = ["1sg", "2sg", "3sg", "1pl", "2pl", "3pl"] as const;
export type Person = (typeof PERSONS)[number];

export type Gloss = {
  /** 原形・辞書形。動詞なら不定詞、名詞なら単数形。 */
  lemma: string;
  /** 品詞（日本語表記）。「動詞」「名詞」「形容詞」など。 */
  pos: string;
  /** 日本語の意味。1〜3 語義を「・」で連結する。 */
  ja: string;
  /** ピンイン（中国語のみ）。 */
  reading?: string;
  /** 熟語・成語・慣用句のとき true。 */
  idiom?: boolean;
  inflection?: Inflection;
  /** 「後ろは必ず接続法」のような補足。 */
  note?: string;
};

export type Token = {
  /** 表層形。熟語なら "ojalá que" のように複数語にまたがる。 */
  surface: string;
  /** Phrase.text 内の文字オフセット。validate-bank.mjs が自動計算する。 */
  start: number;
  end: number;
  /** undefined なら機能語（冠詞・前置詞など）。既定では意味カードを出さない。 */
  gloss?: Gloss;
};

export type Phrase = {
  id: string;
  lang: Lang;
  text: string;
  /** ピンイン（中国語のみ）。 */
  reading?: string;
  /** 自然な日本語訳。逐語訳しない。 */
  ja: string;
  level: Level;
  tags: string[];
  tokens: Token[];
  /** 一言の文法解説。特筆すべき点がなければ省略。 */
  grammar?: string;
};

export type PhraseBank = {
  lang: Lang;
  phrases: Phrase[];
};

/** 活用表。build-verb-tables.mjs がライブラリから生成する。 */
export type VerbEntry = {
  lemma: string;
  ja: string;
  /** 時制キー → 6 人称分の活用形。分詞など人称を持たないものは 1 要素。 */
  forms: Record<string, string[]>;
  /**
   * 不規則活用の判定（scripts/add-irregularity.mjs が生成）。
   * 規則的な時制はキーごと存在しない。
   * texts に説明の実体を置き、idx が人称ごとの添字を指す（規則的な人称は null）。
   */
  irr?: Record<
    string,
    { codes: string; summary: string; texts: string[]; idx: (number | null)[] }
  >;
  impersonal?: boolean;
  omit?: string[];
};

export type VerbTable = {
  lang: Lang;
  /** 時制キー → 日本語ラベル。 */
  tenseLabels: Record<string, string>;
  verbs: VerbEntry[];
};

export function isLang(value: string): value is Lang {
  return (LANGS as readonly string[]).includes(value);
}
