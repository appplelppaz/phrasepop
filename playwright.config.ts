import { defineConfig } from "@playwright/test";

/**
 * ヘッドレス Chromium には音声合成の音声が入っていないため、実際の発話は検証できない。
 * このテストで確かめるのは再生シーケンスの制御ロジック — フレーズ → 意味 → 再読み上げ
 * の順に進むこと — であって、音が鳴るかどうかではない。
 * 実際の音声は Vercel のプレビューをブラウザで開いて確認する。
 */
export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:3100",
    launchOptions: { executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" },
  },
  webServer: {
    command: "npm run start -- --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
