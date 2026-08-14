"use client";

import type { Phase, SequenceOptions } from "@/lib/useStudySequence";

/** 再生の進み具合を (a)(b)(c) の 3 段で示す。 */
function PhaseDots({ phase }: { phase: Phase }) {
  const steps: { key: Phase[]; label: string }[] = [
    { key: ["phrase"], label: "フレーズ" },
    { key: ["meaning"], label: "意味" },
    { key: ["repeat", "done"], label: "もう一度" },
  ];
  const order: Phase[] = ["idle", "phrase", "meaning", "repeat", "done"];
  const current = order.indexOf(phase);

  return (
    <ol className="flex items-center gap-2 text-xs">
      {steps.map((step, i) => {
        const reached = current >= order.indexOf(step.key[0]);
        const active = step.key.includes(phase);
        return (
          <li key={step.label} className="flex items-center gap-2">
            {i > 0 && <span className="text-slate-300 dark:text-slate-600">›</span>}
            <span
              className={[
                "rounded-full px-2 py-0.5",
                active
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : reached
                    ? "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                    : "text-slate-400 dark:text-slate-500",
              ].join(" ")}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function PlaybackControls({
  phase,
  running,
  options,
  onOptionsChange,
  onPlay,
  onStop,
  onReplay,
  onReveal,
}: {
  phase: Phase;
  running: boolean;
  options: SequenceOptions;
  onOptionsChange: (next: SequenceOptions) => void;
  onPlay: () => void;
  onStop: () => void;
  onReplay: () => void;
  onReveal: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {running ? (
          <button
            type="button"
            onClick={onStop}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            停止
          </button>
        ) : (
          <button
            type="button"
            onClick={onPlay}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {phase === "idle" ? "再生" : "もう一度再生"}
          </button>
        )}

        <button
          type="button"
          onClick={onReplay}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
        >
          フレーズだけ読む
        </button>

        {phase !== "done" && (
          <button
            type="button"
            onClick={onReveal}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
          >
            意味を表示
          </button>
        )}

        <div className="ml-auto">
          <PhaseDots phase={phase} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-300">
        <label className="flex items-center gap-2">
          <span className="whitespace-nowrap">速さ</span>
          <input
            type="range"
            min={0.5}
            max={1.2}
            step={0.05}
            value={options.rate}
            onChange={(e) => onOptionsChange({ ...options, rate: Number(e.target.value) })}
            className="w-28"
          />
          <span className="w-10 tabular-nums">{options.rate.toFixed(2)}</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={options.speakJa}
            onChange={(e) => onOptionsChange({ ...options, speakJa: e.target.checked })}
          />
          <span>日本語訳も読み上げる</span>
        </label>
      </div>
    </div>
  );
}
