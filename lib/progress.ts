"use client";

import type { Lang } from "./types";

/** 各フレーズの手応え。抽出の重み付けに使う。 */
export type Mark = "known" | "shaky";

export type Progress = Record<string, { mark: Mark; seen: number; at: number }>;

const KEY = (lang: Lang) => `phrasepop:progress:${lang}`;

const WEIGHT: Record<Mark, number> = {
  shaky: 3,
  known: 0.3,
};

export function loadProgress(lang: Lang): Progress {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY(lang));
    return raw ? (JSON.parse(raw) as Progress) : {};
  } catch {
    return {};
  }
}

export function saveProgress(lang: Lang, progress: Progress) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY(lang), JSON.stringify(progress));
  } catch {
    // 容量超過やプライベートモードでは黙って諦める。学習自体は続けられる。
  }
}

export function markPhrase(progress: Progress, id: string, mark: Mark): Progress {
  const prev = progress[id];
  return { ...progress, [id]: { mark, seen: (prev?.seen ?? 0) + 1, at: Date.now() } };
}

/** 未出題は 1。marked のものは WEIGHT に従う。 */
export function weightFor(progress: Progress, id: string): number {
  const entry = progress[id];
  return entry ? WEIGHT[entry.mark] : 1;
}

export function countByMark(progress: Progress): { known: number; shaky: number } {
  let known = 0;
  let shaky = 0;
  for (const v of Object.values(progress)) {
    if (v.mark === "known") known += 1;
    else shaky += 1;
  }
  return { known, shaky };
}
