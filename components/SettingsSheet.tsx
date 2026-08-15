"use client";

import { legendFor, MOOD_LABEL, PERSON_SPEC, type MoodKey } from "@/lib/grammar";
import { LANG_LABEL, type Lang, type Level } from "@/lib/types";
import type { SequenceOptions } from "@/lib/useStudySequence";
import { PersonMark } from "./GrammarMarks";

const LEVELS: Level[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

/**
 * 設定画面。学習画面から歯車アイコンで開く。
 * 読み上げ速度や絞り込みは画面上に出しっぱなしにせず、すべてここに寄せてある。
 */
export function SettingsSheet({
  lang,
  open,
  onClose,
  options,
  onOptionsChange,
  levels,
  onLevelsChange,
  tags,
  onTagsChange,
  allTags,
  tenseLabels,
  poolSize,
  onResetProgress,
}: {
  lang: Lang;
  open: boolean;
  onClose: () => void;
  options: SequenceOptions;
  onOptionsChange: (next: SequenceOptions) => void;
  levels: Level[];
  onLevelsChange: (next: Level[]) => void;
  tags: string[];
  onTagsChange: (next: string[]) => void;
  allTags: string[];
  tenseLabels: Record<string, string>;
  poolSize: number;
  onResetProgress: () => void;
}) {
  if (!open) return null;

  const legend = legendFor(lang, tenseLabels);
  const byMood = legend.reduce<Record<string, typeof legend>>((acc, s) => {
    (acc[s.mood] ??= []).push(s);
    return acc;
  }, {});

  function toggle<T>(list: T[], value: T, set: (next: T[]) => void) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-lg px-5 pb-16 pt-5">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold">設定</h1>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </header>

        {/* 読み上げ */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">読み上げ</h2>
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <label className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span>速さ</span>
                <span className="tabular-nums text-slate-500 dark:text-slate-400">
                  {options.rate.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={1.2}
                step={0.05}
                value={options.rate}
                onChange={(e) => onOptionsChange({ ...options, rate: Number(e.target.value) })}
                className="w-full"
              />
            </label>

            <label className="flex items-center justify-between text-sm">
              <span>日本語訳も読み上げる</span>
              <input
                type="checkbox"
                checked={options.speakJa}
                onChange={(e) => onOptionsChange({ ...options, speakJa: e.target.checked })}
                className="h-5 w-5"
              />
            </label>

            <label className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span>意味を出すまでの間</span>
                <span className="tabular-nums text-slate-500 dark:text-slate-400">
                  {(options.gapAfterPhrase / 1000).toFixed(1)}秒
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={3000}
                step={100}
                value={options.gapAfterPhrase}
                onChange={(e) =>
                  onOptionsChange({ ...options, gapAfterPhrase: Number(e.target.value) })
                }
                className="w-full"
              />
            </label>
          </div>
        </section>

        {/* 色の凡例 */}
        <section className="mb-8">
          <h2 className="mb-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
            色の意味（法と時制）
          </h2>
          <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">
            フレーズ中の動詞は、この色の下線が付きます。
          </p>
          <div className="flex flex-col gap-3">
            {(Object.keys(byMood) as MoodKey[]).map((mood) => (
              <div
                key={mood}
                className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {MOOD_LABEL[mood]}
                </div>
                <ul className="flex flex-col gap-2">
                  {byMood[mood].map((s) => (
                    <li key={s.label} className="flex items-center gap-2.5 text-sm">
                      <span
                        data-tense-chip
                        className="h-3 w-6 shrink-0 rounded-full"
                        style={
                          {
                            backgroundColor: "var(--tense)",
                            ["--tense" as string]: s.color,
                            ["--tense-dark" as string]: s.colorDark,
                          } as React.CSSProperties
                        }
                      />
                      {s.label}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                不規則活用
              </div>
              <p className="text-sm">
                下線が
                <span
                  data-irregular-underline
                  style={{
                    textDecorationLine: "underline",
                    textDecorationStyle: "wavy",
                    textDecorationColor: "var(--irr)",
                    textUnderlineOffset: "4px",
                  }}
                >
                  波線
                </span>
                になっている語は不規則活用です。単語カードに、語幹がどう変わるか、あるいはその時制の全人称を出します。
              </p>
            </div>
          </div>
        </section>

        {/* 人称の表示 */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
            人称の表示
          </h2>
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
            {(Object.keys(PERSON_SPEC) as (keyof typeof PERSON_SPEC)[]).map((p) => (
              <div key={p} className="flex items-center gap-2">
                <PersonMark person={p} color="currentColor" />
                <span>{PERSON_SPEC[p].label}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
            数字が人称、「単」が単数、「複」が複数です。色は法と時制を表します。
          </p>
        </section>

        {/* 出題の絞り込み */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
            出題する範囲（{poolSize} フレーズ）
          </h2>
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div>
              <div className="mb-2 text-xs text-slate-500 dark:text-slate-400">レベル</div>
              <div className="flex flex-wrap gap-2">
                {LEVELS.map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => toggle(levels, lv, onLevelsChange)}
                    className={[
                      "rounded-full border px-3 py-1.5 text-sm",
                      levels.includes(lv)
                        ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                        : "border-slate-300 dark:border-slate-600",
                    ].join(" ")}
                  >
                    {lv}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs text-slate-500 dark:text-slate-400">分類</div>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggle(tags, tag, onTagsChange)}
                    className={[
                      "rounded-full border px-3 py-1.5 text-sm",
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
          </div>
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            どれも選ばなければ全部から出題します。
          </p>
        </section>

        <section>
          <button
            type="button"
            onClick={onResetProgress}
            className="w-full rounded-2xl border border-rose-300 py-3 text-sm font-medium text-rose-600 dark:border-rose-500/40 dark:text-rose-300"
          >
            {LANG_LABEL[lang]}の学習記録を消す
          </button>
        </section>
      </div>
    </div>
  );
}
