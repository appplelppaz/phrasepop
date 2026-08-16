"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PhraseCard } from "@/components/PhraseCard";
import { SettingsSheet } from "@/components/SettingsSheet";
import { TokenList } from "@/components/TokenList";
import { VoiceGate } from "@/components/VoiceGate";
import { applyFilters, collectTags, pickWeighted } from "@/lib/bank";
import {
  loadProgress,
  markPhrase,
  saveProgress,
  weightFor,
  type Mark,
  type Progress,
} from "@/lib/progress";
import type { Lang, Level, Phrase, PhraseBank } from "@/lib/types";
import { DEFAULT_OPTIONS, useStudySequence, type SequenceOptions } from "@/lib/useStudySequence";

export function StudyClient({
  lang,
  bank,
  tenseLabels,
}: {
  lang: Lang;
  bank: PhraseBank;
  tenseLabels: Record<string, string>;
}) {
  const [started, setStarted] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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

  // タップした側と逆側へスクロールするための指示。描画後に効かせたいので state で持つ。
  const [jumpTo, setJumpTo] = useState<{ side: "gloss" | "word"; index: number } | null>(null);

  const { phase, running, paused, meaningVisible, run, stop, revealNow, togglePlay } =
    useStudySequence(current, options);

  /** フレーズ本文の語をタップ → その語の説明カードへ飛ぶ。 */
  const selectFromPhrase = useCallback(
    (index: number | null) => {
      setActiveIndex(index);
      if (index === null) return;
      // まだ意味を出していない段階なら、先に開いてから飛ぶ。
      if (!meaningVisible) revealNow();
      setJumpTo({ side: "gloss", index });
    },
    [meaningVisible, revealNow],
  );

  /** 説明カードをタップ → フレーズ本文の該当語へ飛ぶ。 */
  const selectFromGloss = useCallback((index: number | null) => {
    setActiveIndex(index);
    if (index === null) return;
    setJumpTo({ side: "word", index });
  }, []);

  // 反対側の要素へスクロールする。revealNow で意味を開いた直後でも、
  // 描画が終わったこの時点なら要素が存在する。
  useEffect(() => {
    if (!jumpTo) return;
    document
      .getElementById(`${jumpTo.side}-${jumpTo.index}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    setJumpTo(null);
  }, [jumpTo]);

  useEffect(() => {
    setProgress(loadProgress(lang));
  }, [lang]);

  const next = useCallback(() => {
    setActiveIndex(null);
    setCurrent(pickWeighted(pool, (id) => weightFor(progress, id), current?.id));
  }, [pool, progress, current?.id]);

  useEffect(() => {
    if (!started) return;
    if (current && pool.some((p) => p.id === current.id)) return;
    setActiveIndex(null);
    setCurrent(pickWeighted(pool, (id) => weightFor(progress, id), current?.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, pool]);

  useEffect(() => {
    if (started && current && !settingsOpen) void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, started]);

  function mark(m: Mark) {
    if (!current) return;
    const updated = markPhrase(progress, current.id, m);
    setProgress(updated);
    saveProgress(lang, updated);
    next();
  }

  if (!started) {
    return <VoiceGate lang={lang} onReady={() => setStarted(true)} />;
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-4 pt-3">
      {/* ヘッダー: 戻る・進み具合・設定だけ */}
      <header className="flex items-center justify-between">
        <Link
          href="/"
          aria-label="言語を選ぶ"
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 4l-6 6 6 6" />
          </svg>
        </Link>

        <PhaseDots phase={phase} />

        <button
          type="button"
          onClick={() => {
            stop();
            setSettingsOpen(true);
          }}
          aria-label="設定"
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
            <circle cx="12" cy="12" r="3.2" />
            <path d="M19.4 13.6a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-3-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-3l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
          </svg>
        </button>
      </header>

      {!current ? (
        <p className="py-24 text-center text-slate-400">
          条件に合うフレーズがありません。設定から絞り込みを緩めてください。
        </p>
      ) : (
        <>
          {/* フレーズ */}
          <section className="flex flex-1 flex-col justify-center py-6">
            <PhraseCard
              phrase={current}
              activeIndex={activeIndex}
              onSelect={selectFromPhrase}
              dimmed={phase === "idle"}
            />

            <div className="mt-5 flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                aria-label={running && !paused ? "一時停止" : paused ? "再開" : "もう一度読む"}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900"
              >
                {running && !paused ? (
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    <rect x="4" y="4" width="4.5" height="12" rx="1.2" />
                    <rect x="11.5" y="4" width="4.5" height="12" rx="1.2" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    <path d="M6 4.2v11.6a.8.8 0 0 0 1.22.68l9.2-5.8a.8.8 0 0 0 0-1.36l-9.2-5.8A.8.8 0 0 0 6 4.2z" />
                  </svg>
                )}
              </button>

              {!meaningVisible && (
                <button
                  type="button"
                  onClick={revealNow}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400"
                >
                  意味を見る
                </button>
              )}
            </div>
          </section>

          {/* 意味 */}
          <section
            data-testid="meaning"
            data-visible={meaningVisible}
            // 下部の ◯/✕ バーに隠れないよう、バーの高さぶん余白を取る。
            className={meaningVisible ? "flex flex-col gap-3 pb-28" : "hidden"}
          >
            <p className="text-lg">{current.ja}</p>

            {current.grammar && (
              <p className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                {current.grammar}
              </p>
            )}

            <TokenList phrase={current} activeIndex={activeIndex} onSelect={selectFromGloss} />
          </section>

          {/* ◯ / ✕ */}
          <div
            data-safe-bottom
            className="sticky bottom-0 flex justify-center gap-8 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent pt-5 dark:from-slate-950 dark:via-slate-950"
          >
            <button
              type="button"
              onClick={() => mark("shaky")}
              aria-label="あやしい"
              className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-slate-300 text-slate-400 active:scale-95 dark:border-slate-700"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                <path d="M5 5l14 14M19 5L5 19" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => mark("known")}
              aria-label="覚えた"
              className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-slate-900 text-slate-900 active:scale-95 dark:border-white dark:text-white"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <circle cx="12" cy="12" r="8.5" />
              </svg>
            </button>
          </div>
        </>
      )}

      <SettingsSheet
        lang={lang}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        options={options}
        onOptionsChange={setOptions}
        levels={levels}
        onLevelsChange={setLevels}
        tags={tags}
        onTagsChange={setTags}
        allTags={allTags}
        tenseLabels={tenseLabels}
        poolSize={pool.length}
        onResetProgress={() => {
          setProgress({});
          saveProgress(lang, {});
        }}
      />
    </main>
  );
}

/** (a)(b)(c) の進み具合を 3 つの点で示す。文字は使わない。 */
function PhaseDots({ phase }: { phase: string }) {
  const order = ["idle", "phrase", "meaning", "repeat", "done"];
  const at = order.indexOf(phase);
  const steps = [1, 2, 3];
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      {steps.map((s) => (
        <span
          key={s}
          className={[
            "h-1.5 rounded-full transition-all",
            at >= s ? "w-5 bg-slate-800 dark:bg-slate-200" : "w-1.5 bg-slate-300 dark:bg-slate-700",
          ].join(" ")}
        />
      ))}
    </div>
  );
}
