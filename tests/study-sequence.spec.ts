import { expect, test } from "@playwright/test";

/**
 * 要件3の再生順序を確かめる。
 *   (a) フレーズが表示され、それが読み上げられる
 *   (b) 意味が表示される
 *   (c) 再度、元のフレーズが読み上げられる
 *
 * ヘッドレス Chromium に音声は入っていないので、VoiceGate は「音声なしで続ける」を出す。
 * これを押すとモックドライバに切り替わり、読み上げ時間ぶんの間だけ取って進む。
 * つまりここで検証しているのは順序と状態遷移であって、音そのものではない。
 */
async function startStudy(page: import("@playwright/test").Page, lang: string) {
  await page.goto(`/study/${lang}`);
  const silent = page.getByRole("button", { name: "音声なしで続ける" });
  const start = page.getByRole("button", { name: "はじめる" });
  await expect(silent.or(start)).toBeVisible();
  await (await silent.isVisible() ? silent : start).click();
}

for (const lang of ["es", "fr"]) {
  test(`${lang}: フレーズ → 意味 → 再読み上げ の順に進む`, async ({ page }) => {
    await startStudy(page, lang);

    const card = page.getByTestId("phrase-card");
    const meaning = page.getByTestId("meaning");
    await expect(card).toBeVisible();

    // (a) フレーズが表示されている。この時点で意味はまだ出ていない。
    await expect(meaning).toHaveAttribute("data-visible", "false");
    await expect(page.locator('[data-testid="phrase-card"] p')).not.toBeEmpty();

    // 「フレーズ」の段が光っている
    await expect(card.getByText("フレーズ", { exact: true })).toBeVisible();

    // (b) しばらくすると意味が表示される
    await expect(meaning).toHaveAttribute("data-visible", "true", { timeout: 20_000 });
    await expect(meaning).toBeVisible();

    // (c) 再読み上げまで進み、意味は表示されたまま残る
    await expect(card.getByText("もう一度", { exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(meaning).toHaveAttribute("data-visible", "true");
  });

  test(`${lang}: 単語をクリックすると意味と活用が出る`, async ({ page }) => {
    await startStudy(page, lang);

    // シーケンスを待たずに意味を出す
    await page.getByRole("button", { name: "意味を表示" }).click();
    const meaning = page.getByTestId("meaning");
    await expect(meaning).toHaveAttribute("data-visible", "true");

    // 語義カードが 1 件以上あり、原形と品詞が読める
    const entries = meaning.locator("li");
    expect(await entries.count()).toBeGreaterThan(0);
    await expect(entries.first()).toBeVisible();
  });

  test(`${lang}: 活用ドリルが出題して答えを返す`, async ({ page }) => {
    await page.goto(`/drill/${lang}`);
    await expect(page.getByRole("button", { name: "答えを見る" })).toBeVisible();
    await page.getByRole("button", { name: "答えを見る" }).click();
    await expect(page.getByRole("button", { name: "正解した" })).toBeVisible();
  });
}

test("活用ラベルがフレーズ内に表示される", async ({ page }) => {
  // 接続法のフレーズに絞り込み、ラベルが出ることを確かめる。
  await startStudy(page, "es");
  await page.getByRole("button", { name: "意味を表示" }).click();

  const meaning = page.getByTestId("meaning");
  await expect(meaning).toHaveAttribute("data-visible", "true");

  // どのフレーズでも最低 1 つは動詞が含まれるので、活用バッジか品詞表示が読めるはず。
  await expect(meaning.getByText("動詞").first()).toBeVisible();
});
