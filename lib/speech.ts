/**
 * Web Speech API のラッパ。
 *
 * ブラウザごとの癖をここで吸収し、UI 側は speak() / cancel() だけを見ればよいようにする。
 * 吸収している問題:
 *   - iOS Safari は最初のユーザー操作の中でしか発話を開始できない → unlock()
 *   - Chrome は音声一覧を非同期に読み込む → voiceschanged を待つ
 *   - Chrome は発話中の utterance を GC してしまい途中で止まる → 参照を保持する
 *   - 対象言語の音声が入っていない環境がある → hasVoiceFor() で事前に検出する
 *
 * ヘッドレス環境（CI・Playwright）には音声が無く speechSynthesis すら存在しないため、
 * setSpeechDriver() でモックに差し替えられるようにしてある。再生シーケンスのロジックは
 * これで音声なしにテストできる。
 */

export type SpeakOptions = {
  lang: string;
  rate?: number;
  /** 中断されたら reject ではなく resolve する（シーケンス側で世代管理するため）。 */
  signal?: AbortSignal;
};

export type SpeechDriver = {
  speak(text: string, opts: SpeakOptions): Promise<void>;
  cancel(): void;
  /** 読み上げをその場で止める。resume() で続きから再開できる。 */
  pause(): void;
  /** pause() した位置から読み上げを再開する。 */
  resume(): void;
  /** 指定言語の音声が使えるか。判定できない場合は true を返す。 */
  hasVoiceFor(lang: string): boolean;
  /** iOS Safari の発話ロック解除。ユーザー操作ハンドラの中から呼ぶ。 */
  unlock(): void;
  /** 音声一覧の読み込み完了を待つ。 */
  ready(): Promise<void>;
};

/* ------------------------------------------------------- ブラウザ実装 */

function browserDriver(): SpeechDriver {
  const synth = window.speechSynthesis;

  // Chrome は発話中の SpeechSynthesisUtterance が GC されると発話が途切れるため、
  // 終了するまで参照を保持しておく。
  const alive = new Set<SpeechSynthesisUtterance>();
  let voices: SpeechSynthesisVoice[] = [];
  let readyPromise: Promise<void> | null = null;

  function loadVoices() {
    voices = synth.getVoices();
    return voices.length > 0;
  }

  function ready(): Promise<void> {
    if (readyPromise) return readyPromise;
    readyPromise = new Promise<void>((resolve) => {
      if (loadVoices()) return resolve();
      // Chrome は getVoices() が最初は空配列を返し、あとから voiceschanged が飛ぶ。
      const onChange = () => {
        loadVoices();
        synth.removeEventListener("voiceschanged", onChange);
        resolve();
      };
      synth.addEventListener("voiceschanged", onChange);
      // voiceschanged が来ないブラウザのための保険。
      setTimeout(() => {
        loadVoices();
        synth.removeEventListener("voiceschanged", onChange);
        resolve();
      }, 1500);
    });
    return readyPromise;
  }

  /** "es-ES" に対して es-ES → es-* の順で音声を探す。 */
  function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
    const base = lang.split("-")[0].toLowerCase();
    const norm = (v: SpeechSynthesisVoice) => v.lang.replace("_", "-").toLowerCase();
    return (
      voices.find((v) => norm(v) === lang.toLowerCase()) ??
      voices.find((v) => norm(v).startsWith(base + "-")) ??
      voices.find((v) => norm(v) === base)
    );
  }

  return {
    ready,

    hasVoiceFor(lang) {
      // 音声一覧を取得できないブラウザでは判定不能なので、警告を出さず true にする。
      if (voices.length === 0) return true;
      return pickVoice(lang) !== undefined;
    },

    unlock() {
      // iOS Safari は「ユーザー操作の中で speak() が呼ばれた」ことを要求する。
      // 無音の発話を 1 回流してロックを解除する。
      try {
        const u = new SpeechSynthesisUtterance("");
        u.volume = 0;
        synth.speak(u);
        synth.cancel();
      } catch {
        // 解除に失敗しても致命的ではない。
      }
    },

    cancel() {
      try {
        synth.cancel();
        // 一時停止したまま cancel すると、ブラウザによっては paused 状態が残り
        // 次の speak() が鳴らなくなる。必ず解除しておく。
        synth.resume();
      } catch {
        /* noop */
      }
      alive.clear();
    },

    pause() {
      try {
        synth.pause();
      } catch {
        /* noop */
      }
    },

    resume() {
      try {
        synth.resume();
      } catch {
        /* noop */
      }
    },

    speak(text, { lang, rate = 0.85, signal }) {
      return new Promise<void>((resolve) => {
        if (signal?.aborted) return resolve();

        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang;
        u.rate = rate;
        const voice = pickVoice(lang);
        if (voice) u.voice = voice;

        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          alive.delete(u);
          signal?.removeEventListener("abort", onAbort);
          resolve();
        };
        function onAbort() {
          synth.cancel();
          done();
        }

        u.onend = done;
        // エラーでも reject しない。音声が無い環境でシーケンスを止めないため。
        u.onerror = done;
        signal?.addEventListener("abort", onAbort);

        alive.add(u);
        synth.speak(u);
      });
    },
  };
}

/* ----------------------------------------------------------- モック実装 */

/**
 * 音声を鳴らさず、発話にかかる時間だけ待つドライバ。
 * ヘッドレスでのシーケンス検証と、音声が全く無い環境でのフォールバックに使う。
 */
export function mockDriver(msPerChar = 55): SpeechDriver {
  let timer: ReturnType<typeof setTimeout> | null = null;
  // 一時停止の再現に、残り時間と再開用の関数を覚えておく。
  let finish: (() => void) | null = null;
  let dueAt = 0;
  let remaining = 0;

  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    finish = null;
    remaining = 0;
  };

  return {
    ready: () => Promise.resolve(),
    hasVoiceFor: () => true,
    unlock: () => {},
    cancel: clear,

    pause() {
      if (!timer || !finish) return;
      clearTimeout(timer);
      timer = null;
      remaining = Math.max(0, dueAt - Date.now());
    },

    resume() {
      if (timer || !finish) return;
      dueAt = Date.now() + remaining;
      timer = setTimeout(finish, remaining);
    },

    speak(text, { signal }) {
      return new Promise<void>((resolve) => {
        if (signal?.aborted) return resolve();
        const ms = Math.min(4000, 300 + text.length * msPerChar);
        const done = () => {
          clear();
          signal?.removeEventListener("abort", done);
          resolve();
        };
        finish = done;
        signal?.addEventListener("abort", done);
        dueAt = Date.now() + ms;
        timer = setTimeout(done, ms);
      });
    },
  };
}

/* ------------------------------------------------------------ 公開 API */

let driver: SpeechDriver | null = null;

/** テストや音声非対応環境のためにドライバを差し替える。 */
export function setSpeechDriver(d: SpeechDriver | null) {
  driver?.cancel();
  driver = d;
}

export function getSpeech(): SpeechDriver {
  if (driver) return driver;
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  driver = supported ? browserDriver() : mockDriver();
  return driver;
}

/** ブラウザが音声合成に対応しているか（モックに差し替えている場合も false）。 */
export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
