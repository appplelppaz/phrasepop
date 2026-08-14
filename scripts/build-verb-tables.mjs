#!/usr/bin/env node
/**
 * フランス語の活用表を事前計算する。
 *
 *   node scripts/build-verb-tables.mjs
 *
 * french-verbs-lefff は 6.3MB あるためブラウザには送らない。ここで高頻度動詞ぶんだけ
 * 展開し、コンパクトな JSON（data/fr/verbs.json）にして同梱する。
 *
 * Lefff は実在の語彙辞書で、監査では複合過去の être + 性数一致（"est allée"）まで含めて
 * 誤りが無かったため、フランス語はこの経路を使う。
 * スペイン語は npm の spanish-verbs が不規則動詞で誤った活用を大量に生成したため、
 * verbecc を使う別スクリプト（scripts/build_spanish_verbs.py）に分離してある。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const FrenchVerbs = require("french-verbs");
const Lefff = require("french-verbs-lefff/dist/conjugations.json");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PERSONS = ["1sg", "2sg", "3sg", "1pl", "2pl", "3pl"];

const FR_VERBS = JSON.parse(
  fs.readFileSync(path.join(ROOT, "scripts", "verb-lists", "fr.json"), "utf8"),
).verbs;

/** 出力する時制キー -> french-verbs の時制名と日本語ラベル。 */
const FR_TENSES = {
  PRES: { label: "直説法現在", lib: "PRESENT" },
  IMPF: { label: "半過去", lib: "IMPARFAIT" },
  FUT: { label: "単純未来", lib: "FUTUR" },
  PC: { label: "複合過去", lib: "PASSE_COMPOSE" },
  PQP: { label: "大過去", lib: "PLUS_QUE_PARFAIT" },
  PS: { label: "単純過去", lib: "PASSE_SIMPLE" },
  COND: { label: "条件法現在", lib: "CONDITIONNEL_PRESENT" },
  SUBJ: { label: "接続法現在", lib: "SUBJONCTIF_PRESENT" },
  IMPER: { label: "命令法", lib: "IMPERATIF_PRESENT" },
  PPRES: { label: "現在分詞", lib: "PARTICIPE_PRESENT", noPerson: true },
  PPASSE: { label: "過去分詞", lib: "PARTICIPE_PASSE", noPerson: true },
};

function buildFrench() {
  const verbs = [];

  for (const { lemma, ja, aux, impersonal, omit } of FR_VERBS) {
    const auxOpt = { aux: aux ?? (FrenchVerbs.alwaysAuxEtre(lemma) ? "ETRE" : "AVOIR") };
    const forms = {};

    for (const [key, cfg] of Object.entries(FR_TENSES)) {
      if (omit?.includes(key)) continue; // その動詞には存在しない形

      const row = PERSONS.map((_, p) => {
        try {
          // 過去分詞が主語に性数一致するのは助動詞が être のときだけ
          // （nous sommes allés / nous avons mangé）。
          // avoir の複合時制で数を渡すと "avons mangés" のような誤りになる。
          const opts =
            auxOpt.aux === "ETRE"
              ? { ...auxOpt, agreeGender: "M", agreeNumber: p >= 3 ? "P" : "S" }
              : auxOpt;
          return FrenchVerbs.getConjugation(Lefff, lemma, cfg.lib, p, opts, null, null) ?? "";
        } catch {
          // 命令法は 2sg / 1pl / 2pl しか存在しないため、他の人称は空欄で正しい。
          return "";
        }
      });

      if (row.every((f) => !f)) continue; // overrides.json での補完に委ねる
      // 分詞は人称を持たないので 1 要素に畳む。
      if (cfg.noPerson) forms[key] = [row.find((f) => f) ?? ""];
      else forms[key] = impersonal ? ["", "", row[2], "", "", ""] : row;
    }

    verbs.push({
      lemma,
      ja,
      aux: auxOpt.aux,
      ...(impersonal ? { impersonal: true } : {}),
      ...(omit ? { omit } : {}),
      forms,
    });
  }

  return {
    lang: "fr",
    tenseLabels: Object.fromEntries(Object.entries(FR_TENSES).map(([k, v]) => [k, v.label])),
    verbs,
  };
}

/**
 * ライブラリが生成できなかった／誤って生成した箇所を手書きで補う。
 * data/fr/overrides.json の形式:
 *   { "<lemma>": { "<tenseKey>": ["1sg","2sg","3sg","1pl","2pl","3pl"] } }
 * 一部の人称だけ直したい場合は null を置くとその人称は元のまま残る。
 */
function applyOverrides(table, lang) {
  const file = path.join(ROOT, "data", lang, "overrides.json");
  if (!fs.existsSync(file)) return 0;

  const overrides = JSON.parse(fs.readFileSync(file, "utf8"));
  const tenseKeys = Object.keys(table.tenseLabels);
  let applied = 0;

  for (const [lemma, tenses] of Object.entries(overrides)) {
    if (lemma.startsWith("_")) continue; // _comment などのメモ
    const verb = table.verbs.find((v) => v.lemma === lemma);
    if (!verb) {
      console.error(`overrides.json (${lang}): 動詞リストに無い見出し語 "${lemma}"`);
      process.exit(1);
    }
    for (const [tense, row] of Object.entries(tenses)) {
      if (!tenseKeys.includes(tense)) {
        console.error(`overrides.json (${lang}): 未知の時制キー "${tense}" (${lemma})`);
        process.exit(1);
      }
      const orig = verb.forms[tense];
      verb.forms[tense] = orig ? orig.map((o, i) => (row[i] == null ? o : row[i])) : row.map((f) => f ?? "");
      applied += 1;
    }
  }
  return applied;
}

/** 全動詞・全時制が埋まっているか検査する。埋まっていなければビルドを落とす。 */
function assertComplete(table) {
  const tenseKeys = Object.keys(table.tenseLabels);
  const missing = [];

  for (const verb of table.verbs) {
    for (const key of tenseKeys) {
      if (verb.omit?.includes(key)) continue; // pouvoir の命令法など、存在しない形
      const row = verb.forms[key];
      if (!row || row.every((f) => !f)) {
        missing.push(`${verb.lemma} / ${key}`);
        continue;
      }
      // 命令法は 1人称単数が存在せず、非人称動詞は 3人称単数だけ。それ以外の空欄は異常。
      if (key !== "IMPER" && !verb.impersonal && row.length === 6 && row.some((f) => !f)) {
        missing.push(`${verb.lemma} / ${key}: 空の人称あり (${row.join("|")})`);
      }
    }
  }

  if (missing.length) {
    console.error(
      `${table.lang}: 活用表に欠落があります。data/${table.lang}/overrides.json に手書きで補ってください:\n  ` +
        missing.join("\n  "),
    );
    process.exit(1);
  }
}

const table = buildFrench();
const applied = applyOverrides(table, "fr");
assertComplete(table);

const dir = path.join(ROOT, "data", "fr");
fs.mkdirSync(dir, { recursive: true });
const out = path.join(dir, "verbs.json");
fs.writeFileSync(out, JSON.stringify(table, null, 2) + "\n", "utf8");
const kb = (fs.statSync(out).size / 1024).toFixed(0);
console.log(
  `fr: ${table.verbs.length} 語 × ${Object.keys(table.tenseLabels).length} 時制` +
    `${applied ? ` (overrides ${applied} 件適用)` : ""} -> data/fr/verbs.json (${kb} KB)`,
);
