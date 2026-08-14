#!/usr/bin/env node
/**
 * フレーズバンクのビルド。
 *
 *   node scripts/build-phrases.mjs
 *
 * data/{lang}/phrases.src.json（手書き）から data/{lang}/phrases.json（アプリが読む）を作る。
 *
 * このスクリプトが担保していること:
 *
 * 1. トークンの文字オフセットを text から自動計算する。手書きしないのでズレが起きない。
 * 2. 活用ラベル（「接続法現在・3人称単数」など）を verbs.json から生成する。
 *    手書きするのは "SUBJ_PRES/3sg" のようなキーだけなので、ラベルの書き間違いが起きない。
 * 3. **表層形が活用表の実際の形と一致するか照合する。** 例えば llueva に SUBJ_PRES/3sg と
 *    書いたとき、活用表の llover / SUBJ_PRES / 3sg が "llueva" でなければビルドを落とす。
 *    これにより「フレーズ中の動詞形」と「表示される活用ラベル」の食い違いが原理的に起きない。
 *
 * 手書き側（phrases.src.json）のトークン形式:
 *   { "s": "llueva", "lemma": "llover", "pos": "動詞", "ja": "雨が降る", "infl": "SUBJ_PRES/3sg" }
 *   { "s": "no", "skip": true }                        機能語（意味カードを出さない）
 *   { "s": "ojalá que", "lemma": "...", "idiom": true } 熟語・成語（複数語にまたがる）
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeTense } from "./lib/irregularity.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LANGS = ["es", "fr"];

const PERSON_LABEL = {
  "1sg": "1人称単数",
  "2sg": "2人称単数",
  "3sg": "3人称単数",
  "1pl": "1人称複数",
  "2pl": "2人称複数",
  "3pl": "3人称複数",
};
const PERSON_INDEX = { "1sg": 0, "2sg": 1, "3sg": 2, "1pl": 3, "2pl": 4, "3pl": 5 };

/** 比較用の正規化。文頭の大文字や前後の記号を無視する。 */
const norm = (s) => s.toLocaleLowerCase().normalize("NFC").trim();

function build(lang, errors) {
  // 原本は phrases.src.json / phrases.src.2.json … と分割してよい。
  // 1 ファイルが大きくなりすぎないよう、追加ぶんは新しい番号のファイルに書く。
  const dir = path.join(ROOT, "data", lang);
  const srcFiles = fs
    .readdirSync(dir)
    .filter((f) => /^phrases\.src(\.\d+)?\.json$/.test(f))
    .sort((a, b) => a.length - b.length || a.localeCompare(b));

  if (srcFiles.length === 0) {
    errors.push(`${lang}: data/${lang}/phrases.src*.json が無い`);
    return null;
  }

  const src = { phrases: [] };
  for (const f of srcFiles) {
    const part = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    src.phrases.push(...(part.phrases ?? []));
  }
  const table = JSON.parse(fs.readFileSync(path.join(ROOT, "data", lang, "verbs.json"), "utf8"));
  const verbByLemma = new Map(table.verbs.map((v) => [v.lemma, v]));

  const seenIds = new Set();
  const phrases = [];

  for (const p of src.phrases) {
    const where = `${lang} / ${p.id ?? "(id なし)"}`;

    if (!p.id || !p.text || !p.ja || !p.level) {
      errors.push(`${where}: id / text / ja / level は必須`);
      continue;
    }
    if (seenIds.has(p.id)) {
      errors.push(`${where}: id が重複している`);
      continue;
    }
    seenIds.add(p.id);

    // --- トークンのオフセットを text から順に探す --------------------------
    let cursor = 0;
    const tokens = [];

    for (const t of p.tokens ?? []) {
      const start = p.text.toLocaleLowerCase().indexOf(t.s.toLocaleLowerCase(), cursor);
      if (start < 0) {
        errors.push(`${where}: 表層形 "${t.s}" が text の ${cursor} 文字目以降に見つからない`);
        continue;
      }
      const end = start + t.s.length;
      cursor = end;

      // 機能語は gloss を持たせない（ハイライトのためにトークンとしては残す）。
      if (t.skip) {
        tokens.push({ surface: p.text.slice(start, end), start, end });
        continue;
      }

      if (!t.lemma || !t.ja || !t.pos) {
        errors.push(`${where}: "${t.s}" に lemma / pos / ja が要る（機能語なら skip: true）`);
        continue;
      }

      const gloss = { lemma: t.lemma, pos: t.pos, ja: t.ja };
      if (t.idiom) gloss.idiom = true;
      if (t.note) gloss.note = t.note;
      if (t.reading) gloss.reading = t.reading;

      // --- 活用ラベルを活用表から生成し、表層形と突き合わせる ---------------
      if (t.infl) {
        const [tense, person] = t.infl.split("/");
        const tenseLabel = table.tenseLabels[tense];
        const verb = verbByLemma.get(t.lemma);

        if (!tenseLabel) {
          errors.push(`${where}: 未知の時制キー "${tense}" ("${t.s}")`);
        } else if (!verb) {
          errors.push(
            `${where}: "${t.lemma}" が活用表に無い。scripts/verb-lists/${lang}.json に足して活用表を作り直す`,
          );
        } else {
          const row = verb.forms[tense];
          if (!row) {
            errors.push(`${where}: ${t.lemma} に時制 "${tense}" が無い`);
          } else if (person) {
            const idx = PERSON_INDEX[person];
            if (idx === undefined) {
              errors.push(`${where}: 未知の人称 "${person}" ("${t.s}")`);
            } else {
              const expected = row[idx];
              // 複合時制は "he hablado" のように助動詞を含むので、表層形が単語 1 つのときは
              // 末尾の語（分詞）と照合する。
              const candidates = [expected, expected.split(" ").slice(-1)[0]];
              if (!candidates.some((c) => norm(c) === norm(t.s))) {
                errors.push(
                  `${where}: 活用が一致しない。"${t.s}" と書かれているが ` +
                    `${t.lemma} / ${tense} / ${person} は "${expected}"`,
                );
              } else {
                gloss.inflection = {
                  label: `${tenseLabel}・${PERSON_LABEL[person]}`,
                  tense,
                  person,
                };
                // 不規則活用なら、その人称に限った説明を添える。
                // 「本来の規則形」との差分から自動生成されるので手書きの誤りが入らない。
                const analysis = analyzeTense(lang, t.lemma, tense, row, verb.forms);
                const detail = analysis?.perPerson?.[idx];
                if (detail) {
                  gloss.inflection.irregular = {
                    code: detail.code,
                    text: detail.text,
                    ...(detail.regular ? { regular: detail.regular } : {}),
                  };
                }
              }
            }
          } else {
            // 分詞など人称を持たない形。
            const expected = row[0];
            if (norm(expected) !== norm(t.s)) {
              errors.push(
                `${where}: 活用が一致しない。"${t.s}" と書かれているが ${t.lemma} / ${tense} は "${expected}"`,
              );
            } else {
              gloss.inflection = { label: tenseLabel, tense };
              const analysis = analyzeTense(lang, t.lemma, tense, row, verb.forms);
              const detail = analysis?.perPerson?.[0];
              if (detail) {
                gloss.inflection.irregular = {
                  code: detail.code,
                  text: detail.text,
                  ...(detail.regular ? { regular: detail.regular } : {}),
                };
              }
            }
          }
        }
      } else if (t.label) {
        // 活用表を持たない品詞（形容詞の性数変化など）は手書きラベルを許す。
        gloss.inflection = { label: t.label };
      }

      tokens.push({ surface: p.text.slice(start, end), start, end, gloss });
    }

    phrases.push({
      id: p.id,
      lang,
      text: p.text,
      ja: p.ja,
      level: p.level,
      tags: p.tags ?? [],
      tokens,
      ...(p.grammar ? { grammar: p.grammar } : {}),
      ...(p.reading ? { reading: p.reading } : {}),
    });
  }

  return { lang, phrases };
}

const errors = [];
const built = LANGS.map((lang) => [lang, build(lang, errors)]);

if (errors.length) {
  console.error(`フレーズバンクのビルドに失敗しました (${errors.length} 件):\n  ` + errors.join("\n  "));
  process.exit(1);
}

for (const [lang, bank] of built) {
  const out = path.join(ROOT, "data", lang, "phrases.json");
  fs.writeFileSync(out, JSON.stringify(bank, null, 2) + "\n", "utf8");
  const glossed = bank.phrases.reduce((n, p) => n + p.tokens.filter((t) => t.gloss).length, 0);
  const inflected = bank.phrases.reduce(
    (n, p) => n + p.tokens.filter((t) => t.gloss?.inflection).length,
    0,
  );
  console.log(
    `${lang}: ${bank.phrases.length} フレーズ / 語義 ${glossed} 件 / 活用ラベル ${inflected} 件 ` +
      `-> data/${lang}/phrases.json`,
  );
}
