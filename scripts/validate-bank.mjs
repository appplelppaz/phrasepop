#!/usr/bin/env node
/**
 * 生成済みデータの検証。
 *
 *   node scripts/validate-bank.mjs
 *
 * build-phrases.mjs / build_spanish_verbs.py / build-verb-tables.mjs が正しく動いたかを、
 * **出力ファイルだけを見て** 独立に確かめる。ビルド側のロジックが壊れても、ここで気づける。
 *
 * 検査項目:
 *   1. フレーズの必須フィールドと id の一意性
 *   2. トークンの start / end が text の実際の位置と一致するか
 *   3. トークンが重なっていないか、順番に並んでいるか
 *   4. 活用ラベル付きトークンの表層形が活用表の該当セルと一致するか
 *   5. 活用表に空欄が無いか（命令法 1sg・非人称動詞・omit 指定を除く）
 *   6. スペイン語: 条件法の語幹 == 未来形の語幹
 *      （かつて使っていた spanish-verbs はここを間違えた。再発検知のために残してある）
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LANGS = ["es", "fr"];
const PERSON_INDEX = { "1sg": 0, "2sg": 1, "3sg": 2, "1pl": 3, "2pl": 4, "3pl": 5 };
const LEVELS = new Set(["A1", "A2", "B1", "B2"]);

const errors = [];
const fail = (msg) => errors.push(msg);
const norm = (s) => s.toLocaleLowerCase().normalize("NFC").trim();

const read = (lang, file) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, "data", lang, file), "utf8"));

/* ------------------------------------------------------------- 活用表の検査 */

function checkVerbTable(lang, table) {
  const tenseKeys = Object.keys(table.tenseLabels);
  if (tenseKeys.length === 0) fail(`${lang}/verbs.json: tenseLabels が空`);

  const seen = new Set();
  for (const verb of table.verbs) {
    if (seen.has(verb.lemma)) fail(`${lang}/verbs.json: 見出し語 "${verb.lemma}" が重複`);
    seen.add(verb.lemma);
    if (!verb.ja) fail(`${lang}/verbs.json: ${verb.lemma} に ja が無い`);

    for (const key of tenseKeys) {
      if (verb.omit?.includes(key)) continue;
      const row = verb.forms[key];
      if (!row || !row.some((f) => f)) {
        fail(`${lang}/verbs.json: ${verb.lemma} / ${key} が空`);
        continue;
      }
      if (row.length === 1) continue; // 分詞など人称を持たない形

      // 命令法に存在する人称は言語によって違う。
      //   スペイン語 IMP  … tú / usted / nosotros / vosotros / ustedes（1sg が無い）
      //   フランス語 IMPER … tu / nous / vous のみ
      // 非人称動詞は 3人称単数だけが埋まっていればよい。
      const requiredIdx = verb.impersonal
        ? [2]
        : key === "IMP"
          ? [1, 2, 3, 4, 5]
          : key === "IMPER"
            ? [1, 3, 4]
            : [0, 1, 2, 3, 4, 5];

      if (requiredIdx.some((i) => !row[i])) {
        fail(`${lang}/verbs.json: ${verb.lemma} / ${key} に空の人称 (${row.join("|")})`);
      }
    }
  }
}

/**
 * スペイン語の条件法は必ず未来形と同じ語幹をとる。
 * 未来形 1sg から é を落とした語幹に ía を付けたものが条件法 1sg になるはず。
 */
function checkSpanishConditional(table) {
  for (const verb of table.verbs) {
    const fut = verb.forms.IND_FUT;
    const cond = verb.forms.COND;
    if (!fut || !cond) continue;

    const idx = verb.impersonal ? 2 : 0;
    const futForm = fut[idx];
    const condForm = cond[idx];
    if (!futForm || !condForm) continue;

    // 未来形 3sg は "-á"、1sg は "-é" で終わる。どちらも 1 文字落とせば語幹になる。
    const stem = futForm.slice(0, -1);
    if (!condForm.startsWith(stem)) {
      fail(
        `es/verbs.json: ${verb.lemma} の条件法の語幹が未来形と違う ` +
          `(未来 "${futForm}" / 条件法 "${condForm}")`,
      );
    }
  }
}

/* --------------------------------------------------------- フレーズバンクの検査 */

function checkBank(lang, bank, table) {
  const verbByLemma = new Map(table.verbs.map((v) => [v.lemma, v]));
  const seen = new Set();

  for (const p of bank.phrases) {
    const where = `${lang}/phrases.json ${p.id}`;

    if (!p.id || !p.text || !p.ja) fail(`${where}: id / text / ja のいずれかが空`);
    if (seen.has(p.id)) fail(`${where}: id が重複`);
    seen.add(p.id);
    if (p.lang !== lang) fail(`${where}: lang が "${p.lang}" になっている`);
    if (!LEVELS.has(p.level)) fail(`${where}: 不正な level "${p.level}"`);
    if (!Array.isArray(p.tokens) || p.tokens.length === 0) fail(`${where}: tokens が空`);

    let prevEnd = -1;
    for (const token of p.tokens ?? []) {
      // 2. オフセットが実際の文字列と一致するか
      const slice = p.text.slice(token.start, token.end);
      if (slice !== token.surface) {
        fail(`${where}: オフセットずれ。[${token.start},${token.end}) は "${slice}" だが surface は "${token.surface}"`);
      }
      // 3. 重なりと順序
      if (token.start < prevEnd) {
        fail(`${where}: トークン "${token.surface}" が前のトークンと重なっている`);
      }
      prevEnd = token.end;

      const gloss = token.gloss;
      if (!gloss) continue;
      if (!gloss.lemma || !gloss.pos || !gloss.ja) {
        fail(`${where}: "${token.surface}" の gloss に lemma / pos / ja が揃っていない`);
      }

      // 4. 活用ラベルと活用表の突き合わせ
      const infl = gloss.inflection;
      if (!infl?.tense) continue; // 手書きラベルのみのものは照合対象外

      const verb = verbByLemma.get(gloss.lemma);
      if (!verb) {
        fail(`${where}: "${gloss.lemma}" が活用表に無いのに時制キーが付いている`);
        continue;
      }
      const row = verb.forms[infl.tense];
      if (!row) {
        fail(`${where}: ${gloss.lemma} に時制 "${infl.tense}" が無い`);
        continue;
      }
      const expected = infl.person ? row[PERSON_INDEX[infl.person]] : row[0];
      if (!expected) {
        fail(`${where}: ${gloss.lemma} / ${infl.tense} / ${infl.person ?? "-"} が空`);
        continue;
      }
      // 複合時制は助動詞を含むので、末尾の語（分詞）との一致も許す。
      const candidates = [expected, expected.split(" ").slice(-1)[0]];
      if (!candidates.some((c) => norm(c) === norm(token.surface))) {
        fail(
          `${where}: 活用不一致。"${token.surface}" に ${infl.label} が付いているが ` +
            `${gloss.lemma} / ${infl.tense} / ${infl.person ?? "-"} は "${expected}"`,
        );
      }

      // ラベルが時制名と食い違っていないか
      const tenseLabel = table.tenseLabels[infl.tense];
      if (tenseLabel && !infl.label.startsWith(tenseLabel)) {
        fail(`${where}: ラベル "${infl.label}" が時制 ${infl.tense} (${tenseLabel}) と一致しない`);
      }
    }
  }
}

/* ----------------------------------------------------------------------- main */

let phraseCount = 0;
let verbCount = 0;

for (const lang of LANGS) {
  const table = read(lang, "verbs.json");
  const bank = read(lang, "phrases.json");

  checkVerbTable(lang, table);
  if (lang === "es") checkSpanishConditional(table);
  checkBank(lang, bank, table);

  phraseCount += bank.phrases.length;
  verbCount += table.verbs.length;
}

if (errors.length) {
  console.error(`検証に失敗しました (${errors.length} 件):\n  ` + errors.join("\n  "));
  process.exit(1);
}

console.log(`検証 OK — フレーズ ${phraseCount} 件 / 動詞 ${verbCount} 語 (${LANGS.join(", ")})`);
