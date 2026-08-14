#!/usr/bin/env node
/**
 * 活用表に不規則活用の判定を書き足す。
 *
 *   node scripts/add-irregularity.mjs
 *
 * data/{lang}/verbs.json を読み、各 (動詞, 時制) について「本来の規則形」と比べた結果を
 * verb.irr[時制] に足して書き戻す。活用ドリルがこれを読んで不規則の中身を表示する。
 * 生成物なので、活用表を作り直したら必ずこれも流し直す（npm run build:verbs に含めてある）。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeTense } from "./lib/irregularity.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

for (const lang of ["es", "fr"]) {
  const file = path.join(ROOT, "data", lang, "verbs.json");
  const table = JSON.parse(fs.readFileSync(file, "utf8"));
  const tenses = Object.keys(table.tenseLabels);

  let irregularTenses = 0;

  for (const verb of table.verbs) {
    const irr = {};
    for (const tense of tenses) {
      const forms = verb.forms[tense];
      if (!forms) continue;

      const analysis = analyzeTense(lang, verb.lemma, tense, forms, verb.forms);
      if (!analysis) continue; // 規則形を定義できない時制（複合時制など）
      if (!analysis.codes.includes("S") && !analysis.codes.includes("E") &&
          !analysis.codes.includes("B") && !analysis.codes.includes("I")) {
        continue; // 完全に規則的なら何も書かない（ファイルを膨らませない）
      }

      // 同じ説明文が 4〜6 人称ぶん繰り返されるので、重複を畳んで持つ。
      // texts に実体を置き、idx が人称ごとにその添字を指す（規則的な人称は null）。
      const texts = [];
      const idx = analysis.perPerson.map((p) => {
        if (!p) return null;
        let i = texts.indexOf(p.text);
        if (i < 0) i = texts.push(p.text) - 1;
        return i;
      });

      irr[tense] = { codes: analysis.codes, summary: analysis.summary, texts, idx };
      irregularTenses += 1;
    }
    if (Object.keys(irr).length) verb.irr = irr;
  }

  fs.writeFileSync(file, JSON.stringify(table, null, 2) + "\n", "utf8");
  const kb = (fs.statSync(file).size / 1024).toFixed(0);
  console.log(`${lang}: 不規則な (動詞×時制) ${irregularTenses} 件を記録 -> data/${lang}/verbs.json (${kb} KB)`);
}
