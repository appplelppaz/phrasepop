"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PhraseCard } from "@/components/PhraseCard";
import { PlaybackControls } from "@/components/PlaybackControls";
import { TokenList } from "@/components/TokenList";
import { VoiceGate } from "@/components/VoiceGate";
import { applyFilters, collectTags, pickWeighted } from "@/lib/bank";
import {
  countByMark,
  loadProgress,
  markPhrase,
  saveProgress,
  weightFor,
  type Mark,
  type Progress,
} from "@/lib/progress";
import { LANG_LABEL, type Lang, type Level, type Phrase, type PhraseBank } from "@/lib/types";
import { DEFAULT_OPTIONS, useStudySequence, type SequenceOptions } from "@/lib/useStudySequence";

const LEVELS: Level[] = ["A1", "A2", "B1", "B2"];

export function StudyClient({ lang, bank }: { lang: Lang; bank: PhraseBank }) {
  const [started, setStarted] = useState(false);
  const [options, setOptions] = useState<SequenceOptions>(DEFAULT_OPTIONS);
  const [levels, setLevels] = useState<Level[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [current, setCurrent] = useState<Phrase | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState<Progress>({});

  const allTags = useMemo(() => collectTags(bank.phrases), [bank.phrases]);
  const pool = useMemo(
    () => applyFilters(bank.phrases, { levels, tags }),
    [bank.phrases, levels, tags],
  );

  const { phase, running, meaningVisible, run, stop, replay, revealNow } = useStudySequence(
    current,
    options,
  );

  // localStorage は クライアントでしか読めないので、マウント後に読み込む。
  useEffect(() => {
    setProgress(loadProgress(lang));
  }, [lang]);

  const next = useCallback(() => {
    const picked = pickWeighted(pool, (id) => weightFor(progress, id), current?.id);
    setActiveIndex(null);
    setCurrent(picked);
  }, [pool, progress, current?.id]);

  // 学習開始時と、絞り込みで現在のカードが対象外になったときに引き直す。
  useEffect(() => {
    if (!started) return;
    if (current && pool.some((p) => p.id === current.id)) return;
    const picked = pickWeighted(pool, (id) => weightFor(progress, id), current?.id);
    setActiveIndex(null);
    setCurrent(picked);
    // progress は重み付けにしか使わないので、変わるたびに引き直さない。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, pool]);

  // カードが変わったら自動で再生する。
  useEffect(() => {
    if (started && current) void run();
    // run は current に依存して作り直されるので、これで新しいカードが再生される。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, started]);

  function mark(m: Mark) {
    if (!current) return;
    const updated = markPhrase(progress, current.id, m);
    setProgress(updated);
    saveProgress(lang, updated);
    next();
  }

  function toggle<T>(list: T[], value: T, set: (next: T[]) => void) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  if (!started) {
    return <VoiceGate lang={lang} onReady={() => setStarted(true)} />;
  }

  const stats = countByMark(progress);

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-5 py-8">
      <header className="flex items-center justify-between gap-4">
        <Link href="/" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← 言語を選ぶ
        </Link>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {LANG_LABEL[lang]} · {pool.length} フレーズ · 覚えた {stats.known} / あやしい {stats.shaky}
        </div>
      </header>

      {/* 絞り込み */}
      <details className="rounded-xl border border-slate-200 dark:border-slate-700">
        <summary className="cursor-pointer px-4 py-2 text-sm font-medium">絞り込み</summary>
        <div className="flex flex-col gap-3 border-t border-slate-200 p-4 dark:border-slate-700">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">レベル</span>
            {LEVELS.map((lv) => (
              <button
                key={lv}
                type="button"
                onClick={() => toggle(levels, lv, setLevels)}
                className={[
                  "rounded-md border px-2 py-1 text-xs",
                  levels.includes(lv)
                    ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                    : "border-slate-300 dark:border-slate-600",
                ].join(" ")}
              >
                {lv}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">分類</span>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggle(tags, tag, setTags)}
                className={[
                  "rounded-md border px-2 py-1 text-xs",
                  tags.includes(tag)
                    ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                    : "border-slate-300 dark:border-slate-600",
                ].join(" ")}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </details>

      {!current ? (
        <p className="py-16 text-center text-slate-500 dark:text-slate-400">
          条件に合うフレーズがありません。絞り込みを緩めてください。
        </p>
      ) : (
        <>
          <section
            data-testid="phrase-card"
            className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                {current.level}
              </span>
              {current.tags.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>

            <PhraseCard
              phrase={current}
              activeIndex={activeIndex}
              onSelect={setActiveIndex}
              dimmed={phase === "idle"}
            />

            <PlaybackControls
              phase={phase}
              running={running}
              options={options}
              onOptionsChange={setOptions}
              onPlay={() => void run()}
              onStop={stop}
              onReplay={() => void replay()}
              onReveal={revealNow}
            />
          </section>

          {/* (b) 意味の表示 */}
          <section
            data-testid="meaning"
            data-visible={meaningVisible}
            className={meaningVisible ? "flex flex-col gap-4" : "hidden"}
          >
            <div className="rounded-xl bg-slate-100 p-4 text-lg dark:bg-slate-800">{current.ja}</div>

            {current.grammar && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-100">
                {current.grammar}
              </div>
            )}

            <TokenList phrase={current} activeIndex={activeIndex} onSelect={setActiveIndex} />
          </section>

          <div className="sticky bottom-0 flex gap-3 bg-gradient-to-t from-white via-white to-transparent py-4 dark:from-slate-950 dark:via-slate-950">
            <button
              type="button"
              onClick={() => mark("shaky")}
              className="flex-1 rounded-xl border border-slate-300 py-3 font-medium hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
            >
              あやしい
            </button>
            <button
              type="button"
              onClick={() => mark("known")}
              className="flex-1 rounded-xl bg-slate-900 py-3 font-medium text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              覚えた
            </button>
          </div>
        </>
      )}
    </main>
  );
}
