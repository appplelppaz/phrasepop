"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Phrase } from "./types";
import { SPEECH_LANG } from "./types";
import { getSpeech } from "./speech";

/**
 * 学習カードの再生シーケンス。
 *
 *   phrase  … フレーズを表示して読み上げる      (要件 a)
 *   meaning … 意味・単語カードを表示する        (要件 b)
 *   repeat  … もう一度フレーズを読み上げる      (要件 c)
 *   done    … 次のカードへ進める状態
 *
 * 途中でカードを切り替えたり停止したりできるよう、実行ごとに世代番号と AbortController を
 * 持たせ、古い世代の続きが後から走らないようにしている。
 */
export type Phase = "idle" | "phrase" | "meaning" | "repeat" | "done";

export type SequenceOptions = {
  /** 読み上げ速度。0.5〜1.2 程度。 */
  rate: number;
  /** 意味表示のあとに日本語訳も読み上げる。 */
  speakJa: boolean;
  /** フレーズ読み上げ後の間（ミリ秒）。 */
  gapAfterPhrase: number;
  /** 意味表示から再読み上げまでの間（ミリ秒）。 */
  gapBeforeRepeat: number;
};

export const DEFAULT_OPTIONS: SequenceOptions = {
  rate: 0.85,
  speakJa: false,
  gapAfterPhrase: 800,
  gapBeforeRepeat: 600,
};

/** 中断可能な待機。 */
function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const done = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal.addEventListener("abort", done);
  });
}

export function useStudySequence(phrase: Phrase | null, options: SequenceOptions) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [running, setRunning] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  // 最新の設定を参照するための箱。実行中の run が古い値を掴まないようにする。
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    getSpeech().cancel();
    setRunning(false);
  }, []);

  const run = useCallback(async () => {
    if (!phrase) return;

    // 前の再生を確実に打ち切ってから始める。
    abortRef.current?.abort();
    getSpeech().cancel();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const { signal } = ctrl;

    const speech = getSpeech();
    const lang = SPEECH_LANG[phrase.lang];
    setRunning(true);

    try {
      await speech.ready();
      if (signal.aborted) return;

      // (a) フレーズを表示して読み上げる
      setPhase("phrase");
      await speech.speak(phrase.text, { lang, rate: optionsRef.current.rate, signal });
      if (signal.aborted) return;

      await wait(optionsRef.current.gapAfterPhrase, signal);
      if (signal.aborted) return;

      // (b) 意味を表示する
      setPhase("meaning");
      if (optionsRef.current.speakJa) {
        await speech.speak(phrase.ja, { lang: "ja-JP", rate: optionsRef.current.rate, signal });
        if (signal.aborted) return;
      }

      await wait(optionsRef.current.gapBeforeRepeat, signal);
      if (signal.aborted) return;

      // (c) もう一度フレーズを読み上げる
      setPhase("repeat");
      await speech.speak(phrase.text, { lang, rate: optionsRef.current.rate, signal });
      if (signal.aborted) return;

      setPhase("done");
    } finally {
      if (abortRef.current === ctrl) {
        abortRef.current = null;
        setRunning(false);
      }
    }
  }, [phrase]);

  /** シーケンスを飛ばして意味まで一気に表示する。 */
  const revealNow = useCallback(() => {
    stop();
    setPhase("done");
  }, [stop]);

  /** フレーズだけをもう一度読み上げる（シーケンスは進めない）。 */
  const replay = useCallback(async () => {
    if (!phrase) return;
    abortRef.current?.abort();
    getSpeech().cancel();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    await getSpeech().speak(phrase.text, {
      lang: SPEECH_LANG[phrase.lang],
      rate: optionsRef.current.rate,
      signal: ctrl.signal,
    });
    if (abortRef.current === ctrl) abortRef.current = null;
  }, [phrase]);

  // カードが変わったら再生を止めて最初の状態に戻す。
  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    getSpeech().cancel();
    setPhase("idle");
    setRunning(false);
  }, [phrase?.id]);

  // 画面から離れるときに発話を止める。
  useEffect(() => stop, [stop]);

  /** 意味を表示してよい段階か。 */
  const meaningVisible = phase === "meaning" || phase === "repeat" || phase === "done";

  return { phase, running, meaningVisible, run, stop, replay, revealNow };
}
