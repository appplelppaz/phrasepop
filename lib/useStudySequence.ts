"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Phrase } from "./types";
import { getSpeech } from "./speech";
import { cancelPlayback, pausePlayback, playPhrase, resumePlayback } from "./voice";

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
  rate: 1.0,
  speakJa: false,
  gapAfterPhrase: 800,
  gapBeforeRepeat: 600,
};

type Flag = { current: boolean };

/**
 * 中断でき、かつ一時停止中は進まない待機。
 *
 * 一時停止は読み上げだけ止めても足りない。フェーズ間の間（gap）が進んでしまうと、
 * 止めたつもりでも勝手に次の段階へ移ってしまうため、この待機も止める。
 */
function wait(ms: number, signal: AbortSignal, paused: Flag): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    let remaining = ms;
    let last = Date.now();
    let timer: ReturnType<typeof setTimeout>;

    const done = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    };
    const tick = () => {
      if (signal.aborted) return done();
      const now = Date.now();
      if (!paused.current) remaining -= now - last;
      last = now;
      if (remaining <= 0) return done();
      timer = setTimeout(tick, 60);
    };

    timer = setTimeout(tick, 60);
    signal.addEventListener("abort", done);
  });
}

/** 一時停止が解除されるまで待つ。次の読み上げを始める前に挟む。 */
async function untilResumed(signal: AbortSignal, paused: Flag): Promise<void> {
  while (paused.current && !signal.aborted) {
    await new Promise((r) => setTimeout(r, 60));
  }
}

export function useStudySequence(phrase: Phrase | null, options: SequenceOptions) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  // 実行中の run から一時停止を見るための箱。state だけだと run が古い値を掴む。
  const pausedRef = useRef(false);
  // 最新の設定を参照するための箱。実行中の run が古い値を掴まないようにする。
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const setPausedBoth = useCallback((v: boolean) => {
    pausedRef.current = v;
    setPaused(v);
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    cancelPlayback();
    setRunning(false);
    setPausedBoth(false);
  }, [setPausedBoth]);

  const run = useCallback(async () => {
    if (!phrase) return;

    // 前の再生を確実に打ち切ってから始める。
    abortRef.current?.abort();
    cancelPlayback();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const { signal } = ctrl;

    const speech = getSpeech();
    setRunning(true);
    setPausedBoth(false);

    try {
      await speech.ready();
      if (signal.aborted) return;

      // (a) フレーズを表示して読み上げる
      setPhase("phrase");
      await playPhrase(phrase, { rate: optionsRef.current.rate, signal });
      if (signal.aborted) return;

      await wait(optionsRef.current.gapAfterPhrase, signal, pausedRef);
      if (signal.aborted) return;

      // (b) 意味を表示する
      await untilResumed(signal, pausedRef);
      if (signal.aborted) return;
      setPhase("meaning");
      if (optionsRef.current.speakJa) {
        await speech.speak(phrase.ja, { lang: "ja-JP", rate: optionsRef.current.rate, signal });
        if (signal.aborted) return;
      }

      await wait(optionsRef.current.gapBeforeRepeat, signal, pausedRef);
      if (signal.aborted) return;

      // (c) もう一度フレーズを読み上げる
      await untilResumed(signal, pausedRef);
      if (signal.aborted) return;
      setPhase("repeat");
      await playPhrase(phrase, { rate: optionsRef.current.rate, signal });
      if (signal.aborted) return;

      setPhase("done");
    } finally {
      if (abortRef.current === ctrl) {
        abortRef.current = null;
        setRunning(false);
        setPausedBoth(false);
      }
    }
  }, [phrase, setPausedBoth]);

  /** シーケンスを飛ばして意味まで一気に表示する。 */
  const revealNow = useCallback(() => {
    stop();
    setPhase("done");
  }, [stop]);

  /** フレーズだけをもう一度読み上げる（シーケンスは進めない）。 */
  const replay = useCallback(async () => {
    if (!phrase) return;
    abortRef.current?.abort();
    cancelPlayback();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setRunning(true);
    setPausedBoth(false);
    try {
      await playPhrase(phrase, { rate: optionsRef.current.rate, signal: ctrl.signal });
    } finally {
      if (abortRef.current === ctrl) {
        abortRef.current = null;
        setRunning(false);
        setPausedBoth(false);
      }
    }
  }, [phrase, setPausedBoth]);

  /**
   * 再生ボタン。止めてしまうのではなく、その場で一時停止し、次に押すと続きから再開する。
   * 何も鳴っていないときは、フレーズをもう一度頭から読み上げる。
   */
  const togglePlay = useCallback(() => {
    if (!running) {
      void replay();
      return;
    }
    if (paused) {
      resumePlayback();
      setPausedBoth(false);
    } else {
      pausePlayback();
      setPausedBoth(true);
    }
  }, [running, paused, replay, setPausedBoth]);

  // カードが変わったら再生を止めて最初の状態に戻す。
  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    cancelPlayback();
    setPhase("idle");
    setRunning(false);
    pausedRef.current = false;
    setPaused(false);
  }, [phrase?.id]);

  // 画面から離れるときに発話を止める。
  useEffect(() => stop, [stop]);

  /** 意味を表示してよい段階か。 */
  const meaningVisible = phase === "meaning" || phase === "repeat" || phase === "done";

  return { phase, running, paused, meaningVisible, run, stop, replay, revealNow, togglePlay };
}
