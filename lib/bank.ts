import type { Lang, Level, Phrase, PhraseBank, VerbTable } from "./types";

/** 言語ごとのフレーズバンクを遅延読み込みする。 */
export async function loadBank(lang: Lang): Promise<PhraseBank> {
  const mod = await import(`@/data/${lang}/phrases.json`);
  return (mod.default ?? mod) as PhraseBank;
}

/** 言語ごとの活用表を遅延読み込みする。 */
export async function loadVerbs(lang: Lang): Promise<VerbTable> {
  const mod = await import(`@/data/${lang}/verbs.json`);
  return (mod.default ?? mod) as VerbTable;
}

/**
 * フレーズバンクで実際に活用しているタイプの見出し語を集める。
 *
 * ドリルの出題範囲をこれに絞る。活用表にはフレーズで使っていない動詞も残っているので
 * （上級のフレーズを消しても活用表は消さない）、そのままだとドリルだけ
 * バンクの難易度と食い違ってしまう。フレーズを足せば自動で範囲も広がる。
 */
export function lemmasUsedIn(phrases: Phrase[]): Set<string> {
  const used = new Set<string>();
  for (const p of phrases) {
    for (const t of p.tokens) {
      const g = t.gloss;
      if (!g?.inflection?.tense) continue;
      used.add(g.verb ? g.verb.lemma : g.lemma);
    }
  }
  return used;
}

/** バンクに含まれるタグを出現回数の多い順に並べる。 */
export function collectTags(phrases: Phrase[]): string[] {
  const counts = new Map<string, number>();
  for (const p of phrases) {
    for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
}

export type Filters = {
  levels: Level[];
  /** 空配列なら絞り込まない。 */
  tags: string[];
};

export function applyFilters(phrases: Phrase[], filters: Filters): Phrase[] {
  return phrases.filter((p) => {
    if (filters.levels.length && !filters.levels.includes(p.level)) return false;
    if (filters.tags.length && !p.tags.some((t) => filters.tags.includes(t))) return false;
    return true;
  });
}

/**
 * 学習状況で重みを付けたランダム抽出。
 *   あやしい (shaky) … 3 倍出やすく
 *   覚えた   (known) … 0.3 倍に抑える
 * 直前に出したカードは連続しないよう除外する。
 */
export function pickWeighted(
  phrases: Phrase[],
  weightOf: (id: string) => number,
  excludeId?: string,
): Phrase | null {
  const pool = phrases.length > 1 && excludeId ? phrases.filter((p) => p.id !== excludeId) : phrases;
  if (pool.length === 0) return null;

  const weights = pool.map((p) => Math.max(0.01, weightOf(p.id)));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i += 1) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}
