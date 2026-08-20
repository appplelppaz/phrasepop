"use client";

import { getSpeech } from "./speech";
import type { Phrase } from "./types";
import { SPEECH_LANG } from "./types";

/**
 * 「このフレーズを読む」の窓口。
 *
 * 事前生成した音声ファイル（public/audio/{lang}/{id}.mp3）があればそれを再生し、
 * 無ければブラウザ内蔵の音声合成に落とす。
 *
 * 音声ファイルを主にしている理由:
 *   内蔵の合成は品質が端末に入っている声に完全に依存する。iPhone の既定は圧縮版の
 *   声のことが多く、明らかに機械的に聞こえる。フレーズは固定なので、一度だけ
 *   プレミアム音声で作っておけば、どの端末でも同じ品質で鳴る。
 *
 * 内蔵合成への フォールバックを残してあるのは、フレーズを足したのに音声を
 * 生成し直していないときに無音にならないようにするため。
 *
 * ファイルの有無は事前に問い合わせない。再生してみて error が飛んだら落とす。
 * 普通は存在するので、その場合は余計な往復が発生しない。
 */

/** iOS の再生ロックを外すための無音。要素を使い回すので中身は何でもよい。 */
const SILENCE =
  "data:audio/wav;base64,UklGRjQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YRAAAAAAAAAAAAAAAAAAAAAAAAAA";

/**
 * 音声要素は 1 つだけ作って使い回す。
 * iOS の再生許可は「要素ごと」に付くので、毎回 new すると解除が効かない。
 */
let el: HTMLAudioElement | null = null;

function element(): HTMLAudioElement {
  if (!el) {
    el = new Audio();
    el.preload = "auto";
  }
  return el;
}

/** 音声要素を自分で止めたか。止めていないものを resume で鳴らし始めないための印。 */
let pausedFile = false;

export function audioUrl(phrase: Phrase): string {
  return `/audio/${phrase.lang}/${phrase.id}.mp3`;
}

/**
 * 最初のユーザー操作の中から呼ぶ。iOS はこれをやらないと
 * あとからスクリプトで再生を始められない。
 */
export function unlockPlayback() {
  getSpeech().unlock();
  try {
    const a = element();
    a.src = SILENCE;
    void a.play().then(
      () => a.pause(),
      () => {
        /* 解除に失敗しても致命的ではない */
      },
    );
  } catch {
    /* noop */
  }
}

/** 音声ファイルで再生する。ファイルが無い・鳴らせない場合は false を返す。 */
function playFile(url: string, rate: number, signal?: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    const a = element();
    let settled = false;

    const cleanup = () => {
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("error", onError);
      signal?.removeEventListener("abort", onAbort);
    };
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(ok);
    };
    const onEnd = () => finish(true);
    // 404 や対応していない形式。合成に落とすため false を返す。
    const onError = () => finish(false);
    function onAbort() {
      a.pause();
      finish(true);
    }

    a.addEventListener("ended", onEnd);
    a.addEventListener("error", onError);
    signal?.addEventListener("abort", onAbort);

    a.src = url;
    a.playbackRate = rate;
    a.currentTime = 0;
    a.play().catch(() => finish(false));
  });
}

/**
 * フレーズを読み上げる。中断されたら（signal）静かに終わる。
 * 音声ファイルがあればそれを、無ければ内蔵の合成を使う。
 */
export async function playPhrase(
  phrase: Phrase,
  { rate, signal }: { rate: number; signal?: AbortSignal },
): Promise<void> {
  if (signal?.aborted) return;

  if (typeof window !== "undefined" && typeof Audio !== "undefined") {
    const ok = await playFile(audioUrl(phrase), rate, signal);
    if (ok || signal?.aborted) return;
  }

  // ここに来るのは音声ファイルが無かったときだけ。
  await getSpeech().speak(phrase.text, { lang: SPEECH_LANG[phrase.lang], rate, signal });
}

/**
 * 鳴っているほうを止める。
 *
 * どちらが鳴っているかを外から見て切り替えるのではなく、両方に投げる。
 * ファイルの再生を試している最中に合成へ落ちる瞬間があり、その隙に
 * 一時停止が来ると「止めたのに合成だけ鳴り続ける」ことになるため。
 * 鳴っていないものを止めるのは無害。
 */
export function pausePlayback() {
  try {
    const a = element();
    if (!a.paused) {
      a.pause();
      pausedFile = true;
    }
  } catch {
    /* noop */
  }
  getSpeech().pause();
}

export function resumePlayback() {
  // 自分で止めたときだけ再開する。止めていない要素を鳴らし始めない。
  if (pausedFile) {
    pausedFile = false;
    void element()
      .play()
      .catch(() => {});
  }
  getSpeech().resume();
}

export function cancelPlayback() {
  pausedFile = false;
  try {
    element().pause();
  } catch {
    /* noop */
  }
  getSpeech().cancel();
}
