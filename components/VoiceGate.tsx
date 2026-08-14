"use client";

import { useEffect, useState } from "react";
import { getSpeech, isSpeechSupported, mockDriver, setSpeechDriver } from "@/lib/speech";
import { LANG_LABEL, SPEECH_LANG, type Lang } from "@/lib/types";

type Status = "checking" | "ready" | "no-voice" | "unsupported";

/**
 * 読み上げの準備をする。
 *
 * iOS Safari は最初のユーザー操作の中でしか発話を始められないため、学習を始める前に
 * 一度タップさせてロックを解除する。同時に、その言語の音声が入っているかを調べ、
 * 無ければ黙って無音になるのではなく理由を表示する。
 */
export function VoiceGate({ lang, onReady }: { lang: Lang; onReady: () => void }) {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;

    if (!isSpeechSupported()) {
      setStatus("unsupported");
      return;
    }

    (async () => {
      await getSpeech().ready();
      if (cancelled) return;
      setStatus(getSpeech().hasVoiceFor(SPEECH_LANG[lang]) ? "ready" : "no-voice");
    })();

    return () => {
      cancelled = true;
    };
  }, [lang]);

  function start() {
    getSpeech().unlock();
    onReady();
  }

  /** 音声なしで進む。読み上げ時間ぶんの間だけ取るモックに差し替える。 */
  function startSilent() {
    setSpeechDriver(mockDriver());
    onReady();
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-16 text-center">
      <h1 className="text-2xl font-bold">{LANG_LABEL[lang]}を学習する</h1>

      {status === "checking" && (
        <p className="text-slate-500 dark:text-slate-400">音声を確認しています…</p>
      )}

      {status === "ready" && (
        <>
          <p className="text-slate-600 dark:text-slate-300">
            フレーズが読み上げられます。端末の音量を確認してから始めてください。
          </p>
          <button
            type="button"
            onClick={start}
            className="rounded-xl bg-slate-900 px-8 py-3 text-lg font-semibold text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            はじめる
          </button>
        </>
      )}

      {status === "no-voice" && (
        <>
          <p className="text-slate-600 dark:text-slate-300">
            このブラウザに<strong>{LANG_LABEL[lang]}の音声</strong>が入っていないため、
            読み上げができません。
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            OS の設定から{LANG_LABEL[lang]}の音声を追加すると読み上げられるようになります
            （macOS・iOS は「設定 → アクセシビリティ → 読み上げコンテンツ」、
            Windows は「設定 → 時刻と言語 → 音声認識」）。
          </p>
          <button
            type="button"
            onClick={startSilent}
            className="rounded-xl border border-slate-300 px-6 py-3 font-medium hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
          >
            音声なしで続ける
          </button>
        </>
      )}

      {status === "unsupported" && (
        <>
          <p className="text-slate-600 dark:text-slate-300">
            このブラウザは音声合成に対応していません。表示だけで学習を進められます。
          </p>
          <button
            type="button"
            onClick={startSilent}
            className="rounded-xl border border-slate-300 px-6 py-3 font-medium hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
          >
            音声なしで続ける
          </button>
        </>
      )}
    </div>
  );
}
