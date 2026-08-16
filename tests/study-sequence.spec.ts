import { expect, test, type Page } from "@playwright/test";

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
async function startStudy(page: Page, lang: string) {
  await page.goto(`/study/${lang}`);
  const silent = page.getByRole("button", { name: "音声なしで続ける" });
  const start = page.getByRole("button", { name: "はじめる" });
  await expect(silent.or(start)).toBeVisible();
  await ((await silent.isVisible()) ? silent : start).click();
}

for (const lang of ["es", "fr"]) {
  test(`${lang}: フレーズ → 意味 → 再読み上げ の順に進む`, async ({ page }) => {
    await startStudy(page, lang);

    const phrase = page.locator("main p[lang]").first();
    const meaning = page.getByTestId("meaning");

    // (a) フレーズが表示されている。この時点で意味はまだ出ていない。
    await expect(phrase).toBeVisible();
    await expect(phrase).not.toBeEmpty();
    await expect(meaning).toHaveAttribute("data-visible", "false");

    // (b) しばらくすると意味が表示される
    await expect(meaning).toHaveAttribute("data-visible", "true", { timeout: 20_000 });
    await expect(meaning).toBeVisible();

    // (c) 再読み上げのあとも意味は残る（シーケンス完走後に消えない）
    await expect(meaning).toHaveAttribute("data-visible", "true", { timeout: 20_000 });
  });

  test(`${lang}: 単語をタップすると意味と活用が出る`, async ({ page }) => {
    await startStudy(page, lang);

    await page.getByRole("button", { name: "意味を見る" }).click();
    const meaning = page.getByTestId("meaning");
    await expect(meaning).toHaveAttribute("data-visible", "true");

    const entries = meaning.locator("li");
    expect(await entries.count()).toBeGreaterThan(0);
    await expect(entries.first()).toBeVisible();
  });

  test(`${lang}: 動詞に法・時制の色と人称アイコンが付く`, async ({ page }) => {
    await startStudy(page, lang);
    await page.getByRole("button", { name: "意味を見る" }).click();

    // フレーズ本文の活用語には色付きの下線が引かれている。
    const underlined = page.locator("main p[lang] [data-tense-underline]");
    expect(await underlined.count()).toBeGreaterThan(0);

    const decoration = await underlined
      .first()
      .evaluate((el) => getComputedStyle(el).textDecorationColor);
    // 既定の文字色（ほぼ黒）ではなく、時制の色が入っていること。
    expect(decoration).not.toBe("rgb(0, 0, 0)");

    // 人称アイコンは人称を持つ活用形にだけ付く。分詞や不定詞しか含まないフレーズも
    // あるので、出るまでカードを送って確かめる。
    for (let i = 0; i < 15; i += 1) {
      if (await page.locator("main p[lang] [aria-label$='人称単数'], main p[lang] [aria-label$='人称複数']").count()) {
        return;
      }
      await page.getByRole("button", { name: "覚えた" }).click();
      await page.getByRole("button", { name: "意味を見る" }).click();
    }
    throw new Error("15 枚めくっても人称アイコンの付いたフレーズが出なかった");
  });

  test(`${lang}: 設定画面で速度と色の凡例を出せる`, async ({ page }) => {
    await startStudy(page, lang);
    await page.getByRole("button", { name: "設定" }).click();

    await expect(page.getByRole("heading", { name: "設定" })).toBeVisible();
    await expect(page.getByText("色の意味（法と時制）")).toBeVisible();
    await expect(page.getByText("速さ")).toBeVisible();
    await expect(page.getByText("人称の表示")).toBeVisible();

    await page.getByRole("button", { name: "閉じる" }).click();
    await expect(page.getByRole("heading", { name: "設定" })).toBeHidden();
  });

  test(`${lang}: 活用ドリルが出題して答えを返す`, async ({ page }) => {
    await page.goto(`/drill/${lang}`);
    await expect(page.getByRole("button", { name: "答えを見る" })).toBeVisible();
    await page.getByRole("button", { name: "答えを見る" }).click();
    await expect(page.getByRole("button", { name: "正解した" })).toBeVisible();
  });

  test(`${lang}: ドリルを不規則活用だけに絞れる`, async ({ page }) => {
    await page.goto(`/drill/${lang}`);
    await page.getByText("出題範囲").click();
    await page.getByRole("checkbox").check();

    await page.getByRole("button", { name: "答えを見る" }).click();
    // 不規則だけに絞ったので、必ず不規則の説明が出る。
    await expect(page.locator("[data-irregular-mark]").first()).toBeVisible();
  });
}

test("es: 不規則活用の中身が表示される", async ({ page }) => {
  await startStudy(page, "es");

  // 不規則な語が出るまでカードを送る。◯ボタンで次へ。
  for (let i = 0; i < 12; i += 1) {
    await page.getByRole("button", { name: "意味を見る" }).click();
    const note = page.locator('[data-testid="meaning"] [data-irregular-mark]');
    if (await note.count()) {
      await expect(note.first()).toBeVisible();
      return;
    }
    await page.getByRole("button", { name: "覚えた" }).click();
  }
  throw new Error("12 枚めくっても不規則活用のフレーズが出なかった");
});

/**
 * 人称マークは語の真上に絶対配置しているため、箱の幅が語の幅から計算される。
 * whitespace-nowrap が無いと「3単」が2行に折り返し、短い語（es, fue, van など）の
 * 上では語に重なる。実際に本番でそうなったので、折り返していないことを見張る。
 */
test("人称マークが折り返して単語に重ならない", async ({ page }) => {
  await startStudy(page, "es");

  let seen = 0;
  for (let i = 0; i < 30; i += 1) {
    const marks = page.locator(
      "main p[lang] [aria-label$='人称単数'], main p[lang] [aria-label$='人称複数']",
    );
    for (let m = 0; m < (await marks.count()); m += 1) {
      const box = await marks.nth(m).boundingBox();
      const word = await marks.nth(m).textContent();
      // 1行なら 20px 前後。折り返すと倍近くになる。
      expect(box!.height, `人称マーク "${word}" が折り返している`).toBeLessThan(25);
      seen += 1;
    }
    await page.getByRole("button", { name: "覚えた" }).click();
  }
  expect(seen, "30 枚めくっても人称マークが1つも出なかった").toBeGreaterThan(0);
});

/**
 * フレーズ本文の語と、その語の説明カードは相互に飛べる。
 * 語をタップすると説明へ、説明をタップすると語へスクロールする。
 */
test("単語をタップすると説明へ、説明をタップすると単語へ飛ぶ", async ({ page }) => {
  await startStudy(page, "es");

  // まだ意味が出ていない段階で語をタップする。意味が開いて、その語の説明まで飛ぶ。
  const word = page.locator("main p[lang] button").first();
  const id = await word.getAttribute("id");
  expect(id).toMatch(/^word-\d+$/);
  const index = id!.split("-")[1];

  await word.click();
  await expect(page.getByTestId("meaning")).toHaveAttribute("data-visible", "true");

  const gloss = page.locator(`#gloss-${index}`);
  await expect(gloss).toBeInViewport();

  // 逆向き。説明カードをタップするとフレーズ本文の該当語まで戻る。
  await page.mouse.wheel(0, 600);
  await gloss.click();
  await expect(page.locator(`#word-${index}`)).toBeInViewport();
});

/**
 * 再生ボタンは停止＋頭出しではなく、その場で一時停止して続きから再開する。
 * 押しても読み上げ位置（phase）が巻き戻らないことで確かめる。
 */
test("再生ボタンが一時停止と再開になる", async ({ page }) => {
  await startStudy(page, "es");

  const button = page.getByRole("button", { name: "一時停止" });
  await expect(button).toBeVisible();

  await button.click();
  await expect(page.getByRole("button", { name: "再開" })).toBeVisible();

  // 一時停止しているあいだはシーケンスが進まない。
  const meaning = page.getByTestId("meaning");
  await expect(meaning).toHaveAttribute("data-visible", "false");
  await page.waitForTimeout(1500);
  await expect(meaning).toHaveAttribute("data-visible", "false");

  // 再開すると続きが流れ、意味の段階まで進む。
  await page.getByRole("button", { name: "再開" }).click();
  await expect(meaning).toHaveAttribute("data-visible", "true", { timeout: 20_000 });
});
